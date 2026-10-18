import { normalizeUsername } from "./username.js";

export function addManualUpgradeForm(panel, api) {
  const section = document.createElement("div");
  section.innerHTML = `<hr><h2>Nâng cấp tài khoản thủ công</h2><p>Cấp Locket Gold bằng khóa API NoDNS đang cấu hình. Thao tác sử dụng lượt NoDNS và không tạo đơn thanh toán.</p><form><label>Tên người dùng Locket<input name="username" placeholder="@username" maxlength="65" autocomplete="off" required></label><label>Gói nâng cấp<select name="plan_id" required><option value="ios-month">Tháng — 30 ngày</option><option value="ios-year">Năm — 365 ngày</option><option value="ios-lifetime">Vĩnh viễn</option></select></label><button class="button" type="submit">Nâng cấp tài khoản</button><p class="form-message" role="status" aria-live="polite"></p></form>`;
  panel.append(section);
  const form = section.querySelector("form"), message = section.querySelector(".form-message");
  let busy = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const username = normalizeUsername(form.elements.username.value);
    message.className = "form-message";
    if (!username) { message.textContent = "Nhập tên người dùng Locket hợp lệ."; message.className += " is-error"; return; }
    const plan_id = form.elements.plan_id.value;
    busy = true;
    form.querySelectorAll("input, select, button").forEach((control) => { control.disabled = true; });
    message.textContent = "Đang nâng cấp tài khoản…";
    try {
      const result = await api("/api/admin/provider/upgrade", { method: "POST", body: JSON.stringify({ username, plan_id }) });
      const expiry = result.expiresAt ? new Date(result.expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Vĩnh viễn";
      message.textContent = `${result.message} @${result.username} · ${expiry}.${result.remaining != null ? ` Lượt còn lại: ${result.remaining}.` : ""}`;
      message.className += " is-success";
      form.elements.username.value = "";
      panel.querySelector("#provider-refresh").click();
    } catch (error) { message.textContent = error.message; message.className += " is-error"; }
    finally { busy = false; form.querySelectorAll("input, select, button").forEach((control) => { control.disabled = false; }); }
  });
}
