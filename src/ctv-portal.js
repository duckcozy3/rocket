import { ctvCredits } from "./ctv-pricing.js";
import { mountCtvDeposit } from "./ctv-deposit.js";
import { mountCtvBuyCredits } from "./ctv-buy-credits.js";
import { parsePastedUsername } from "./username.js";
import { orderCreatedLabel } from "./admin-orders.js";

const paths = { crown: 'm3 7 4 4 5-7 5 7 4-4-2 13H5Z', bolt: 'm13 2-9 12h7l-1 8 10-13h-7Z', wallet: 'M3 6h17v15H3ZM3 6V3h14v3M15 12h5v4h-5Z', cart: 'M2 3h3l3 13h11l3-9H6M9 21h1m8 0h1', book: 'M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16', history: 'M3 11a9 9 0 1 1 2 7M3 3v8h8m1-5v6l4 3', key: 'M14 13a6 6 0 1 0-3-3L2 19v3h4v-3h3v-3Z', logout: 'M9 3H3v18h6m6-14 5 5-5 5M8 12h12', refresh: 'M20 7a9 9 0 0 0-15-2L2 8m0-6v6h6m-4 9a9 9 0 0 0 15 2l3-3m0 6v-6h-6', search: 'M21 21l-6-6M17 9a8 8 0 1 1-16 0 8 8 0 0 1 16 0', plane: 'm2 12 20-9-9 19-3-9Z', star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z' };
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"> <path d="${paths[name] || paths.bolt}"/></svg>`;
const nav = [["activate", "bolt", "Kích Hoạt Gold"], ["deposit", "wallet", "Nạp Tiền"], ["credits", "cart", "Mua Lượt"], ["guide", "book", "Hướng Dẫn"], ["history", "history", "Lịch Sử Đơn"], ["settings", "key", "API & Cài Đặt"]];

export function ctvProfileMarkup(profile, requestedUsername, esc) {
  const username = profile.username || requestedUsername;
  const name = profile.full_name || profile.displayName || profile.name || username;
  let avatar = "";
  try {
    const url = new URL(profile.avatar);
    if (url.protocol === "https:") avatar = url.href;
  } catch { /* Use the initial when the account has no valid avatar. */ }
  const initial = `<span class="ctvp-avatar is-complete"${avatar ? " hidden" : ""}>${esc(String(name).slice(0, 1).toUpperCase())}</span>`;
  const photo = avatar ? `<img class="ctvp-avatar ctvp-profile-photo" src="${esc(avatar)}" alt="Avatar ${esc(username)}" referrerpolicy="no-referrer">` : "";
  const hasGold = profile.gold?.has_gold === true;
  return `<div class="ctvp-profile-result">${photo}${initial}<div class="ctvp-profile-details"><strong>${esc(name)}</strong><small>@${esc(username)}</small>${profile.uid ? `<small>UID: ${esc(profile.uid)}</small>` : ""}${hasGold && profile.gold.expiry_date ? `<small>Hết hạn Gold: ${esc(profile.gold.expiry_date)}</small>` : ""}</div><span class="ctvp-badge${hasGold ? " is-complete" : ""}">${hasGold ? "Đang có Gold" : "Chưa có Gold"}</span></div>`;
}

export function ctvPortalMarkup(user, remote, { escapeHtml: esc, money, plans }) {
  const options = plans.filter((plan) => plan.platform === "iOS");
  return `<aside class="ctvp-sidebar"><a class="ctvp-brand" href="/"><span>${icon("crown")}</span><div><strong>Portal CTV</strong><small>Locket Gold · locketgold.info</small></div></a>
    <div class="ctvp-account"><div class="ctvp-identity"><b>${esc((user.username || "C").slice(0, 1).toUpperCase())}</b><div><strong>${esc(user.username)}</strong><small>@${esc(user.username)}</small></div></div><div class="ctvp-mini"><div><small>SỐ DƯ</small><strong data-ctv-balance>${money(user.balance)}</strong></div><div><small>${"LƯỢT"}</small><strong data-ctv-quota>${remote ? Number(user.remaining || 0) : Number(user.available_credits || 0)}</strong></div></div></div>
    <nav aria-label="Cộng tác viên">${nav.map(([id, symbol, title]) => `<button type="button" data-ctv-nav="${id}" class="${id === "activate" ? "is-active" : ""}">${icon(symbol)}${title}</button>`).join("")}</nav><button type="button" class="ctvp-logout" id="ctv-logout">${icon("logout")}Đăng Xuất</button></aside>
    <main class="ctvp-main"><header class="ctvp-top"><h1>${icon("bolt")}<span id="ctv-section-title">Kích Hoạt Gold</span></h1><div><span class="ctvp-pill">${icon("bolt")}<b data-ctv-quota>${remote ? Number(user.remaining || 0) : Number(user.available_credits || 0)}</b> ${"lượt"}</span><span class="ctvp-pill ctvp-pill--gold">${icon("wallet")}<b data-ctv-balance>${money(user.balance)}</b></span></div></header>
    <div class="ctvp-content"><section class="ctvp-metrics" aria-label="Thống kê tài khoản"><article class="ctvp-purple"><span>${"LƯỢT CÒN LẠI"}</span><strong data-ctv-quota>${remote ? Number(user.remaining || 0) : Number(user.available_credits || 0)}</strong></article><article class="ctvp-amber"><span>SỐ DƯ VÍ</span><strong data-ctv-balance>${money(user.balance)}</strong></article><article class="ctvp-green"><span>ĐƠN HOÀN TẤT</span><strong id="ctv-completed">—</strong></article><article class="ctvp-blue"><span>TỔNG ĐƠN</span><strong id="ctv-total">—</strong></article></section>
    <div class="ctvp-columns" data-ctv-panel="activate"><div class="ctvp-left"><section class="ctvp-card"><h2>Kích Hoạt Locket Gold</h2><p class="ctvp-muted">Nhập username hoặc link Locket của khách</p><form id="ctv-order-form"><label class="ctvp-sr" for="ctvp-username">Username hoặc link Locket</label><div class="ctvp-lookup"><div class="ctvp-input"><input id="ctvp-username" name="username" placeholder="Username hoặc locket.cam/…" required maxlength="300" autocomplete="off"><button type="button" id="ctvp-paste">▣ Dán</button></div><button class="ctvp-primary" type="button" id="ctvp-lookup">${icon("search")}Tìm</button></div><div id="ctvp-profile" aria-live="polite"></div><fieldset class="ctvp-packages"><legend>Thời hạn kích hoạt</legend>${options.map((plan, index) => `<label><input type="radio" name="plan_id" value="${esc(plan.id)}" ${index === 0 ? "checked" : ""} required><span><strong>${esc(plan.name.replace(/^Gói /, ""))}</strong><small>${`${ctvCredits(plan.id)} lượt`}</small></span></label>`).join("")}</fieldset><p class="ctvp-muted" id="ctvp-unit-price">${remote ? "" : `Giá 1 lượt: ${money(user.unit_price)} · Mua lượt từ ví, kích hoạt bằng lượt`}</p><button class="ctvp-primary ctvp-upgrade" type="submit">${icon("bolt")}${"Lên Gold"}</button><p class="form-message" aria-live="polite"></p></form></section>
    <section class="ctvp-card ctvp-guide"><h2>${icon("star")}Hướng dẫn</h2><ol><li>Nhập username Locket của khách hoặc dán link hồ sơ.</li><li>Nhấn <b>Tìm</b> để kiểm tra tài khoản.</li><li>Chọn thời hạn và nhấn <b>Lên Gold</b> để kích hoạt.</li></ol><p class="ctvp-muted">${remote ? "Số lượt thực tế được trừ theo cấu hình gói trên NoDNS." : "1 tháng: 1 lượt · 1 năm: 1 lượt · Vĩnh viễn: 2 lượt. Kích hoạt chỉ trừ lượt đã mua, không trừ thêm tiền trong ví."}</p></section></div>
    <section class="ctvp-card ctvp-list"><div class="ctvp-list-head"><h2>Danh Sách Gold <span id="ctvp-list-count"></span></h2><div><input id="ctvp-search" type="search" placeholder="Tìm…" aria-label="Tìm tài khoản hoặc mã đơn"><button type="button" id="ctvp-refresh" aria-label="Làm mới danh sách">${icon("refresh")}</button></div></div><div id="ctv-orders" aria-live="polite"><p class="ctvp-empty">Đang tải danh sách…</p></div></section></div>
    <section class="ctvp-card" data-ctv-panel="secondary" hidden><div id="ctvp-secondary"></div></section></div></main>`;
}

export async function mountCtvPortal(root, user, remote, helpers) {
  const { api, escapeHtml: esc, money, orderStatusLabel, planNameLabel } = helpers;
  root.innerHTML = ctvPortalMarkup(user, remote, helpers);
  document.body.classList.add("ctv-portal-open");
  let orders = [];
  let refreshing = false;
  const form = root.querySelector("#ctv-order-form");
  const message = form.querySelector(".form-message");
  const input = form.elements.username;
  const showMessage = (text, error = false) => { message.textContent = text; message.className = `form-message ${error ? "is-error" : "is-success"}`; };
  const updateAccount = (account) => {
    root.querySelectorAll("[data-ctv-balance]").forEach((el) => { el.textContent = money(account.balance); });
    root.querySelectorAll("[data-ctv-quota]").forEach((el) => { el.textContent = remote ? Number(account.remaining || 0) : Number(account.available_credits || 0); });
    if (!remote) root.querySelector("#ctvp-unit-price").textContent = `Giá 1 lượt: ${money(account.unit_price)} · Mua lượt từ ví, kích hoạt bằng lượt`;
    if (!remote && account.plans) {
      root.querySelectorAll('[name="plan_id"]').forEach((radio) => {
        const plan = account.plans.find((item) => item.id === radio.value);
        radio.disabled = !plan;
        if (plan) radio.closest("label").querySelector("small").textContent = `${ctvCredits(plan.id)} lượt`;
      });
    }
  };
  const isCompleted = (order) => ["completed", "success", "active"].includes(order.status);
  const statusLabel = (order) => remote && order.status === "pending" ? "Chờ kích hoạt" : order.status === "active" ? "Đang hoạt động" : orderStatusLabel(order.status);
  const drawOrders = () => {
    const term = root.querySelector("#ctvp-search").value.toLowerCase().trim();
    const filtered = orders.filter((order) => `${order.username} ${order.code}`.toLowerCase().includes(term));
    root.querySelector("#ctvp-list-count").textContent = `(${orders.length})`;
    root.querySelector("#ctv-total").textContent = remote ? orders.length : Number(user.order_count || orders.length);
    root.querySelector("#ctv-completed").textContent = remote ? orders.filter(isCompleted).length : Number(user.completed_count || 0);
    root.querySelector("#ctv-orders").innerHTML = filtered.length ? filtered.map((order) => `<article class="ctvp-order"><span class="ctvp-avatar ${isCompleted(order) ? "is-complete" : ""}">${esc(String(order.username || "?").slice(0, 1).toUpperCase())}</span><div class="ctvp-order-info"><div><strong>${esc(order.username)}</strong><small>@${esc(order.username)}</small><span class="ctvp-badge ${isCompleted(order) ? "is-complete" : ""}">${esc(statusLabel(order))}</span></div><p>${order.created_at ? esc(orderCreatedLabel(order.created_at)) : esc(order.code)} <span>· ${esc(planNameLabel(order.plan_name))}</span></p></div>${remote ? `<a class="ctvp-manage" href="https://ctv.nodns.vn" target="_blank" rel="noopener">Quản lý ↗</a>` : ""}</article>`).join("") : `<p class="ctvp-empty">${orders.length ? "Không tìm thấy tài khoản phù hợp." : "Chưa có đơn nào."}</p>`;
  };
  const refresh = async () => {
    if (refreshing) return;
    refreshing = true;
    const button = root.querySelector("#ctvp-refresh"); button.disabled = true;
    try {
      const [history, account] = await Promise.all([api("/api/ctv/orders"), api("/api/ctv/me")]);
      orders = history.orders || []; user = account.user; updateAccount(user); drawOrders();
    } catch (error) { root.querySelector("#ctv-orders").innerHTML = `<p class="ctvp-empty">${esc(error.message)}</p>`; }
    finally { refreshing = false; button.disabled = false; }
  };
  root.querySelector("#ctvp-refresh").addEventListener("click", refresh);
  root.querySelector("#ctvp-search").addEventListener("input", drawOrders);
  root.querySelector("#ctv-logout").addEventListener("click", async () => { try { await api("/api/ctv/logout", { method: "POST" }); location.reload(); } catch (error) { showMessage(error.message, true); } });
  root.querySelector("#ctvp-paste").addEventListener("click", async () => { try { input.value = await navigator.clipboard.readText(); input.dispatchEvent(new Event("input")); input.focus(); } catch { showMessage("Hãy dán username vào ô nhập bằng Ctrl + V.", true); input.focus(); } });
  let lookupTimer;
  let lookupVersion = 0;
  let lastProfileUsername = "";
  const lookupProfile = async (manual = false) => {
    const username = parsePastedUsername(input.value);
    if (!username) { if (manual) showMessage("Nhập username hoặc link hồ sơ Locket hợp lệ.", true); return; }
    if (!manual && username === lastProfileUsername) return;
    const version = ++lookupVersion;
    const button = root.querySelector("#ctvp-lookup"); button.disabled = true;
    const target = root.querySelector("#ctvp-profile");
    target.textContent = "Đang lấy thông tin Locket…";
    try {
      const result = await api(`/api/locket/userinfo?user=${encodeURIComponent(username)}`);
      if (version !== lookupVersion || parsePastedUsername(input.value) !== username) return;
      const profile = result.user || result.data || result;
      target.innerHTML = ctvProfileMarkup(profile, username, esc);
      target.querySelector("img")?.addEventListener("error", (event) => {
        if (!target.contains(event.currentTarget)) return;
        event.currentTarget.hidden = true;
        target.querySelector(".ctvp-avatar:not(img)").hidden = false;
      }, { once: true });
      lastProfileUsername = username;
      showMessage("Đã tìm thấy tài khoản. Chọn gói để cấp Gold.");
    } catch (error) { if (version === lookupVersion) { target.replaceChildren(); showMessage(error.message, true); } }
    finally { if (version === lookupVersion) button.disabled = false; }
  };
  input.addEventListener("input", () => {
    window.clearTimeout(lookupTimer);
    ++lookupVersion;
    lastProfileUsername = "";
    root.querySelector("#ctvp-profile").replaceChildren();
    root.querySelector("#ctvp-lookup").disabled = false;
    message.textContent = "";
    lookupTimer = window.setTimeout(() => lookupProfile(), 800);
  });
  root.querySelector("#ctvp-lookup").addEventListener("click", () => { window.clearTimeout(lookupTimer); lookupProfile(true); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = parsePastedUsername(input.value);
    if (!username) return showMessage("Username hoặc link hồ sơ không hợp lệ.", true);
    const button = form.querySelector('[type="submit"]'); if (button.disabled) return;
    const planId = new FormData(form).get("plan_id");
    if (!window.confirm(`Xác nhận cấp Gold cho @${username} với gói đã chọn? ${remote ? "Tài khoản sẽ bị trừ lượt theo gói." : `Sẽ trừ ${ctvCredits(planId)} lượt đã mua, không trừ thêm tiền trong ví.`}`)) return;
    button.disabled = true;
    try { const result = await api("/api/ctv/orders", { method: "POST", body: JSON.stringify({ username, plan_id: planId }) }); showMessage(`${result.message || "Đã gửi yêu cầu."} ${result.code ? `Mã: ${result.code}` : ""}`); await refresh(); }
    catch (error) { showMessage(error.message, true); }
    finally { button.disabled = false; }
  });
  let disposeDeposit;
  const activatePanel = (id) => {
    disposeDeposit?.();
    disposeDeposit = null;
    root.querySelectorAll("[data-ctv-nav]").forEach((button) => { const selected = button.dataset.ctvNav === id; button.classList.toggle("is-active", selected); button.setAttribute("aria-current", selected ? "page" : "false"); });
    root.querySelector("#ctv-section-title").textContent = nav.find(([key]) => key === id)?.[2] || "Kích Hoạt Gold";
    const primary = id === "activate" || id === "history";
    root.querySelector('[data-ctv-panel="activate"]').hidden = !primary;
    root.querySelector(".ctvp-left").hidden = id === "history";
    root.querySelector(".ctvp-columns").classList.toggle("is-history", id === "history");
    root.querySelector('[data-ctv-panel="secondary"]').hidden = primary;
    const isBuy = !remote && id === "credits";
    const isDeposit = !remote && id === "deposit";
    root.querySelector(".ctvp-metrics").hidden = isDeposit || isBuy;
    root.querySelector('[data-ctv-panel="secondary"]').className = isDeposit || isBuy ? "ctvp-topup-host" : "ctvp-card";
    if (isBuy) {
      disposeDeposit = mountCtvBuyCredits(root.querySelector("#ctvp-secondary"), user, { api, money, escapeHtml: esc }, refresh, () => activatePanel("deposit"));
      return;
    }
    if (isDeposit) {
      disposeDeposit = mountCtvDeposit(root.querySelector("#ctvp-secondary"), user, { api, escapeHtml: esc, money }, refresh);
      return;
    }
    if (id === "history") refresh();
    const titles = { deposit: "Nạp tiền vào ví", credits: "Mua lượt kích hoạt", guide: "Hướng dẫn cộng tác viên", settings: "Tài khoản & cài đặt" };
    root.querySelector("#ctvp-secondary").innerHTML = id === "guide" ? `<h2>Hướng dẫn cộng tác viên</h2><ol><li>Dán username hoặc link hồ sơ Locket của khách.</li><li>Nhấn Tìm để kiểm tra thông tin.</li><li>Chọn thời hạn, nhấn Lên Gold và xác nhận.</li><li>Nhấn làm mới danh sách để kiểm tra trạng thái.</li></ol><a class="ctvp-link" href="/huong-dan/">Xem hướng dẫn sử dụng ↗</a>` : `<h2>${titles[id] || "Tài khoản"}</h2><p class="ctvp-muted">${id === "settings" ? `Đăng nhập với tài khoản @${esc(user.username)}. Quản lý API và tài khoản tại cổng NoDNS.` : remote ? "Nạp tiền và mua lượt cho tài khoản của bạn tại cổng NoDNS, sau đó quay lại làm mới số dư." : "Liên hệ quản trị viên để nạp số dư tài khoản cộng tác viên."}</p>${remote ? '<a class="ctvp-primary ctvp-link" href="https://ctv.nodns.vn" target="_blank" rel="noopener">Mở cổng NoDNS ↗</a>' : '<a class="ctvp-primary ctvp-link" href="/lien-he/">Liên hệ hỗ trợ ↗</a>'}<button class="ctvp-manage" type="button" id="ctvp-account-refresh">Làm mới tài khoản</button>`;
    root.querySelector("#ctvp-account-refresh")?.addEventListener("click", refresh);
  };
  root.querySelectorAll("[data-ctv-nav]").forEach((button) => button.addEventListener("click", () => activatePanel(button.dataset.ctvNav)));
  await refresh();
}
