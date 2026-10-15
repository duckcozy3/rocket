import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFile, readdir } from "node:fs/promises";
import worker from "../worker/index.js";

test("local CTV management creates protected accounts, sets individual prices, debits wallets and aggregates sales", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    const directory = new URL("../migrations/", import.meta.url);
    for (const file of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) sqlite.exec(await readFile(new URL(file, directory), "utf8"));
    const env = { NODNS_CTV_PORTAL: "false", SESSION_SECRET: "ctv-local-management-secret", ADMIN_PASSWORD_SHA256: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", DB: {
      prepare(sql) {
        let values = [];
        return {
          bind(...args) { values = args; return this; },
          async first() { return sqlite.prepare(sql).get(...values) || null; },
          async all() { return { results: sqlite.prepare(sql).all(...values) }; },
          async run() { const result = sqlite.prepare(sql).run(...values); return { meta: { changes: Number(result.changes) } }; },
        };
      },
      async batch(statements) {
        sqlite.exec("BEGIN");
        try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; }
        catch (error) { sqlite.exec("ROLLBACK"); throw error; }
      },
    } };
    const site = "https://locketgold.info";
    const tasks = [];
    const call = (path, cookie = "", body, origin = site) => worker.fetch(new Request(site + path, {
      method: body === undefined ? "GET" : "POST", headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env, { waitUntil(task) { tasks.push(task); } });
    const login = await call("/api/admin/login", "", { username: "admin", password: "admin" });
    const admin = login.headers.get("Set-Cookie").split(";")[0];
    assert.equal((await call("/api/admin/ctv")).status, 401);
    const alice = { username: "alice", password: "password-for-alice", initial_balance: 100000, prices: { "ios-month": 15000 } };
    assert.equal((await call("/api/admin/ctv", admin, alice, "https://other.example")).status, 403);
    assert.equal((await call("/api/admin/ctv", admin, { ...alice, prices: { "ios-month": -1 } })).status, 400);
    assert.equal((await call("/api/admin/ctv", admin, alice)).status, 201);
    assert.equal((await call("/api/admin/ctv", admin, alice)).status, 409);
    assert.equal((await call("/api/admin/ctv", admin, { username: "bob", password: "password-for-bob", initial_balance: 50000, prices: {} })).status, 201);
    const list = await (await call("/api/admin/ctv", admin)).json();
    assert.deepEqual(list.stats, { count: 2, sold_orders: 0, balance: 150000 });
    assert.equal(list.ctv[0].prices["ios-month"], 15000);
    assert.ok(!JSON.stringify(list).includes("password"));
    const saved = sqlite.prepare("SELECT password_hash FROM ctv_users WHERE username = 'alice'").get();
    assert.notEqual(saved.password_hash, alice.password);
    const ctvLogin = await call("/api/ctv/login", "", { username: "alice", password: alice.password });
    assert.equal(ctvLogin.status, 200);
    const ctv = ctvLogin.headers.get("Set-Cookie").split(";")[0];
    const account = (await ctvLogin.json()).user;
    assert.equal(account.plans.find((plan) => plan.id === "ios-month").price, 15000);
    assert.equal((await call("/api/admin/ctv", ctv)).status, 401);
    assert.equal((await call("/api/ctv/orders", ctv, { username: "customer", plan_id: "ios-month", price: 1 })).status, 201);
    await Promise.all(tasks.splice(0));
    assert.equal(sqlite.prepare("SELECT balance FROM ctv_users WHERE username = 'alice'").get().balance, 85000);
    assert.equal(sqlite.prepare("SELECT amount FROM orders").get().amount, 15000);
    const afterSale = await (await call("/api/admin/ctv", admin)).json();
    assert.deepEqual(afterSale.stats, { count: 2, sold_orders: 1, balance: 135000 });
    const aliceId = list.ctv[0].id;
    assert.equal((await call("/api/admin/ctv/prices", admin, { id: aliceId, prices: { "ios-month": 90000, "ios-year": "" } })).status, 200);
    assert.equal((await call("/api/ctv/orders", ctv, { username: "customer", plan_id: "ios-month" })).status, 400);
    assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM orders").get().count, 1);
    assert.equal((await call("/api/admin/ctv/balance", admin, { username: "alice", delta: -90000 })).status, 404);
    assert.equal((await call("/api/admin/ctv/balance", admin, { username: "alice", delta: 10000 })).status, 200);
    assert.equal((await call("/api/admin/ctv/prices", admin, { id: aliceId, prices: { "ios-month": 0 } })).status, 200);
    assert.equal((await call("/api/ctv/orders", ctv, { username: "customer", plan_id: "ios-month" })).status, 201);
    await Promise.all(tasks.splice(0));
    assert.equal(sqlite.prepare("SELECT balance FROM ctv_users WHERE username = 'alice'").get().balance, 95000);
    assert.equal(sqlite.prepare("SELECT amount FROM orders ORDER BY id DESC LIMIT 1").get().amount, 0);
    assert.equal(sqlite.prepare("SELECT amount FROM orders ORDER BY id LIMIT 1").get().amount, 15000);
    assert.equal((await call("/api/admin/ctv/prices", admin, { id: 999, prices: {} })).status, 404);
  } finally { sqlite.close(); }
});
