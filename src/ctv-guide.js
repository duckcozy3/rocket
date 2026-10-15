const step = (number, title, body, tone = "purple") => `<section class="ctvp-help-step"><span class="ctvp-help-number is-${tone}">${number}</span><div><h3>${title}</h3>${body}</div></section>`;

export function ctvGuideMarkup() {
  return `<div class="ctvp-columns ctvp-help-columns"><section class="ctvp-card ctvp-help-card"><h2><span class="ctvp-help-symbol">ϟ</span> Quy Trình Kích Hoạt Gold</h2>
    ${step(1, "Khách cài DNS trước", "<p>Hướng dẫn khách cài hồ sơ DNS theo các bước ở cột bên phải, sau đó kiểm tra lại cấu hình trên iPhone.</p>", "blue")}
    ${step(2, "Khách gửi username Locket", "<p>Khách cung cấp username hoặc link hồ sơ Locket. Không cần gửi mật khẩu tài khoản Locket.</p>")}
    ${step(3, "CTV tra cứu tài khoản", '<p>Vào mục <b>Kích Hoạt Gold</b>, nhập username hoặc dán link hồ sơ và nhấn <b>Tìm</b>. Đối chiếu avatar, tên và UID của khách từ kết quả tra cứu.</p>')}
    ${step(4, "Kiểm tra trạng thái", "<p>Xem tài khoản đã có Gold hay chưa và thời hạn hiển thị. Xác nhận đúng tài khoản và gói trước khi gửi yêu cầu kích hoạt.</p>")}
    ${step(5, 'Nhấn “Lên Gold”', '<p>Chọn thời hạn rồi xác nhận kích hoạt. Gói <b>1 tháng: 1 lượt</b>, <b>1 năm: 1 lượt</b>, <b>vĩnh viễn: 2 lượt</b>. Nếu thiếu lượt, nạp tiền vào ví rồi vào <b>Mua Lượt</b>.</p>', "amber")}
    ${step(6, "Khách mở lại app Locket", '<p>Chờ đơn báo <b>Hoàn tất</b>, đóng hoàn toàn ứng dụng Locket rồi mở lại để kiểm tra.</p>', "green")}
    <div class="ctvp-help-alert">✕ Nếu khách chưa thấy thay đổi: kiểm tra trạng thái đơn, username và hồ sơ DNS đã cài; liên hệ hỗ trợ kèm mã đơn nếu vẫn gặp lỗi.</div></section>
    <section class="ctvp-card ctvp-help-card"><header class="ctvp-help-heading"><span>▯</span><div><h2>Hướng Dẫn Cài DNS cho iPhone</h2><p>Cài đặt hồ sơ và kiểm tra cấu hình trên thiết bị</p></div></header>
    ${step(1, "Tải file DNS về máy", '<div class="ctvp-help-download"><small>LINK TẢI (MỞ BẰNG SAFARI)</small><div><a data-guide-dns href="https://ctv.nodns.vn/cai-dns" target="_blank" rel="noopener">https://ctv.nodns.vn/cai-dns</a><button type="button" data-guide-copy aria-label="Sao chép link tải DNS">▣ Sao chép</button></div></div><div class="ctvp-help-warning">⚠ Mở link bằng Safari trên iPhone để tải hồ sơ cấu hình.</div><p>Khi iPhone hỏi cho phép tải hồ sơ, chọn <b>Cho phép</b>. Sau khi tải, mở Cài đặt để cài hồ sơ.</p>')}
    ${step(2, "Cài đặt Profile trong Cài đặt", '<ol class="ctvp-help-substeps"><li><code>Cài đặt</code> Mở ứng dụng Cài đặt trên iPhone.</li><li><code>Đã tải về hồ sơ</code> Nhấn vào hồ sơ vừa tải. Hoặc vào Cài đặt chung → VPN &amp; Quản lý thiết bị.</li><li><code>Chọn hồ sơ LocketGold</code> Kiểm tra tên và thông tin của hồ sơ đã tải.</li><li><code>Cài đặt</code> Nhấn Cài đặt ở góc trên bên phải.</li><li><code>Xác nhận</code> Nhập mật mã iPhone trên thiết bị khi được yêu cầu và xác nhận cài đặt.</li></ol>')}
    ${step(3, "Bật tin cậy chứng chỉ (SSL) nếu hồ sơ có yêu cầu", '<ol class="ctvp-help-substeps is-amber"><li><code>Cài đặt chung → Giới thiệu</code> Mở phần Giới thiệu trên iPhone.</li><li><code>Cài đặt tin cậy chứng chỉ</code> Cuộn xuống và mở mục này.</li><li><code>Chọn đúng chứng chỉ vừa cài</code> Bật tin cậy hoàn toàn cho chứng chỉ của hồ sơ.</li><li><code>Tiếp tục</code> Đọc thông báo trên iPhone và xác nhận nếu đồng ý.</li></ol><div class="ctvp-help-alert">Mục tin cậy chỉ xuất hiện khi có chứng chỉ phù hợp được cài. Chỉ bật cho đúng chứng chỉ mà bạn đã kiểm tra và đồng ý tin cậy.</div>', "amber")}
    ${step(4, "Mở lại Locket và kiểm tra", '<p>Đóng hoàn toàn Locket rồi mở lại. Kiểm tra hồ sơ tài khoản và các tính năng sau khi đơn kích hoạt đã hoàn tất.</p><div class="ctvp-help-results"><span>✓ Đã hoạt động: hoàn tất hướng dẫn cho khách</span><span>✕ Chưa hoạt động: kiểm tra cấu hình và trạng thái đơn</span></div>', "green")}
    <p class="ctvp-help-copy-status" data-guide-status role="status"></p><p class="ctvp-help-sources">Tham khảo Apple: <a href="https://support.apple.com/102400" target="_blank" rel="noopener">cài đặt hồ sơ</a> · <a href="https://support.apple.com/102390" target="_blank" rel="noopener">tin cậy chứng chỉ</a>.</p></section></div>`;
}

export function mountCtvGuide(root, api) {
  root.innerHTML = ctvGuideMarkup();
  let disposed = false;
  const link = root.querySelector("[data-guide-dns]");
  const status = root.querySelector("[data-guide-status]");
  api("/api/public-config").then((config) => {
    if (disposed || !config.dns_url) return;
    try {
      const url = new URL(config.dns_url);
      if (url.protocol !== "https:") return;
      link.href = url.href; link.textContent = url.href;
    } catch { /* Keep the configured default link. */ }
  }).catch(() => {});
  root.querySelector("[data-guide-copy]").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(link.href); if (!disposed) status.textContent = "Đã sao chép link. Mở Safari trên iPhone và dán vào thanh địa chỉ."; }
    catch { if (!disposed) status.textContent = `Sao chép đường dẫn này: ${link.href}`; }
  });
  return () => { disposed = true; };
}
