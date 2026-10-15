import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import worker from "../worker/index.js";

for (const migrated of [false, true]) {
  test(`old orders remain visible and deletion preserves records with migration 0011 ${migrated ? "applied" : "missing"}`, async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      for (const name of ["0001_initial.sql", "0005_gold_cancellations.sql", "0008_order_payment_deadline.sql", ...(migrated ? ["0011_admin_order_deletion.sql"] : [])]) {
        sqlite.exec(await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
      }
      const insert = sqlite.prepare("INSERT INTO orders (code, username, contact, plan_id, plan_name, platform, subtotal, amount, status, expires_at) VALUES (?, 'alice', 'contact', 'ios-year', 'Year', 'iOS', 79000, 79000, ?, ?)");
      insert.run("LGOLDPAID", "completed", "2026-01-01T00:00:00Z");
      insert.run("LGEXPIRED", "pending", "2026-01-01T00:00:00Z");
      insert.run("LGOLDPENDING", "pending", "2099-01-01T00:00:00Z");
      const env = { SESSION_SECRET: "schema-regression-test-secret", ADMIN_PASSWORD_SHA256: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", DB: {
        prepare(sql) {
          let args = [];
          return {
            bind(...values) { args = values; return this; },
            async all() { return { results: sqlite.prepare(sql).all(...args) }; },
            async first() { return sqlite.prepare(sql).get(...args) || null; },
            async run() { const result = sqlite.prepare(sql).run(...args); return { meta: { changes: Number(result.changes) } }; },
          };
        },
      } };
      const site = "https://locketgold.info";
      const login = await worker.fetch(new Request(`${site}/api/admin/login`, {
        method: "POST", headers: { Origin: site, "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin" }),
      }), env, {});
      assert.equal(login.status, 200);
      const cookie = login.headers.get("Set-Cookie").split(";")[0];
      const call = (path = "", method = "GET") => worker.fetch(new Request(`${site}/api/admin/orders${path}`, { method, headers: { Cookie: cookie, Origin: site } }), env, {});
      const overview = async () => {
        const response = await worker.fetch(new Request(`${site}/api/admin/overview`, { headers: { Cookie: cookie } }), env, {});
        assert.equal(response.status, 200);
        return response.json();
      };
      const list = await call();
      assert.equal(list.status, 200);
      assert.deepEqual((await list.json()).orders.map((order) => order.code).sort(), ["LGOLDPAID", "LGOLDPENDING"]);
      assert.equal((await overview()).orders, 2);
      assert.equal((await overview()).paid_orders, 1);
      assert.equal((await call("/LGOLDPAID", "DELETE")).status, 200);
      assert.equal((await call("/LGOLDPAID", "DELETE")).status, 404);
      assert.equal((await call("/MISSING", "DELETE")).status, 404);
      assert.deepEqual((await (await call()).json()).orders.map((order) => order.code), ["LGOLDPENDING"]);
      assert.equal((await overview()).orders, 1);
      assert.equal((await overview()).paid_orders, 0);
      const original = sqlite.prepare("SELECT status, amount FROM orders WHERE code = 'LGOLDPAID'").get();
      assert.equal(original.status, "completed");
      assert.equal(original.amount, 79000);
      assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM orders").get().count, 3);
      // A later migration must not resurrect orders hidden by the compatibility path.
      if (!migrated) {
        sqlite.exec(await readFile(new URL("../migrations/0011_admin_order_deletion.sql", import.meta.url), "utf8"));
        assert.deepEqual((await (await call()).json()).orders.map((order) => order.code), ["LGOLDPENDING"]);
        assert.equal((await overview()).orders, 1);
      }
      for (let index = 0; index < 105; index++) insert.run(`LGNEW${index}`, "paid", "2026-01-01T00:00:00Z");
      assert.equal((await (await call()).json()).orders.length, 100);
      assert.equal((await overview()).orders, 106);
      assert.equal((await overview()).paid_orders, 105);
    } finally { sqlite.close(); }
  });
}
