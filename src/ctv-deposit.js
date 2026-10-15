import { paymentQrUrl } from "./payment.js";

export function mountCtvDeposit(root, user, { api, escapeHtml: esc, money }, onPaid) {
  const unit = Number(user.unit_price || 0);
  const storageKey = `ctv-topup:${user.username}`;
  let quote = null;
  let version = 0;
  let disposed = false;
  let pollTimer;
  let inputTimer;
  let checking = false;
  root.innerHTML = `<div class="ctvp-deposit-metrics"><article class="ctvp-amber"><small>SỐ DƯ HIỆN TẠI</small><strong data-deposit-balance>${money(user.balance)}</strong></article><article class="ctvp-purple"><small>LƯỢT CÒN LẠI</small><strong data-deposit-credits>${Number(user.available_credits || 0)}</strong></article></div><div class="ctvp-columns"><section class="ctvp-card"><h2>Nạp Tiền Vào Ví</h2><p class="ctvp-muted">Quét mã QR hoặc chuyển khoản thủ công</p><form id="ctvp-deposit-form"><label for="ctvp-deposit-amount">SỐ TIỀN MUỐN NẠP</label><input id="ctvp-deposit-amount" name="amount" type="number" min="${Math.max(unit, 1000)}" max="1000000000" step="${unit || 1000}" placeholder="Nhập số tiền muốn nạp" required><p class="ctvp-muted">Giá 1 lượt: ${money(unit)} · Nạp theo bội số của giá 1 lượt.</p><button class="ctvp-primary" type="submit" ${unit ? "" : "disabled"}>Tạo mã QR nạp tiền</button></form><div id="ctvp-deposit-quote"></div><p class="form-message" id="ctvp-deposit-message" role="status"></p></section><section class="ctvp-card ctvp-deposit-guide"><h2>Hướng Dẫn Nạp Tiền Chi Tiết</h2><p class="ctvp-muted">Thông tin nhận tiền giống thanh toán trên web chính.</p><ol><li><strong>Mở ứng dụng ngân hàng</strong><p>Chọn chuyển khoản hoặc quét mã QR ở bên trái.</p></li><li><strong>Kiểm tra tài khoản nhận</strong><p>Đối chiếu ngân hàng, số tài khoản và chủ tài khoản hiển thị cùng mã QR.</p></li><li><strong>Giữ nguyên nội dung chuyển khoản</strong><p class="ctvp-deposit-warning">Sao chép đúng mã LGNAP… của yêu cầu nạp. Sai mã có thể khiến giao dịch không được tự động ghi nhận.</p></li><li><strong>Chuyển đúng số tiền</strong><p>Tiền nạp được cộng vào ví. Vào Mua Lượt để đổi tiền trong ví thành lượt. Giao dịch khác số tiền yêu cầu cần liên hệ hỗ trợ để đối soát.</p></li><li><strong>Chờ SePay xác nhận</strong><p>Trang tự kiểm tra khi đang mở. Nút Kiểm tra giao dịch chỉ cập nhật trạng thái, không tự xác nhận thanh toán.</p></li></ol></section></div>`;
  const form = root.querySelector("form");
  const input = form.elements.amount;
  const target = root.querySelector("#ctvp-deposit-quote");
  const notice = root.querySelector("#ctvp-deposit-message");
  const message = (text, success = false) => { notice.textContent = text; notice.className = `form-message ${success ? "is-success" : "is-error"}`; };
  const remember = (code) => { try { code ? sessionStorage.setItem(storageKey, code) : sessionStorage.removeItem(storageKey); } catch { /* Storage can be unavailable. */ } };
  const renderQuote = () => {
    const qr = paymentQrUrl(quote);
    target.innerHTML = `<div class="ctvp-deposit-qr">${qr ? `<img src="${esc(qr)}" alt="QR nạp ${esc(money(quote.amount))}" width="250" height="300">` : "<p>Không tạo được mã QR. Dùng thông tin chuyển khoản bên dưới.</p>"}</div><div class="ctvp-bank-details"><div><small>NGÂN HÀNG</small><strong>${esc(quote.bank_name)}</strong></div><div><small>SỐ TÀI KHOẢN</small><strong>${esc(quote.bank_account)}</strong></div><div><small>CHỦ TÀI KHOẢN</small><strong>${esc(quote.account_name || "Kiểm tra trong ứng dụng ngân hàng")}</strong></div></div><div class="ctvp-transfer-code"><small>NỘI DUNG CHUYỂN KHOẢN</small><div><strong>${esc(quote.transfer_content)}</strong><button type="button" data-copy-code>Sao chép</button></div></div><p class="ctvp-muted">Nạp ${money(quote.amount)} vào ví. Sau đó vào Mua Lượt để mua từ 10 đến 100 lượt mỗi lần.</p><button type="button" class="ctvp-check-transfer" data-check-transfer>↻ Kiểm Tra Giao Dịch</button><p class="ctvp-muted">Tự ghi nhận sau khi nhận thông báo thanh toán hợp lệ từ SePay.</p>`;
    target.querySelector("[data-copy-code]").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(quote.transfer_content); message("Đã sao chép nội dung chuyển khoản.", true); }
      catch { message(`Hãy sao chép mã: ${quote.transfer_content}`); }
    });
    target.querySelector("[data-check-transfer]").addEventListener("click", () => check(true));
  };
  const schedule = () => { clearTimeout(pollTimer); if (!disposed && quote?.status === "pending") pollTimer = setTimeout(() => check(), 5000); };
  const paid = async () => {
    clearTimeout(pollTimer); remember(null);
    message(`Đã nhận ${money(quote.amount)}. Ví đã được cộng tiền nạp. Vào Mua Lượt để đổi tiền thành lượt.`, true);
    target.innerHTML = '<p class="ctvp-profile-result">✓ Yêu cầu nạp đã hoàn tất. Tạo mã QR mới cho lần nạp tiếp theo.</p>';
    await onPaid();
    const { user: account } = await api("/api/ctv/me");
    if (disposed) return;
    root.querySelector("[data-deposit-balance]").textContent = money(account.balance);
    root.querySelector("[data-deposit-credits]").textContent = Number(account.available_credits || 0);
  };
  const check = async (manual = false) => {
    if (!quote || checking || disposed) return;
    if (document.hidden && !manual) { schedule(); return; }
    checking = true;
    const token = version;
    try {
      const result = await api(`/api/ctv/topups/${quote.code}`);
      if (disposed || token !== version) return;
      quote = result;
      if (quote.status === "paid") await paid();
      else if (manual) message("Chưa nhận được xác nhận từ SePay. Hệ thống sẽ tiếp tục kiểm tra.", true);
    } catch (error) { if (!disposed && token === version && manual) message(error.message); }
    finally { checking = false; schedule(); }
  };
  const create = async () => {
    if (!input.checkValidity() || !unit) return;
    const token = ++version;
    const button = form.querySelector("button"); button.disabled = true;
    try {
      const result = await api("/api/ctv/topups", { method: "POST", body: JSON.stringify({ amount: Number(input.value) }) });
      if (disposed || token !== version) return;
      quote = result; remember(quote.code); renderQuote(); message("Chuyển đúng số tiền và nội dung để SePay tự ghi nhận.", true); schedule();
    } catch (error) { if (!disposed && token === version) message(error.message); }
    finally { if (!disposed && token === version) button.disabled = false; }
  };
  form.addEventListener("submit", (event) => { event.preventDefault(); clearTimeout(inputTimer); create(); });
  input.addEventListener("input", () => {
    ++version; quote = null; clearTimeout(pollTimer); clearTimeout(inputTimer); target.replaceChildren(); notice.textContent = ""; form.querySelector("button").disabled = !unit;
    inputTimer = setTimeout(create, 1000);
  });
  let saved;
  try { saved = sessionStorage.getItem(storageKey); } catch { /* No saved request. */ }
  if (saved) api(`/api/ctv/topups/${saved}`).then(async (result) => {
    if (disposed || version) return;
    quote = result; input.value = result.amount; renderQuote();
    if (quote.status === "paid") await paid(); else schedule();
  }).catch(() => remember(null));
  return () => { disposed = true; clearTimeout(inputTimer); clearTimeout(pollTimer); };
}
