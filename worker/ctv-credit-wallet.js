const initialized = new WeakSet();
export async function ensureCtvCredits(env, userId) {
  if (!initialized.has(env.DB)) {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS ctv_credits (ctv_id INTEGER PRIMARY KEY REFERENCES ctv_users(id), credits INTEGER NOT NULL DEFAULT 0 CHECK(credits >= 0))").run();
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS ctv_credit_purchases (request_id TEXT PRIMARY KEY, ctv_id INTEGER NOT NULL REFERENCES ctv_users(id), quantity INTEGER NOT NULL CHECK(quantity BETWEEN 10 AND 100), unit_price INTEGER NOT NULL CHECK(unit_price >= 0), total INTEGER NOT NULL CHECK(total >= 0), status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
    initialized.add(env.DB);
  }
  await env.DB.prepare("INSERT OR IGNORE INTO ctv_credits (ctv_id, credits) SELECT id, 0 FROM ctv_users WHERE id = ?").bind(userId).run();
}
const fail = (status, message) => Object.assign(new Error(message), { status });
export async function buyCtvCredits(env, userId, quantity, unitPrice, requestId) {
  if (!Number.isSafeInteger(quantity) || quantity < 10 || quantity > 100) throw fail(400, "Mỗi lần mua từ 10 đến 100 lượt, số lượt phải là số nguyên.");
  if (typeof requestId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) throw fail(400, "Mã yêu cầu mua lượt không hợp lệ.");
  await ensureCtvCredits(env, userId);
  const existing = await env.DB.prepare("SELECT * FROM ctv_credit_purchases WHERE request_id = ?").bind(requestId).first();
  if (existing) {
    if (existing.ctv_id !== userId || existing.quantity !== quantity) throw fail(409, "Mã yêu cầu đã được dùng cho giao dịch khác.");
    return existing;
  }
  const total = quantity * unitPrice;
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO ctv_credit_purchases (request_id, ctv_id, quantity, unit_price, total) SELECT ?, id, ?, ?, ? FROM ctv_users WHERE id = ? AND active = 1 AND balance >= ?").bind(requestId, quantity, unitPrice, total, userId, total),
    env.DB.prepare("UPDATE ctv_users SET balance = balance - ? WHERE id = ? AND EXISTS (SELECT 1 FROM ctv_credit_purchases WHERE request_id = ? AND ctv_id = ? AND status = 'pending')").bind(total, userId, requestId, userId),
    env.DB.prepare("UPDATE ctv_credits SET credits = credits + ? WHERE ctv_id = ? AND EXISTS (SELECT 1 FROM ctv_credit_purchases WHERE request_id = ? AND ctv_id = ? AND status = 'pending')").bind(quantity, userId, requestId, userId),
    env.DB.prepare("UPDATE ctv_credit_purchases SET status = 'completed' WHERE request_id = ? AND ctv_id = ? AND status = 'pending'").bind(requestId, userId),
  ]);
  const purchase = await env.DB.prepare("SELECT * FROM ctv_credit_purchases WHERE request_id = ?").bind(requestId).first();
  if (!purchase) throw fail(400, "Không đủ số dư ví để mua lượt. Vui lòng nạp thêm tiền.");
  if (purchase.ctv_id !== userId || purchase.quantity !== quantity) throw fail(409, "Mã yêu cầu đã được dùng cho giao dịch khác.");
  return purchase;
}
