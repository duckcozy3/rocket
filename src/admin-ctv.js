export function addAdminCtv(dash, api, { escapeHtml: esc, money }) {
  const panel = dash.querySelector("#ctv-admin");
  let accounts = [];
  let loading = false;
  panel.innerHTML = `<div class="admin-top"><div><h2>Quản lý cộng tác viên</h2><p>Tài khoản, ví và giá bán được quản lý trên locketgold.info.</p></div><button id="admin-ctv-refresh" class="button button--small button--outline" type="button">Làm mới</button></div>
    <div class="metric-grid admin-ctv-metrics"><article><span>Cộng tác viên</span><strong data-ctv-stat="count">—</strong></article><article><span>Đơn CTV đã bán</span><strong data-ctv-stat="sold_orders">—</strong></article><article><span>Tổng số dư ví</span><strong data-ctv-stat="balance">—</strong></article></div>
    <p id="admin-ctv-message" class="form-message" role="status"></p><div id="admin-ctv-list"><p>Đang tải danh sách…</p></div>
    <div class="ctv-admin-forms"><form id="admin-ctv-create"><h2>Tạo tài khoản CTV</h2><label>Tên đăng nhập<input name="username" required minlength="3" maxlength="50" pattern="[a-zA-Z0-9_.-]{3,50}" autocomplete="off"></label><label>Mật khẩu<input name="password" type="password" required minlength="10" maxlength="1000" autocomplete="new-password"></label><label>Số dư ban đầu (VNĐ)<input name="initial_balance" type="number" min="0" max="1000000000" step="1" value="0" required></label><div data-price-fields="create"></div><button class="button" type="submit">Tạo tài khoản</button><p class="form-message" aria-live="polite"></p></form>
    <form id="admin-ctv-prices"><h2>Đặt giá 1 lượt cho CTV</h2><label>Cộng tác viên<select name="id" required></select></label><div data-price-fields="edit"></div><button class="button" type="submit">Lưu giá 1 lượt</button><p class="form-message" aria-live="polite"></p></form>
    <form id="admin-ctv-wallet"><h2>Điều chỉnh số dư ví</h2><label>Cộng tác viên<select name="username" required></select></label><label>Số tiền thay đổi (VNĐ)<input name="delta" type="number" step="1" min="-1000000000" max="1000000000" required placeholder="50000 để cộng, -50000 để trừ"></label><button class="button" type="submit">Cập nhật số dư</button><p class="form-message" aria-live="polite"></p></form></div>`;
  const create = panel.querySelector("#admin-ctv-create");
  const edit = panel.querySelector("#admin-ctv-prices");
  const wallet = panel.querySelector("#admin-ctv-wallet");
  const fields = (price = "") => `<label>Giá 1 lượt (VNĐ)<input name="unit_price" type="number" min="0" max="100000000" step="1" value="${price}" required></label><p>1 tháng: 1 lượt · 1 năm: 1 lượt · Vĩnh viễn: 2 lượt. Giá áp dụng cho lần mua lượt tiếp theo. Lượt đã mua giữ nguyên.</p>`;
  const fillPrices = () => { edit.querySelector('[data-price-fields="edit"]').innerHTML = fields(accounts.find((user) => String(user.id) === edit.elements.id.value)?.unit_price ?? ""); };
  const refresh = async () => {
    if (loading) return;
    loading = true;
    const notice = panel.querySelector("#admin-ctv-message");
    try {
      const data = await api("/api/admin/ctv");
      accounts = data.ctv;
      panel.querySelectorAll("[data-ctv-stat]").forEach((node) => { node.textContent = node.dataset.ctvStat === "balance" ? money(data.stats.balance) : Number(data.stats[node.dataset.ctvStat] || 0); });
      panel.querySelector("#admin-ctv-list").innerHTML = accounts.length ? `<div class="table-wrap"><table><thead><tr><th>STT</th><th>Tài khoản CTV</th><th>Đơn đã bán</th><th>Số dư ví</th><th>Giá 1 lượt</th><th>Thao tác</th></tr></thead><tbody>${accounts.map((user, index) => `<tr><td>${index + 1}</td><td>${esc(user.username)}</td><td>${user.sold_orders}</td><td>${money(user.balance)}</td><td data-ctv-price-cell>${money(user.unit_price)} / lượt</td><td><button type="button" class="button button--small button--outline" data-edit-ctv="${user.id}">Sửa giá 1 lượt</button><button type="button" class="button button--small button--outline" data-wallet-ctv="${user.id}">Số dư</button></td></tr>`).join("")}</tbody></table></div>` : "<p>Chưa có cộng tác viên. Tạo tài khoản đầu tiên bên dưới.</p>";
      const selected = edit.elements.id.value;
      const selectedWallet = wallet.elements.username.value;
      edit.elements.id.innerHTML = accounts.map((user) => `<option value="${user.id}">${esc(user.username)}</option>`).join("");
      wallet.elements.username.innerHTML = accounts.map((user) => `<option value="${esc(user.username)}">${esc(user.username)}</option>`).join("");
      if (accounts.some((user) => String(user.id) === selected)) edit.elements.id.value = selected;
      if (accounts.some((user) => user.username === selectedWallet)) wallet.elements.username.value = selectedWallet;
      if (!create.querySelector('[name="unit_price"]')) create.querySelector('[data-price-fields="create"]').innerHTML = fields();
      fillPrices();
      edit.querySelector('[type="submit"]').disabled = !accounts.length;
      wallet.querySelector('[type="submit"]').disabled = !accounts.length;
      notice.textContent = "";
      panel.querySelectorAll("[data-edit-ctv]").forEach((button) => button.addEventListener("click", () => {
        const account = accounts.find((user) => String(user.id) === button.dataset.editCtv);
        const cell = button.closest("tr").querySelector("[data-ctv-price-cell]");
        if (cell.querySelector("form")) { cell.querySelector("input").focus(); return; }
        cell.innerHTML = `<form class="ctv-inline-price"><label>Giá 1 lượt của ${esc(account.username)} (VNĐ)<input name="unit_price" type="number" min="0" max="100000000" step="1" value="${account.unit_price}" required></label><div><button type="submit" class="button button--small">Lưu giá</button><button type="button" class="button button--small button--outline" data-cancel-price>Huỷ</button></div><p class="form-message" aria-live="polite"></p></form>`;
        const form = cell.querySelector("form");
        form.elements.unit_price.focus();
        form.elements.unit_price.select();
        form.querySelector("[data-cancel-price]").addEventListener("click", () => { cell.textContent = `${money(account.unit_price)} / lượt`; });
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const submit = form.querySelector('[type="submit"]');
          if (submit.disabled) return;
          const price = Number(form.elements.unit_price.value);
          submit.disabled = true;
          form.querySelector("[data-cancel-price]").disabled = true;
          try {
            await api("/api/admin/ctv/prices", { method: "POST", body: JSON.stringify({ id: account.id, unit_price: price }) });
            account.unit_price = price;
            await refresh();
            notice.textContent = `Đã cập nhật giá 1 lượt của ${account.username}: ${money(price)}.`;
            notice.className = "form-message is-success";
          } catch (error) {
            form.querySelector(".form-message").textContent = error.message;
            form.querySelector(".form-message").className = "form-message is-error";
            submit.disabled = false;
            form.querySelector("[data-cancel-price]").disabled = false;
          }
        });
      }));
      panel.querySelectorAll("[data-wallet-ctv]").forEach((button) => button.addEventListener("click", () => { wallet.elements.username.value = accounts.find((user) => String(user.id) === button.dataset.walletCtv).username; wallet.elements.delta.focus(); wallet.scrollIntoView({ behavior: "smooth", block: "center" }); }));
    } catch (error) { notice.textContent = error.message; notice.className = "form-message is-error"; }
    finally { loading = false; }
  };
  const bind = (form, endpoint, body, after = () => {}) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]'); if (button.disabled) return;
    if (form === wallet && !window.confirm(`Xác nhận điều chỉnh ${money(Number(wallet.elements.delta.value))} cho ${wallet.elements.username.value}?`)) return;
    button.disabled = true;
    const message = form.querySelector(".form-message");
    try { const result = await api(endpoint, { method: "POST", body: JSON.stringify(body()) }); after(); message.textContent = result.message; message.className = "form-message is-success"; await refresh(); }
    catch (error) { message.textContent = error.message; message.className = "form-message is-error"; }
    finally { button.disabled = false; }
  });
  bind(create, "/api/admin/ctv", () => ({ username: create.elements.username.value, password: create.elements.password.value, initial_balance: create.elements.initial_balance.value, unit_price: create.elements.unit_price.value }), () => create.reset());
  bind(edit, "/api/admin/ctv/prices", () => ({ id: edit.elements.id.value, unit_price: edit.elements.unit_price.value }));
  bind(wallet, "/api/admin/ctv/balance", () => ({ username: wallet.elements.username.value, delta: wallet.elements.delta.value }), () => { wallet.elements.delta.value = ""; });
  edit.elements.id.addEventListener("change", fillPrices);
  panel.querySelector("#admin-ctv-refresh").addEventListener("click", refresh);
  panel.addEventListener("ctv-refresh", refresh);
  refresh();
}
