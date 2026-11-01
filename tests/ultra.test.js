import test from "node:test";
import assert from "node:assert/strict";
import { activateUltraOrder } from "../worker/ultra.js";

test("Ultra uses its own key and filter lifetime endpoint, completing only confirmed activations", async () => {
  const original = globalThis.fetch;
  let completed = 0;
  const env = { ULTRA_NODNS_API_KEY: "test-ultra-key", NODNS_API_KEY: "ordinary-gold-key", DB: { prepare() { return { bind(link, code) { assert.equal(link, "http://103.101.161.228:8081/vip/test"); assert.equal(code, "LG123"); return this; }, async run() { completed++; } }; } } };
  const order = { code: "LG123", username: "customer", platform: "iOS", plan_id: "ios-ultra-lifetime" };
  try {
    const link = "http://103.101.161.228:8081/vip/test";
    for (const result of [{ status: "success", filterToken: "test", filterShortUrl: link, mobileconfigUrl: link }, { status: "info", already_has_gold: true, filterShortUrl: link }, { status: "info", filterShortUrl: link }, { status: "success", package: "filter_1year", filterShortUrl: link }, { status: "success", active: false, filterShortUrl: link }, { status: "success", isFilter: false, filterShortUrl: link }, { status: "success", data: { package: "filter_lifetime", active: true, upgraded: false, isFilter: true, mobileconfigUrl: "http://103.101.161.228:8081/vip/test" } }, { success: true }, { success: false }, {}, { success: true, data: { active: false } }, { status: "success", data: { active: true, isFilter: true, mobileconfigUrl: "javascript:alert(1)" } }]) {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, "https://ctv.nodns.vn/api/v1/ctv/gold");
        assert.equal(options.method, "POST");
        assert.equal(options.headers["x-api-key"], "test-ultra-key");
        assert.equal(options.headers["Content-Type"], "application/json");
        assert.deepEqual(JSON.parse(options.body), { user: "customer", isFilter: true, package: "filter_lifetime" });
        return Response.json(result);
      };
      await activateUltraOrder(env, order);
    }
    assert.equal(completed, 3);
    globalThis.fetch = async () => { throw new Error("Should not call provider without Ultra key"); };
    await activateUltraOrder({ ...env, ULTRA_NODNS_API_KEY: "" }, order);
    assert.equal(completed, 3);
  } finally { globalThis.fetch = original; }
});
