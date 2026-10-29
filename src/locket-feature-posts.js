const captureSource = "https://help.locket.com/en/articles/7915017-how-do-i-capture-video-on-locket";
const safetySource = "https://help.locket.com/en/articles/14187240-how-does-locket-keep-the-platform-safe";
const privacySource = "https://help.locket.com/en/articles/14188121-how-does-locket-use-my-photos-and-videos";
const p = (text) => ({ tag: "p", children: [text] });
const h2 = (text) => ({ tag: "h2", children: [text] });
const list = (...items) => ({ tag: "ol", children: items.map((text) => ({ tag: "li", children: [text] })) });
const link = (href, text) => ({ tag: "a", attrs: { href }, children: [text] });
const related = (slug, text) => ({ tag: "p", children: ["Đọc tiếp: ", link(`/bai-viet/?bai=${slug}`, text)] });
function article(slug, title, excerpt, blocks, sources) {
  const content_blocks = [...blocks, h2("Nguồn tham khảo"), ...sources.map(([href, label]) => ({ tag: "p", children: [link(href, label)] }))];
  const text = (node) => typeof node === "string" ? node : (node.children || []).map(text).join(" ");
  return { slug, title, excerpt, category: "Hướng dẫn Locket", published_at: "2026-10-29", content: content_blocks.map(text).join("\n"), content_blocks };
}

export const LOCKET_FEATURE_POSTS = [
  article("locket-60s-quay-video-60-giay", "Locket 60s: cách kiểm tra khả năng quay video 60 giây", "Tìm hiểu từ khóa Locket 60s, kiểm tra giới hạn video trên tài khoản và những điều cần xác nhận trước khi nâng cấp.", [
    h2("Locket 60s là gì?"),
    p("Locket 60s thường được dùng khi người dùng tìm cách gửi video dài một phút. Tuy nhiên, hướng dẫn quay video của Locket được kiểm tra ngày 29/10/2026 không nêu mức thời lượng 60 giây. Vì vậy, không nên xem cụm từ này là cam kết rằng mọi tài khoản đều quay được một phút, hoặc chỉ cần mua Gold là chắc chắn mở được giới hạn đó."),
    h2("Kiểm tra trực tiếp trước khi mua gói"),
    list("Cập nhật Locket từ kho ứng dụng chính thức và mở đúng tài khoản cần sử dụng.", "Mở camera, quay một đoạn thử và quan sát bộ đếm thời gian hoặc thông báo giới hạn trong ứng dụng.", "Đọc màn hình quyền lợi của gói đang hiển thị trên tài khoản. Nếu có thời lượng video cụ thể, lưu lại để đối chiếu.", "Gửi thử cho một người bạn và nhờ họ mở trong ứng dụng để kiểm tra đoạn video thực tế."),
    h2("Nếu video dừng trước 60 giây"),
    p("Ghi lại thời điểm video dừng, phiên bản Locket, hệ điều hành và thông báo xuất hiện. Đây là thông tin hữu ích khi hỏi hỗ trợ về giới hạn đang áp dụng. Nếu màn hình gói không nói rõ thời lượng, hãy yêu cầu xác nhận trước khi thanh toán thay vì suy luận từ quảng cáo hoặc video hướng dẫn cũ."),
    h2("Có thể cắt video dài để gửi không?"),
    p("Nếu ứng dụng của bạn không cho gửi một đoạn dài như mong muốn, có thể quay thành những đoạn ngắn riêng biệt trong giới hạn đang có. Không có cơ sở để hứa rằng đổi DNS, cài cấu hình hoặc đăng nhập lại sẽ tự mở mốc 60 giây."),
    related("cach-quay-video-locket-iphone-android", "Cách quay video Locket trên iPhone và Android"),
  ], [[captureSource, "Locket Help Center: hướng dẫn quay video"]]),
  article("locket-up-video-co-am-thanh", "Locket up video có âm thanh: cách kiểm tra trước khi gửi", "Hướng dẫn kiểm tra tiếng khi quay và gửi video Locket, phân biệt lỗi thu âm với lỗi phát lại trên điện thoại người nhận.", [
    h2("Quay được hình chưa đồng nghĩa đã thu được tiếng"),
    p("Khi tìm “Locket up video có âm thanh”, bạn có thể đang gặp hai tình huống khác nhau: video không ghi được tiếng ngay từ lúc quay, hoặc video có tiếng nhưng đang phát ở trạng thái tắt âm. Hãy kiểm tra riêng từng bước để tránh đổi cài đặt không liên quan."),
    h2("Chuẩn bị một đoạn kiểm tra ngắn"),
    list("Chọn chỗ yên tĩnh và quay một câu nói ngắn dễ nhận biết. Tránh dùng nhạc nền khi đang xác định lỗi.", "Trong cài đặt điện thoại, tìm quyền micro của Locket nếu quyền này được ứng dụng yêu cầu. Tên mục có thể khác giữa các thiết bị.", "Nếu ứng dụng có màn hình xem trước hoặc lịch sử cho phép phát video, mở video ở đó và tăng âm lượng phương tiện.", "Gửi cho một người bạn, yêu cầu họ mở video bên trong Locket và kiểm tra nút âm thanh nếu giao diện có hiển thị."),
    h2("Đối chiếu kết quả ở hai máy"),
    p("Nếu bạn nghe được nhưng người nhận không nghe được, hãy kiểm tra âm lượng và thiết bị phát âm thanh phía người nhận trước. Nếu cả hai đều không nghe được, thử một bản quay mới sau khi kiểm tra micro. Không nên kết luận rằng mua gói khác sẽ xử lý được tiếng khi chưa biết lỗi nằm ở đâu."),
    h2("Thử lại khi dùng tai nghe"),
    p("Nếu đang kết nối tai nghe Bluetooth, hãy thử ngắt kết nối và quay lại một đoạn mới. So sánh bản có tai nghe và bản dùng micro điện thoại giúp khoanh vùng vấn đề. Đây là bước chẩn đoán, không phải cam kết Locket hỗ trợ mọi loại micro hay mọi chế độ thu âm."),
    related("video-locket-khong-co-tieng", "Video Locket không có tiếng: quy trình tìm lỗi"),
  ], [[captureSource, "Locket Help Center: thao tác quay và gửi video"]]),
  article("video-locket-khong-co-tieng", "Video Locket không có tiếng: kiểm tra micro, âm lượng và Bluetooth", "Các bước khoanh vùng lỗi video Locket bị mất âm thanh trên iPhone và Android, kèm thông tin cần gửi khi liên hệ hỗ trợ.", [
    h2("Bắt đầu từ một video mới"),
    p("Không thể dùng một video cũ bị mất tiếng để xác nhận rằng micro vừa hoạt động trở lại. Sau mỗi thay đổi, hãy quay một đoạn thử mới. Giữ các điều kiện tương tự nhau để biết thay đổi nào thực sự tạo ra khác biệt."),
    h2("Kiểm tra theo thứ tự"),
    list("Tăng âm lượng phương tiện trong khi video đang phát. Kiểm tra nút loa hoặc tắt tiếng nếu màn hình phát có nút này.", "Kiểm tra âm thanh có đang chuyển tới tai nghe hoặc loa Bluetooth không. Thử phát qua loa điện thoại.", "Xem quyền micro trong phần cài đặt ứng dụng. Nếu không thấy mục này, ghi lại thay vì bật các quyền không liên quan.", "Dùng camera hoặc ứng dụng ghi âm của điện thoại để ghi một câu nói. Nếu bản thử đó cũng im lặng, cần kiểm tra thiết bị thu âm trước.", "Đóng rồi mở lại Locket, cập nhật ứng dụng và quay lại đoạn thử. Nhờ một người nhận khác kiểm tra để đối chiếu."),
    h2("Khi nào nên gửi yêu cầu hỗ trợ?"),
    p("Nếu ứng dụng khác thu âm bình thường nhưng nhiều bản quay mới trong Locket đều không có tiếng, hãy gửi phiên bản ứng dụng, mẫu máy, hệ điều hành và thời điểm thử. Nói rõ bạn mất tiếng lúc xem trước, xem lịch sử hay chỉ ở máy người nhận. Không cần gửi video riêng tư; một đoạn kiểm tra không chứa thông tin cá nhân thường dễ chia sẻ hơn."),
    h2("Tránh xóa dữ liệu ngay từ đầu"),
    p("Trước khi gỡ ứng dụng hoặc xóa dữ liệu, hãy kiểm tra cách đăng nhập lại và lưu thông tin cần thiết. Những thao tác này không nên là bước đầu tiên khi vẫn chưa xác định được lỗi thu âm hay lỗi phát âm thanh."),
    related("locket-up-video-co-am-thanh", "Kiểm tra video có âm thanh trước khi gửi"),
  ], [[captureSource, "Locket Help Center: quay video và hỗ trợ khi gặp lỗi"]]),
  article("locket-ai-la-gi", "Locket AI là gì? Phân biệt AI kiểm duyệt và công cụ tạo ảnh", "Giải thích thông tin đã được Locket xác nhận về AI, cách kiểm tra tính năng mới và tránh nhầm công cụ bên ngoài với ứng dụng chính thức.", [
    h2("Locket đã xác nhận dùng AI vào việc gì?"),
    p("Theo trang an toàn của Locket, hệ thống sử dụng AI để kiểm tra nội dung được gửi trên nền tảng; nội dung có dấu hiệu vi phạm có thể được chuyển sang người kiểm duyệt. Đây là ứng dụng AI cho an toàn nội dung, không phải bằng chứng rằng tài khoản có sẵn công cụ tạo ảnh hoặc tạo video bằng câu lệnh."),
    h2("Có tính năng tạo ảnh mang tên Locket AI không?"),
    p("Trong những tài liệu chính thức được dẫn ở cuối bài và kiểm tra ngày 29/10/2026, chưa có xác nhận về một tính năng tạo ảnh có tên “Locket AI”. Nếu bạn thấy tên này trên mạng, hãy xem đó là tên gọi cần kiểm chứng. Cần biết tính năng nằm trong ứng dụng nào, nhà phát hành là ai và tài khoản của bạn có nhìn thấy nó hay không."),
    h2("Kiểm tra lời giới thiệu tính năng mới"),
    list("Xem tên nhà phát hành và ghi chú cập nhật trên trang tải Locket chính thức.", "Tìm tính năng ngay trong ứng dụng của bạn; đối chiếu giao diện với hướng dẫn, phiên bản và thiết bị được nhắc tới.", "Nếu có phí, đọc rõ quyền lợi cụ thể trước khi mua. Không mặc định Gold bao gồm mọi tính năng có chữ AI.", "Với công cụ tạo ảnh bên ngoài, đọc thông tin xử lý ảnh và tài khoản trước khi tải ảnh cá nhân lên."),
    h2("Ảnh và video được xử lý ra sao?"),
    p("Locket cho biết nội dung được dùng để gửi tới bạn bè và lưu trong lịch sử chung; hãng cũng mô tả quyền xóa nội dung và chính sách xử lý dữ liệu. Công cụ bên ngoài có chính sách riêng, vì vậy không thể lấy chính sách của Locket để suy ra cách công cụ đó sử dụng ảnh."),
    related("locket-khong-co-tinh-nang-video", "Cách kiểm tra khi tài khoản chưa có tính năng mới"),
  ], [[safetySource, "Locket Help Center: AI và an toàn nền tảng"], [privacySource, "Locket Help Center: cách sử dụng ảnh và video"]]),
  article("cach-quay-video-locket-iphone-android", "Cách quay video Locket trên iPhone và Android", "Thao tác quay video Locket theo hướng dẫn chính thức, cùng cách kiểm tra bản quay trước khi gửi cho bạn bè.", [
    h2("Quay video trên iPhone và iPad"),
    p("Hướng dẫn chính thức của Locket yêu cầu mở camera, chạm và giữ nút chụp để bắt đầu quay. Viền màu vàng cho biết máy đang ghi hình. Thả tay để dừng, sau đó gửi đoạn quay cho bạn bè."),
    h2("Quay video trên Android"),
    p("Trên Android, mở camera Locket rồi dùng nút chuyển sang chế độ video. Chạm nút chụp để bắt đầu và nút dừng để kết thúc. Kiểm tra đoạn quay trước khi gửi nếu phiên bản của bạn có màn hình xem trước."),
    h2("Thực hành bằng một cảnh đơn giản"),
    p("Lần đầu sử dụng, bạn nên quay một đồ vật đứng yên hoặc một cảnh ngắn trong điều kiện đủ sáng. Việc này giúp bạn làm quen với nút bắt đầu, nút dừng và cách chọn người nhận. Đừng dùng ngay một khoảnh khắc không thể quay lại để thử thao tác mới."),
    h2("Video Locket khác video recap thế nào?"),
    p("Video quay trực tiếp ghi lại cảnh tại thời điểm bạn bấm quay. Video recap là dạng tổng hợp những khoảnh khắc đã chia sẻ; Locket có mô tả khả năng dùng ảnh và video để tạo các bản ghép kỷ niệm. Hai kiểu nội dung này có thể có cách tạo và màn hình xem khác nhau, nên hãy xác định đúng loại video khi tìm hướng dẫn."),
    h2("Kiểm tra thời lượng và âm thanh riêng"),
    p("Quay được video không tự xác nhận thời lượng tối đa hay cách phát tiếng trên mọi thiết bị. Hãy kiểm tra bộ đếm trên tài khoản và gửi một đoạn thử cho bạn bè. Nếu cần dùng video dài hoặc có lời nói, xác nhận cả thời lượng lẫn âm thanh trước khi quay nội dung chính."),
    related("locket-60s-quay-video-60-giay", "Locket 60s và cách xác nhận giới hạn thời lượng"),
    related("locket-up-video-co-am-thanh", "Cách kiểm tra âm thanh khi gửi video"),
  ], [[captureSource, "Locket Help Center: quay video trên iOS và Android"], [privacySource, "Locket Help Center: ảnh, video và bản ghép kỷ niệm"]]),
  article("locket-khong-co-tinh-nang-video", "Locket không có tính năng video: nên kiểm tra những gì?", "Cách xác định nguyên nhân khi không tìm thấy nút quay video, giao diện khác hướng dẫn hoặc chưa thấy quyền lợi sau khi nâng cấp.", [
    h2("Đối chiếu đúng nền tảng"),
    p("Nếu bạn không thấy nút video giống một video hướng dẫn trên mạng, hãy kiểm tra xem hướng dẫn dành cho iPhone hay Android. Tài liệu Locket mô tả thao tác giữ nút chụp trên iOS và chuyển chế độ video trên Android. Tìm một nút riêng theo hướng dẫn Android khi đang dùng iPhone có thể khiến bạn tưởng rằng tính năng bị thiếu."),
    h2("Ghi lại trạng thái trước khi thay đổi"),
    list("Xem phiên bản Locket và phiên bản hệ điều hành đang sử dụng.", "Mở trang ứng dụng trong kho chính thức để kiểm tra có bản cập nhật hay không.", "Xác nhận đã đăng nhập đúng tài khoản; nếu vừa nâng cấp, đối chiếu tài khoản trong đơn với tài khoản đang mở.", "Chụp lại màn hình camera và thông báo xuất hiện khi thử quay. Che thông tin cá nhân trước khi gửi hỗ trợ."),
    h2("Khi quyền lợi gói không khớp kỳ vọng"),
    p("Đọc lại nội dung quyền lợi đã được xác nhận lúc mua. Phân biệt “có thể quay video”, “video dài hơn” và một giới hạn cụ thể như 60 giây: đây là các mô tả khác nhau. Nếu thông tin chưa rõ, gửi mã đơn và câu hỏi cụ thể cho nơi hỗ trợ; không tiếp tục mua thêm gói chỉ để thử xem nút có xuất hiện hay không."),
    h2("Nếu quay được nhưng không gửi được"),
    p("Hãy thử một đoạn ngắn mới trên kết nối mạng ổn định và ghi lại thông báo lỗi. Nếu đoạn ngắn gửi được, so sánh với đoạn bị lỗi về thời lượng và thời điểm quay. Nếu mọi đoạn đều thất bại, thông tin kết nối và phiên bản ứng dụng sẽ hữu ích hơn một mô tả chung như “Locket bị lỗi”."),
    related("cach-quay-video-locket-iphone-android", "Thao tác quay video theo từng nền tảng"),
    related("locket-ai-la-gi", "Locket AI và cách kiểm chứng lời giới thiệu tính năng"),
  ], [[captureSource, "Locket Help Center: hướng dẫn video cho từng nền tảng"]]),
];
