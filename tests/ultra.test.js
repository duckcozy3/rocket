import test from "node:test";
import assert from "node:assert/strict";
import { activateUltraOrder } from "../worker/ultra.js";

test("Ultra uses its own key and lifetime endpoint, completing only confirmed activations", async () => {
  const original = globalThis.fetch;
  let completed = 0;
  const env = { ULTRA_NODNS_API_KEY: "test-ultra-key", NODNS_API_KEY: "ordinary-gold-key", DB: { prepare() { return { bind(link, code) { assert.equal(link, "http://103.101.161.228:8081/vip/test"); assert.equal(code, "LG123"); return this; }, async run() { completed++; } }; } } };
  const order = { code: "LG123", username: "customer", platform: "iOS", plan_id: "ios-ultra-lifetime" };
  try {
    for (const result of [{ status: "success", data: { active: true, upgraded: false, isFilter: true, mobileconfigUrl: "http://103.101.161.228:8081/vip/test" } }, { success: true }, { success: false }, {}, { success: true, data: { active: false } }, { status: "success", data: { active: true, isFilter: true, mobileconfigUrl: "javascript:alert(1)" } }]) {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, "https://ctv.nodns.vn/api/v1/ctv/gold");
        assert.equal(options.method, "POST");
        assert.equal(options.headers["x-api-key"], "test-ultra-key");
        assert.deepEqual(JSON.parse(options.body), { user: "customer", packageId: "lifetime", isFilter: true });
        return Response.json(result);
      };
      await activateUltraOrder(env, order);
    }
    assert.equal(completed, 1);
    globalThis.fetch = async () => { throw new Error("Should not call provider without Ultra key"); };
    await activateUltraOrder({ ...env, ULTRA_NODNS_API_KEY: "" }, order);
    assert.equal(completed, 1);
  } finally { globalThis.fetch = original; }
});
