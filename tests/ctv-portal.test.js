import assert from "node:assert/strict";
import test from "node:test";
import { ctvPortalMarkup } from "../src/ctv-portal.js";
import { createPageRenderer } from "../src/page-render.js";
import { DEFAULT_PLANS } from "../src/plans.js";
import { remoteLogin, portalOrders } from "../worker/nodns.js";
import worker from "../worker/index.js";

test("CTV lookup uses the authenticated provider session and returns only public profile fields", async (t) => {
  const site = "https://locketgold.info";
  const env = { SESSION_SECRET: "ctv-lookup-test-secret", NODNS_CTV_PORTAL: "true" };
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/auth/login")) return Response.json({ success: true }, { headers: { "Set-Cookie": "ctv-session=test-session; Path=/; HttpOnly" } });
    assert.equal(url, "https://ctv.nodns.vn/api/ctv/lookup");
    assert.equal(options.headers.Cookie, "ctv-session=test-session");
    assert.deepEqual(JSON.parse(options.body), { username: "alice" });
    return Response.json({ data: { uid: "u1", displayName: "Alice", apiKey: "private" } });
  });
  const cookie = (await remoteLogin(new Request(site), env, "ctv", { username: "ctv", password: "password" })).split(";")[0];
  const call = (username, session = cookie, origin = site) => worker.fetch(new Request(`${site}/api/ctv/lookup`, {
    method: "POST", headers: { Origin: origin, Cookie: session, "Content-Type": "application/json" }, body: JSON.stringify({ username }),
  }), env, {});
  assert.equal((await call("alice", "")).status, 401);
  assert.equal((await call("alice", cookie, "https://other.example")).status, 403);
  assert.equal((await call("bad/name")).status, 400);
  const response = await call("alice");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { user: { username: "alice", uid: "u1", displayName: "Alice" } });
  assert.equal(calls.length, 2);
});

test("portal renders remote iOS packages and escapes account data", () => {
  const { escapeHtml, money } = createPageRenderer("ctv");
  const markup = ctvPortalMarkup({ username: '<img src=x onerror=alert(1)>', remaining: 341, balance: 0 }, true, { escapeHtml, money, plans: DEFAULT_PLANS });
  assert.ok(!markup.includes('<img src=x'));
  assert.ok(markup.includes('value="ios-month"'));
  assert.ok(markup.includes('value="ios-year"'));
  assert.ok(markup.includes('value="ios-lifetime"'));
  assert.ok(!markup.includes('value="android-lifetime"'));
  assert.ok(markup.includes('data-ctv-nav="history"'));
});

test("remote order mapping preserves available timestamps", () => {
  const [order] = portalOrders({ data: { orders: [{ id: "1", username: "alice", createdAt: "2026-10-15T11:00:00Z" }] } });
  assert.equal(order.created_at, "2026-10-15T11:00:00Z");
});
