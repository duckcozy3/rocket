// IF NOT EXISTS also makes the tracked migration safe to apply after first use.
const schema = "CREATE TABLE IF NOT EXISTS ctv_topups (code TEXT PRIMARY KEY, ctv_id INTEGER NOT NULL REFERENCES ctv_users(id), amount INTEGER NOT NULL CHECK(amount > 0), unit_price INTEGER NOT NULL CHECK(unit_price > 0), credits INTEGER NOT NULL CHECK(credits > 0), status TEXT NOT NULL DEFAULT 'pending', payment_ref TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, paid_at TEXT)";
export async function ensureCtvTopups(env) { await env.DB.prepare(schema).run(); }
const fail = (status, message) => Object.assign(new Error(message), { status });

export async function createCtvTopup(env, userId, amount, unitPrice, bank) {
  if (!env.SEPAY_WEBHOOK_API_KEY || !/^\d{6}$/.test(bank.bank_bin) || !/^\d{6,20}$/.test(bank.bank_account)) throw fail(503, "Nạp tiền chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
  if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 1000000000) throw fail(400, "Số tiền nạp phải từ 1.000đ đến 1.000.000.000đ.");
  if (!unitPrice || amount % unitPrice !== 0) throw fail(400, `Số tiền nạp phải là bội số của giá 1 lượt (${unitPrice}đ).`);
  await ensureCtvTopups(env);
  // Reuse an unpaid quote for the same amount and price when refreshing the page.
  let topup = await env.DB.prepare("SELECT * FROM ctv_topups WHERE ctv_id = ? AND amount = ? AND unit_price = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1").bind(userId, amount, unitPrice).first();
  if (!topup) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = `LGNAP${Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => alphabet[byte % alphabet.length]).join("")}`;
    await env.DB.prepare("INSERT INTO ctv_topups (code, ctv_id, amount, unit_price, credits) VALUES (?, ?, ?, ?, ?)").bind(code, userId, amount, unitPrice, amount / unitPrice).run();
    topup = await env.DB.prepare("SELECT * FROM ctv_topups WHERE code = ? AND ctv_id = ?").bind(code, userId).first();
  }
  return { ...topup, ...bank, transfer_content: topup.code };
}

export async function readCtvTopup(env, userId, code, bank) {
  if (!/^LGNAP[A-Z0-9]{8}$/.test(code)) throw fail(400, "Mã nạp tiền không hợp lệ.");
  await ensureCtvTopups(env);
  const topup = await env.DB.prepare("SELECT * FROM ctv_topups WHERE code = ? AND ctv_id = ?").bind(code, userId).first();
  if (!topup) throw fail(404, "Không tìm thấy yêu cầu nạp tiền.");
  return { ...topup, ...bank, transfer_content: code };
}

export async function creditCtvTopup(env, payload, code) {
  await ensureCtvTopups(env);
  const transaction = String(payload.id);
  const amount = Number(payload.transferAmount);
  const topup = await env.DB.prepare("SELECT * FROM ctv_topups WHERE code = ?").bind(code).first();
  const codes = new Set(`${payload.code || ""} ${payload.content || ""} ${payload.description || ""}`.toUpperCase().match(/LGNAP[A-Z0-9]{8}/g) || []);
  let outcome;
  if (codes.size > 1) outcome = "ctv_topup_ambiguous";
  else if (payload.transferType !== "in") outcome = "outgoing";
  else if (!env.BANK_ACCOUNT || String(payload.accountNumber || "").trim() !== env.BANK_ACCOUNT) outcome = "wrong_account";
  else if (!topup) outcome = "ctv_topup_not_found";
  else if (amount !== topup.amount) outcome = "ctv_topup_wrong_amount";
  else if (topup.status !== "pending") outcome = "ctv_topup_already_paid";
  if (!outcome && !await env.DB.prepare("SELECT id FROM ctv_users WHERE id = ? AND active = 1").bind(topup.ctv_id).first()) outcome = "ctv_account_inactive";
  if (outcome) {
    await env.DB.prepare("INSERT OR IGNORE INTO payment_events (provider, transaction_id, amount, payload_json, order_code, outcome) VALUES ('sepay', ?, ?, ?, ?, ?)").bind(transaction, amount, JSON.stringify(payload).slice(0, 20000), code, outcome).run();
    return;
  }
  // All three writes commit or roll back together: duplicate/retried webhook cannot credit twice.
  await env.DB.batch([
    env.DB.prepare("UPDATE ctv_topups SET status = 'paid', payment_ref = ?, paid_at = CURRENT_TIMESTAMP WHERE code = ? AND status = 'pending' AND NOT EXISTS (SELECT 1 FROM payment_events WHERE provider = 'sepay' AND transaction_id = ?) AND EXISTS (SELECT 1 FROM ctv_users WHERE id = ctv_topups.ctv_id AND active = 1)").bind(transaction, code, transaction),
    env.DB.prepare("UPDATE ctv_users SET balance = balance + ? WHERE id = ? AND active = 1 AND EXISTS (SELECT 1 FROM ctv_topups WHERE code = ? AND status = 'paid' AND payment_ref = ?) AND NOT EXISTS (SELECT 1 FROM payment_events WHERE provider = 'sepay' AND transaction_id = ?)").bind(amount, topup.ctv_id, code, transaction, transaction),
    env.DB.prepare("INSERT OR IGNORE INTO payment_events (provider, transaction_id, amount, payload_json, order_code, outcome) SELECT 'sepay', ?, ?, ?, code, 'ctv_topup_credited' FROM ctv_topups WHERE code = ? AND status = 'paid' AND payment_ref = ?").bind(transaction, amount, JSON.stringify(payload).slice(0, 20000), code, transaction),
  ]);
}
