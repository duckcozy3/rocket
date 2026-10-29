# Spotify trên Locket Gold

Trang khách hàng: `/spotify/`. Quản lý mã tại `/quan-tri-locket/#spotify-promos`.

Trước khi triển khai, áp dụng các migration D1 còn thiếu (bao gồm `0014_spotify_promos.sql`):

```sh
npx wrangler d1 migrations apply locketgold-db --remote
npm run deploy
```

Worker dùng khóa `NODNS_API_KEY` hoặc khóa NoDNS được lưu trong admin. Khóa chỉ được gửi từ máy chủ trong header `x-api-key`. Cấu hình nhận tiền dùng chung với Locket: `SEPAY_WEBHOOK_API_KEY`, `BANK_NAME`, `BANK_BIN`, `BANK_ACCOUNT`, `BANK_ACCOUNT_NAME`. Có thể đổi link profile iOS bằng `SPOTIFY_PROFILE_URL`.

- Tài khoản được tra cứu tự động sau 600 ms ngừng gõ; thay đổi nội dung sẽ hủy kết quả cũ.
- Chấp nhận Username/UID, URI `spotify:user:...` hoặc link hồ sơ Spotify. Link bài hát, playlist và email không hợp lệ.
- Mã giảm giá Spotify nằm trong bảng riêng, không áp dụng cho đơn Locket. Admin có thể tạo, cập nhật, hủy mã và xem số đơn đã thanh toán cùng tổng tiền đã giảm.
- Máy chủ kiểm tra lại tài khoản và tính số tiền khi tạo đơn. Giá không lấy từ trình duyệt.
- Đơn Spotify dùng mã thanh toán LG và webhook SePay hiện có. Yêu cầu kích hoạt được gửi sau khi đơn chuyển sang đã thanh toán; mã giảm 100% không yêu cầu chuyển khoản.
- Nếu nhà cung cấp lỗi hoặc kết quả không chắc chắn, đơn giữ trạng thái đã thanh toán để admin đối soát, không tự gửi lại yêu cầu kích hoạt.
- Danh sách đơn trên trang Spotify được lưu trong trình duyệt, không phải danh sách toàn bộ tài khoản tại nhà cung cấp.

Kiểm thử `tests/spotify.test.js` dùng D1 cục bộ và API giả lập, không kích hoạt tài khoản thật.
