import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import worker from "../worker/index.js";
import { spotifyUid, spotifyPage } from "../src/spotify.js";
import { createPageRenderer } from "../src/page-render.js";
import { activateSpotifyOrder } from "../worker/spotify.js";

test("Spotify accepts only a UID or an actual user profile and renders the requested controls", () => {
  assert.equal(spotifyUid(" https://open.spotify.com/user/alice?si=123 "), "alice");
  assert.equal(spotifyUid("spotify:user:alice"), "alice");
  for (const input of ["https://open.spotify.com/playlist/abc", "https://evil.example/user/alice", "https://open.spotify.com@evil.example/user/alice", "alice@example.com", "../alice", "", null]) assert.equal(spotifyUid(input), null);
  const html = spotifyPage();
  assert.match(html, /id="spotify-profile"/);
  assert.match(html, /id="spotify-coupon"/);
  assert.match(html, /id="spotify-pay"[^>]*disabled>Thanh toán/);
  assert.ok(!html.includes(">Tra cứu<") && !html.includes(">Kích hoạt ngay<"));
  const page = createPageRenderer("spotify").render();
  assert.match(page, /href="\/spotify\/" class="is-active/);
});

test("Spotify lookup, separate admin coupons and paid activation work with the real D1 schema", async t => {
  const require = createRequire(import.meta.url), wranglerRequire = createRequire(require.resolve("wrangler"));
  const { Miniflare, convertV4MiniflareOptions } = wranglerRequire("miniflare");
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("ok")}}', compatibilityDate: "2026-09-29", d1Databases: ["DB"] }));
  t.after(() => mf.dispose());
  const DB = await mf.getD1Database("DB");
  for (const file of (await readdir(new URL("../migrations/", import.meta.url))).filter(f => f.endsWith(".sql")).sort()) {
    const sql = (await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8")).replace(/^\s*--.*$/gm, "");
    for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) await DB.prepare(statement).run();
  }
  let grants = 0, providerMode = "found";
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const upstream = new URL(url);
    assert.equal(upstream.origin, "https://ctv.nodns.vn");
    assert.equal(options.headers["x-api-key"], "private-test-key");
    if (upstream.pathname === "/api/v1/spotify/lookup") {
      if (providerMode === "missing") return Response.json({ status: "error", message: "Không tìm thấy tài khoản." }, { status: 404 });
      return Response.json({ status: "success", data: { uid: providerMode === "mismatch" ? "someone-else" : upstream.searchParams.get("uid"), display_name: "Alice", avatar: "https://i.scdn.co/image/test" } });
    }
    assert.equal(upstream.pathname, "/api/v1/spotify"); grants++;
    const body = JSON.parse(options.body);
    assert.equal(body.packageId, "1month");
    return Response.json({ status: "success", data: { uid: body.uid, active: true, packageId: body.packageId } });
  });
  const env = { DB, SITE_URL: "https://locketgold.info", NODNS_API_KEY: "private-test-key", SESSION_SECRET: "spotify-test-session-secret-at-least-32-bytes", ADMIN_PASSWORD_SHA256: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", SEPAY_WEBHOOK_API_KEY: "test-sepay", BANK_ACCOUNT: "5565662518", BANK_BIN: "970422" };
  const jobs = [], ctx = { waitUntil(job) { jobs.push(job); } };
  const call = (path, method = "GET", body, cookie = "", extra = {}) => worker.fetch(new Request(env.SITE_URL + path, { method, headers: { Origin: env.SITE_URL, "Content-Type": "application/json", Cookie: cookie, ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env, ctx);
  const profile = await call("/api/spotify/lookup?uid=alice");
  assert.equal(profile.status, 200);
  assert.deepEqual(await profile.json(), { uid: "alice", display_name: "Alice", avatar: "https://i.scdn.co/image/test" });
  providerMode = "missing";
  assert.equal((await call("/api/spotify/lookup?uid=unknown")).status, 404);
  providerMode = "mismatch";
  assert.equal((await call("/api/spotify/lookup?uid=alice")).status, 502);
  providerMode = "found";
  assert.equal((await call("/api/admin/spotify/promos")).status, 401);
  const login = await call("/api/admin/login", "POST", { username: "admin", password: "admin" });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("Set-Cookie").split(";")[0];
  assert.equal((await call("/api/admin/spotify/promos", "POST", { code: "SP10", percent: 10 }, cookie)).status, 200);
  await DB.prepare("INSERT INTO promo_codes (code, percent) VALUES ('LOCKET20', 20)").run();
  const quoted = await call("/api/spotify/quote", "POST", { plan_id: "spotify-1month", promo_code: "sp10", total: 1 });
  assert.equal((await quoted.json()).total, 22500);
  assert.equal((await call("/api/spotify/quote", "POST", { plan_id: "spotify-1month", promo_code: "LOCKET20" })).status, 400);
  assert.equal((await call("/api/quote", "POST", { plan_id: "ios-month", promo_code: "SP10" })).status, 400);
  const created = await call("/api/spotify/orders", "POST", { uid: "https://open.spotify.com/user/alice", plan_id: "spotify-1month", promo_code: "SP10", amount: 1 });
  assert.equal(created.status, 201);
  const order = await created.json();
  assert.equal(order.amount, 22500);
  assert.equal(grants, 0, "Unpaid orders must never activate Spotify");
  const payload = { id: 991234, gateway: "MBBank", accountNumber: env.BANK_ACCOUNT, transferType: "in", transferAmount: 22500, content: order.code };
  assert.equal((await call("/api/sepay/webhook", "POST", payload, "", { Authorization: "Apikey test-sepay" })).status, 200);
  await Promise.all(jobs);
  assert.equal(grants, 1);
  const completed = await call(`/api/orders/${order.code}`);
  assert.equal((await completed.json()).status, "completed");
  await call("/api/sepay/webhook", "POST", payload, "", { Authorization: "Apikey test-sepay" });
  await Promise.all(jobs);
  assert.equal(grants, 1, "Duplicate webhooks must not repeat provider mutations");
  const promos = await (await call("/api/admin/spotify/promos", "GET", undefined, cookie)).json();
  assert.equal(promos.promos[0].paid_orders, 1);
  assert.equal(promos.promos[0].discount_total, 2500);
  await call("/api/admin/spotify/promos/cancel", "POST", { code: "SP10" }, cookie);
  assert.equal((await call("/api/spotify/quote", "POST", { plan_id: "spotify-1month", promo_code: "SP10" })).status, 400);
  assert.equal((await call("/api/spotify/quote", "POST", null)).status, 400);
  await activateSpotifyOrder(env, { platform: "Spotify", status: "pending", plan_id: "spotify-1month", username: "alice" });
  assert.equal(grants, 1);
});
