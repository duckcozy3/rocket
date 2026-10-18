import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker/index.js";
const site = "https://locketgold.info";
const env = { SESSION_SECRET: "manual-upgrade-test-secret-at-least-32-bytes", ADMIN_PASSWORD_SHA256: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", NODNS_API_KEY: "private-key" };
async function login() {
  const response = await worker.fetch(new Request(`${site}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "admin" }) }), env, {});
  return response.headers.get("Set-Cookie").split(";")[0];
}
function request(cookie, body, origin = site) {
  return new Request(`${site}/api/admin/provider/upgrade`, { method: "POST", headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
test("manual upgrade requires admin, valid account, allowed plan and same origin", async (t) => {
  const cookie = await login();
  const mock = t.mock.method(globalThis, "fetch", async () => { throw Error("Unexpected provider call"); });
  for (const [session, body, origin, status] of [["", { username: "alice", plan_id: "ios-month" }, site, 401], [cookie, { username: "bad user", plan_id: "ios-month" }, site, 400], [cookie, { username: "alice", plan_id: "other" }, site, 400], [cookie, { username: "alice", plan_id: "ios-year" }, "https://other.example", 403]]) {
    assert.equal((await worker.fetch(request(session, body, origin), env, {})).status, status);
  }
  assert.equal(mock.mock.callCount(), 0);
});
test("manual plans send server-controlled durations and only expose public results", async (t) => {
  const cookie = await login();
  let plan;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://ctv.nodns.vn/api/v1/grant");
    assert.equal(options.headers["x-api-key"], env.NODNS_API_KEY);
    const body = JSON.parse(options.body);
    assert.equal(body.user, "alice");
    assert.equal(body.days, { "ios-month": 30, "ios-year": 365 }[plan]);
    if (body.days) assert.ok(Math.abs(Date.parse(body.expiresAt) - Date.now() - body.days * 86400000) < 5000);
    else assert.equal(body.expiresAt, undefined);
    return Response.json({ status: "success", data: { active: true, expiresAt: body.expiresAt || null, remaining: 9, secret: "hidden" } });
  });
  for (plan of ["ios-month", "ios-year", "ios-lifetime"]) {
    const response = await worker.fetch(request(cookie, { username: "@alice", plan_id: plan, days: 1, expiresAt: "bad" }), env, {});
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.plan_id, plan); assert.equal(data.remaining, 9);
    assert.equal(JSON.stringify(data).includes("hidden"), false);
  }
});
test("manual timed upgrade corrects an incorrect provider expiry", async (t) => {
  const cookie = await login();
  let expected;
  const mock = t.mock.method(globalThis, "fetch", async (url, options) => {
    const body = JSON.parse(options.body);
    if (url.endsWith("/grant")) { expected = body.expiresAt; return Response.json({ status: "success", data: { active: true, expiresAt: null } }); }
    assert.deepEqual(body, { user: "alice", expiresAt: expected });
    return Response.json({ status: "success", data: { expiresAt: expected } });
  });
  const response = await worker.fetch(request(cookie, { username: "alice", plan_id: "ios-month" }), env, {});
  assert.equal(response.status, 200); assert.equal((await response.json()).expiresAt, expected);
  assert.equal(mock.mock.callCount(), 2);
});
