import { SPOTIFY_PLANS, spotifyUid } from "../src/spotify.js";
import { providerRequest, resolveNoDnsEnv, unwrap } from "./nodns.js";

const fail = (status, message) => Object.assign(new Error(message), { status, publicMessage: message });
const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const dbRequired = env => { if (!env.DB) throw fail(503, "Chưa cấu hình cơ sở dữ liệu Spotify."); };

export async function lookupSpotify(env, uid) {
  env = await resolveNoDnsEnv(env);
  const { result } = await providerRequest(env, `/api/v1/spotify/lookup?uid=${encodeURIComponent(uid)}`, { apiKey: true });
  const data = unwrap(result);
  const user = data.user && typeof data.user === "object" ? data.user : data;
  const actual = user.uid ?? user.id ?? user.username;
  if (actual && String(actual) !== uid) throw fail(502, "Tài khoản trả về không khớp UID. Vui lòng kiểm tra lại.");
  const name = user.display_name ?? user.displayName ?? user.name;
  const rawAvatar = user.avatar ?? user.avatar_url ?? user.photoURL ?? user.image ?? user.images?.[0]?.url;
  let avatar = null;
  try { const image = new URL(rawAvatar); if (image.protocol === "https:" && !image.username && !image.password) avatar = image.href; } catch { /* Use a local placeholder if the user has no image. */ }
  if (typeof name !== "string" || !name.trim()) throw fail(502, "Chưa lấy được tên tài khoản Spotify. Vui lòng thử lại.");
  return { uid, display_name: name.trim().slice(0, 200), avatar };
}

export async function spotifyQuote(env, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw fail(400, "Dữ liệu Spotify không hợp lệ.");
  const plan = SPOTIFY_PLANS.find(item => item.id === body.plan_id);
  if (!plan) throw fail(400, "Gói Spotify không hợp lệ.");
  const code = typeof body.promo_code === "string" ? body.promo_code.trim().toUpperCase() : "";
  if (code && !/^[A-Z0-9_-]{1,32}$/.test(code)) throw fail(400, "Mã giảm giá Spotify không hợp lệ.");
  let promo;
  if (code) {
    dbRequired(env);
    promo = await env.DB.prepare("SELECT code, percent FROM spotify_promo_codes WHERE code = ? AND active = 1 AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))").bind(code).first();
    if (!promo || !Number.isInteger(Number(promo.percent)) || promo.percent < 1 || promo.percent > 100) throw fail(400, "Mã giảm giá Spotify không hợp lệ hoặc đã hết hạn.");
  }
  const discount = promo ? Math.floor(plan.price * Number(promo.percent) / 100) : 0;
  return { plan, promo_code: promo?.code || null, subtotal: plan.price, discount_amount: discount, discount_percent: Number(promo?.percent || 0), total: plan.price - discount };
}

export async function spotifyApi(request, env, ctx, { readJson, transferDetails, randomCode, activateOrder }) {
  const url = new URL(request.url), path = url.pathname;
  const readBody = async () => {
    const body = await readJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw fail(400, "Dữ liệu Spotify không hợp lệ.");
    return body;
  };
  if (path === "/api/spotify/plans" && request.method === "GET") return json({ plans: SPOTIFY_PLANS, profile_url: env.SPOTIFY_PROFILE_URL || "http://103.101.161.228:8082/spotify-mitm.mobileconfig" });
  if (path === "/api/spotify/lookup" && request.method === "GET") {
    const uid = spotifyUid(url.searchParams.get("input") ?? url.searchParams.get("uid") ?? "");
    if (!uid) throw fail(400, "Nhập Spotify Username hoặc link hồ sơ hợp lệ.");
    return json(await lookupSpotify(env, uid));
  }
  if (path === "/api/spotify/quote" && request.method === "POST") return json(await spotifyQuote(env, await readBody()));
  if (path === "/api/spotify/orders" && request.method === "POST") {
    dbRequired(env);
    const body = await readBody(), uid = spotifyUid(body.uid);
    if (!uid) throw fail(400, "Tài khoản Spotify không hợp lệ.");
    const quote = await spotifyQuote(env, body);
    // Verify on the server as well; a client-side name/avatar cannot authorize an order.
    await lookupSpotify(env, uid);
    const code = `LG${randomCode(8)}`, expires_at = new Date(Date.now() + 10 * 60000).toISOString();
    const status = quote.total === 0 ? "paid" : "pending";
    await env.DB.prepare("INSERT INTO orders (code, username, contact, plan_id, plan_name, platform, subtotal, discount_amount, amount, promo_code, expires_at, status, paid_at) VALUES (?, ?, ?, ?, ?, 'Spotify', ?, ?, ?, ?, ?, ?, ?)")
      .bind(code, uid, `Spotify: ${uid}`, quote.plan.id, `Spotify Premium · ${quote.plan.name}`, quote.subtotal, quote.discount_amount, quote.total, quote.promo_code, expires_at, status, status === "paid" ? new Date().toISOString() : null).run();
    if (status === "paid") ctx.waitUntil(activateOrder(env, { code, username: uid, plan_id: quote.plan.id, platform: "Spotify", status }));
    return json({ code, amount: quote.total, expires_at, status, ...transferDetails(env, code) }, 201);
  }
  if (path.startsWith("/api/admin/spotify/promos")) {
    dbRequired(env);
    if (path === "/api/admin/spotify/promos" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT p.*, COALESCE(u.paid_orders, 0) AS paid_orders, COALESCE(u.discount_total, 0) AS discount_total FROM spotify_promo_codes p LEFT JOIN (SELECT promo_code, COUNT(*) AS paid_orders, SUM(discount_amount) AS discount_total FROM orders WHERE platform = 'Spotify' AND status IN ('paid','completed') GROUP BY promo_code) u ON u.promo_code = p.code ORDER BY p.created_at DESC").all();
      const promos = (results || []).map(p => ({ ...p, status: !p.active ? "cancelled" : p.expires_at && Date.parse(p.expires_at) <= Date.now() ? "expired" : "active" }));
      return json({ promos, summary: { total: promos.length, active: promos.filter(p => p.status === "active").length, expired: promos.filter(p => p.status === "expired").length, cancelled: promos.filter(p => p.status === "cancelled").length } });
    }
    if (request.method === "POST") {
      const body = await readBody(), code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      if (!/^[A-Z0-9_-]{1,32}$/.test(code)) throw fail(400, "Mã giảm giá Spotify không hợp lệ.");
      if (path === "/api/admin/spotify/promos/cancel") {
        const result = await env.DB.prepare("UPDATE spotify_promo_codes SET active = 0 WHERE code = ?").bind(code).run();
        if (!result.meta?.changes) throw fail(404, "Không tìm thấy mã giảm giá Spotify.");
        return json({ message: `Đã hủy mã Spotify ${code}.` });
      }
      if (path === "/api/admin/spotify/promos") {
        const percent = Number(body.percent), date = body.expires_at ? new Date(body.expires_at) : null;
        if (!Number.isInteger(percent) || percent < 1 || percent > 100 || (date && (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()))) throw fail(400, "Kiểm tra phần trăm và ngày hết hạn của mã Spotify.");
        await env.DB.prepare("INSERT INTO spotify_promo_codes (code, percent, expires_at, active) VALUES (?, ?, ?, 1) ON CONFLICT(code) DO UPDATE SET percent = excluded.percent, expires_at = excluded.expires_at, active = 1").bind(code, percent, date?.toISOString() || null).run();
        return json({ message: "Đã lưu mã giảm giá Spotify." });
      }
    }
  }
  throw fail(405, "Phương thức không được hỗ trợ.");
}

export async function activateSpotifyOrder(env, order) {
  if (order.platform !== "Spotify" || order.status !== "paid") return;
  const plan = SPOTIFY_PLANS.find(item => item.id === order.plan_id);
  if (!plan) return;
  try {
    env = await resolveNoDnsEnv(env);
    const { result } = await providerRequest(env, "/api/v1/spotify", { method: "POST", apiKey: true, body: { uid: order.username, packageId: plan.packageId } });
    const data = unwrap(result);
    if (!(result.success === true || result.status === "success") || data.active === false || (data.uid && data.uid !== order.username) || (data.packageId && data.packageId !== plan.packageId)) return;
    await env.DB.prepare("UPDATE orders SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE code = ? AND status = 'paid'").bind(order.code).run();
  } catch (error) { console.error("Spotify activation needs review", order.code, error.status || "connection"); }
}
