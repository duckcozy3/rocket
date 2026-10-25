import assert from "node:assert/strict";
import test from "node:test";
import { extractPaymentCodes } from "../src/payment-codes.js";
import worker from "../worker/index.js";

test("payment codes require complete prefixes and suffixes and deduplicate webhook fields", () => {
  assert.deepEqual(extractPaymentCodes({ code: "LGNAP12345678", content: "Nap lgnap12345678." }), ["LGNAP12345678"]);
  for (const content of ["chuyen tien ca nhan", "XLG12345678", "LG123456789", "LGNAP123456789", "LG1234567", "LG 12345678"]) {
    assert.deepEqual(extractPaymentCodes({ content }), [], content);
  }
  assert.deepEqual(extractPaymentCodes({ content: "LG12345678 LGNAP12345678" }), ["LG12345678", "LGNAP12345678"]);
});

test("personal transfers and multiple payment codes never query orders or credit wallets", async () => {
  for (const [content, expected] of [["XLG12345678", "no_order_code"], ["LG123456789", "no_order_code"], ["LG12345678 LG87654321", "ambiguous_payment_code"], ["LGNAP12345678 LG12345678", "ambiguous_payment_code"]]) {
    let outcome;
    const DB = { prepare(sql) {
      assert.match(sql, /^(INSERT OR IGNORE INTO|UPDATE) payment_events/);
      return { bind(...args) { if (sql.startsWith("UPDATE")) outcome = args[1]; return this; }, async run() { return { meta: { changes: 1 } }; } };
    } };
    const response = await worker.fetch(new Request("https://locketgold.info/api/sepay/webhook", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Apikey secret" },
      body: JSON.stringify({ id: 1, transferType: "in", accountNumber: "123456789", transferAmount: 50000, content }),
    }), { DB, SEPAY_WEBHOOK_API_KEY: "secret", BANK_ACCOUNT: "123456789" }, {});
    assert.equal(response.status, 200);
    assert.equal(outcome, expected);
  }
});
