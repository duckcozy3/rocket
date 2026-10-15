export function mountCtvBuyCredits(root, initialUser, { api, money, escapeHtml: esc }, onPurchased, onDeposit) {
  let user = initialUser;
  let quantity = 10;
  let disposed = false;
  let submitting = false;
  let requestId = null;
  root.innerHTML = `<div class="ctvp-buy-metrics"><article class="ctvp-amber"><small>SỐ DƯ VÍ</small><strong data-buy-balance></strong></article><article class="ctvp-purple"><small>LƯỢT CÒN LẠI</small><strong data-buy-credits></strong></article><article class="ctvp-blue"><small>GIÁ MỖI LƯỢT</small><strong data-buy-price></strong></article><article class="ctvp-green"><small>TỐI ĐA / LẦN</small><strong>100 lượt</strong></article></div><div class="ctvp-columns ctvp-buy-columns"><section class="ctvp-card"><h2>Mua Lượt Kích Hoạt</h2><p class="ctvp-muted">Mua tối thiểu 10 lượt và tối đa 100 lượt mỗi lần.</p><form id="ctvp-buy-form"><label>Chọn nhanh</label><div class="ctvp-buy-quick">${[10, 20, 50, 100].map((count) => `<button type="button" data-buy-quantity="${count}">${count}</button>`).join("")}</div><label for="ctvp-buy-quantity">Số lượt tuỳ chọn</label><div class="ctvp-buy-stepper"><button type="button" data-buy-minus aria-label="Giảm số lượt">−</button><input id="ctvp-buy-quantity" type="number" min="10" max="100" step="1" value="10" required><button type="button" data-buy-plus aria-label="Tăng số lượt">+</button></div><div class="ctvp-buy-total"><span data-buy-package></span><strong data-buy-total></strong></div><p class="ctvp-buy-shortage" data-buy-shortage></p><button class="ctvp-primary ctvp-buy-submit" type="submit"></button><button class="ctvp-manage" data-buy-deposit type="button">Nạp thêm tiền vào ví</button><p class="form-message" role="status"></p></form></section><section class="ctvp-card"><h2>Bảng Giá</h2><div class="ctvp-buy-price-list"></div><p class="ctvp-buy-note">Lượt đã mua không hết hạn. Kích hoạt 1 tháng hoặc 1 năm dùng 1 lượt; vĩnh viễn dùng 2 lượt.</p></section></div>`;
  const form = root.querySelector("form");
  const input = root.querySelector("input");
  const submit = form.querySelector('[type="submit"]');
  const message = form.querySelector(".form-message");
  const draw = () => {
    const price = Number(user.unit_price || 0);
    const total = quantity * price;
    const valid = Number.isInteger(quantity) && quantity >= 10 && quantity <= 100;
    const missing = Math.max(0, total - Number(user.balance));
    root.querySelector("[data-buy-balance]").textContent = money(user.balance);
    root.querySelector("[data-buy-credits]").textContent = Number(user.available_credits || 0);
    root.querySelector("[data-buy-price]").textContent = money(price);
    root.querySelector("[data-buy-package]").textContent = valid ? `Gói ${quantity} lượt` : "Chọn từ 10 đến 100 lượt";
    root.querySelector("[data-buy-total]").textContent = valid ? money(total) : "—";
    root.querySelector("[data-buy-shortage]").textContent = valid && missing ? `Thiếu ${money(missing)} — vui lòng nạp thêm` : "";
    submit.disabled = submitting || !valid || missing > 0;
    submit.textContent = submitting ? "Đang mua lượt…" : !valid ? "Nhập từ 10 đến 100 lượt" : missing ? "Không đủ số dư" : `Mua ${quantity} lượt`;
    root.querySelector("[data-buy-minus]").disabled = submitting || quantity <= 10;
    root.querySelector("[data-buy-plus]").disabled = submitting || quantity >= 100;
    input.disabled = submitting;
    root.querySelectorAll("[data-buy-quantity]").forEach((button) => { button.classList.toggle("is-active", Number(button.dataset.buyQuantity) === quantity); button.disabled = submitting; });
    root.querySelector(".ctvp-buy-price-list").innerHTML = [10, 20, 50, 100].map((count) => `<button type="button" data-price-quantity="${count}" class="${count === quantity ? "is-active" : ""}" ${submitting ? "disabled" : ""}><span><b>${count} lượt</b><small>${esc(money(price))} / lượt</small></span><strong>${esc(money(count * price))}</strong></button>`).join("");
    root.querySelectorAll("[data-price-quantity]").forEach((button) => button.addEventListener("click", () => select(Number(button.dataset.priceQuantity))));
  };
  const select = (value) => { if (submitting) return; quantity = value; input.value = value; requestId = null; message.textContent = ""; draw(); };
  root.querySelectorAll("[data-buy-quantity]").forEach((button) => button.addEventListener("click", () => select(Number(button.dataset.buyQuantity))));
  root.querySelector("[data-buy-minus]").addEventListener("click", () => select(Math.max(10, quantity - 1)));
  root.querySelector("[data-buy-plus]").addEventListener("click", () => select(Math.min(100, quantity + 1)));
  root.querySelector("[data-buy-deposit]").addEventListener("click", onDeposit);
  input.addEventListener("input", () => { quantity = Number(input.value); requestId = null; message.textContent = ""; draw(); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting || !input.checkValidity() || !Number.isInteger(quantity) || quantity < 10 || quantity > 100) return;
    if (!window.confirm(`Mua ${quantity} lượt với giá ${money(user.unit_price)} / lượt, tổng ${money(quantity * user.unit_price)} từ ví?`)) return;
    requestId ||= crypto.randomUUID();
    submitting = true; draw();
    try {
      const result = await api("/api/ctv/credits/buy", { method: "POST", body: JSON.stringify({ quantity, unit_price: user.unit_price, request_id: requestId }) });
      await onPurchased();
      const account = await api("/api/ctv/me");
      if (disposed) return;
      requestId = null;
      user = account.user;
      message.textContent = `Đã mua ${result.purchase.quantity} lượt với ${money(result.purchase.total)}.`;
      message.className = "form-message is-success";
    } catch (error) { if (!disposed) { message.textContent = error.message; message.className = "form-message is-error"; } }
    finally { submitting = false; if (!disposed) draw(); }
  });
  draw();
  api("/api/ctv/me").then(({ user: account }) => { if (!disposed && !submitting) { user = account; draw(); } }).catch(() => {});
  return () => { disposed = true; };
}
