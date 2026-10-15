import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import worker from "../worker/index.js";
import { createCtvTopup, readCtvTopup } from "../worker/ctv-topups.js";
import { paymentQrUrl } from "../src/payment.js";

test("SePay CTV deposits credit the right wallet once, reject mismatches and roll back failed credits", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const name of ["0001_initial.sql", "0004_sepay_event_status.sql"]) sqlite.exec(await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
    sqlite.exec("INSERT INTO ctv_users (username,password_hash,password_salt,balance) VALUES ('alice','hash','salt',0),('bob','hash','salt',0)");
    let failCredit = false;
    const env = { BANK_ACCOUNT: "5565662518", SEPAY_WEBHOOK_API_KEY: "topup-test-key", DB: {
      prepare(sql) { let args = []; return {
        bind(...values) { args = values; return this; },
        async first() { return sqlite.prepare(sql).get(...args) || null; },
        async run() { if (failCredit && sql.startsWith("UPDATE ctv_users")) throw Error("Simulated write failure"); const result = sqlite.prepare(sql).run(...args); return { meta: { changes: Number(result.changes) } }; },
      }; },
      async batch(statements) {
        sqlite.exec("BEGIN");
        try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; }
        catch (error) { sqlite.exec("ROLLBACK"); throw error; }
      },
    } };
    const bank = { bank_name: "MB Bank", bank_bin: "970422", bank_account: env.BANK_ACCOUNT, account_name: "Test Account" };
    const quote = await createCtvTopup(env, 1, 50000, 10000, bank);
    assert.equal(quote.credits, 5);
    assert.equal((await createCtvTopup(env, 1, 50000, 10000, bank)).code, quote.code);
    assert.match(paymentQrUrl(quote), /acc=5565662518/);
    await assert.rejects(readCtvTopup(env, 2, quote.code, bank), { status: 404 });
    await assert.rejects(createCtvTopup(env, 1, 15000, 10000, bank), { status: 400 });
    const call = (id, changes = {}, auth = "Apikey topup-test-key") => worker.fetch(new Request("https://locketgold.info/api/sepay/webhook", {
      method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id, transferType: "in", accountNumber: env.BANK_ACCOUNT, transferAmount: 50000, content: quote.code, ...changes }),
    }), env, {});
    const balance = (id = 1) => sqlite.prepare("SELECT balance FROM ctv_users WHERE id = ?").get(id).balance;
    assert.equal((await call("unauthorized", {}, "Apikey wrong")).status, 401);
    assert.equal((await call("wrong-bank", { accountNumber: "1234567890" })).status, 200);
    assert.equal((await call("outgoing", { transferType: "out" })).status, 200);
    assert.equal((await call("short", { transferAmount: 10000 })).status, 200);
    assert.equal((await call("overpaid", { transferAmount: 60000 })).status, 200);
    assert.equal(balance(), 0);
    failCredit = true;
    assert.equal((await call("retry-after-failure")).status, 500);
    assert.equal((await readCtvTopup(env, 1, quote.code, bank)).status, "pending");
    failCredit = false;
    assert.equal((await call("retry-after-failure")).status, 200);
    assert.equal(balance(), 50000);
    assert.equal(balance(2), 0);
    assert.equal((await call("retry-after-failure")).status, 200);
    assert.equal((await call("second-transfer-same-code")).status, 200);
    assert.equal(balance(), 50000);
    const bob = await createCtvTopup(env, 2, 50000, 10000, bank);
    assert.equal((await call("retry-after-failure", { content: bob.code })).status, 200);
    assert.equal(balance(2), 0);
    assert.equal((await readCtvTopup(env, 2, bob.code, bank)).status, "pending");
    assert.equal((await call("bob-transfer", { content: bob.code })).status, 200);
    assert.equal(balance(2), 50000);
    assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM payment_events WHERE outcome = 'ctv_topup_credited'").get().count, 2);
    // The tracked migration remains safe after the runtime created its table.
    sqlite.exec(await readFile(new URL("../migrations/0012_ctv_topups.sql", import.meta.url), "utf8"));
  } finally { sqlite.close(); }
});
