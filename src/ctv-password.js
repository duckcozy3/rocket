export function mountCtvPassword(root, api) {
  root.innerHTML = `<form class="ctvp-password"><h2>Đổi mật khẩu</h2><p class="ctvp-muted">Mật khẩu mới cần ít nhất 10 ký tự.</p>
    <label>Mật khẩu hiện tại<input name="current_password" type="password" autocomplete="current-password" required maxlength="1000"></label>
    <label>Mật khẩu mới<input name="new_password" type="password" autocomplete="new-password" required minlength="10" maxlength="1000"></label>
    <label>Nhập lại mật khẩu mới<input name="confirm_password" type="password" autocomplete="new-password" required minlength="10" maxlength="1000"></label>
    <button class="ctvp-primary" type="submit">Lưu mật khẩu mới</button><p class="form-message" aria-live="polite"></p></form>`;
  const form = root.querySelector("form"), message = form.querySelector(".form-message"), button = form.querySelector("button");
  let disposed = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (button.disabled) return;
    const body = Object.fromEntries(new FormData(form));
    message.className = "form-message is-error";
    if (body.new_password !== body.confirm_password) { message.textContent = "Xác nhận mật khẩu không khớp."; return; }
    button.disabled = true; button.textContent = "Đang lưu…"; message.textContent = "";
    try {
      const result = await api("/api/ctv/password", { method: "POST", body: JSON.stringify(body) });
      if (disposed) return;
      form.reset(); message.className = "form-message is-success"; message.textContent = result.message;
    } catch (error) { if (!disposed) message.textContent = error.message; }
    finally { if (!disposed) { button.disabled = false; button.textContent = "Lưu mật khẩu mới"; } }
  });
  return () => { disposed = true; form.reset(); };
}
