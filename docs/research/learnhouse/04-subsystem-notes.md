# LearnHouse — Ghi chú thiết kế các hệ con đáng học hỏi

> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md) trước. Đây là ghi chú về **nguyên lý thiết kế**, không phải mô tả API hay cấu trúc file cụ thể để copy.

## 1. Assignment / grading engine

Điểm hay nhất: **tách rõ "chấm tự động" khỏi "quyết định cuối cùng"**. Mỗi bài nộp có một cờ boolean đơn giản đánh dấu "người chấm đã can thiệp tay chưa". Khi hệ thống chấm lại tự động (ví dụ do đề bài được sửa), nó luôn bỏ qua các bài đã có cờ này — tránh việc một script chấm lại vô tình ghi đè quyết định thủ công của giáo viên. Ràng buộc duy nhất ở tầng DB (một người dùng chỉ có một bản ghi nộp bài cho một task/assignment) triệt tiêu race condition khi học viên bấm nộp nhiều lần liên tiếp — không cần khóa ứng dụng phức tạp, DB tự chặn.

Điểm bảo mật quan trọng nhất: đáp án đúng chỉ được đưa vào response khi **cả hai điều kiện** đúng cùng lúc — đề bài cho phép hiển thị đáp án, VÀ bài nộp của chính người đang xem đã ở trạng thái đã chấm. Lọc này nên nằm ở tầng gần dữ liệu nhất (repository/service), không nằm ở tầng UI — vì UI dễ bị bỏ qua khi gọi API trực tiếp.

## 2. RBAC đa hình theo tiền tố UUID

Thay vì viết middleware kiểm tra quyền riêng cho từng loại tài nguyên, LearnHouse dùng một **bảng cấu hình khai báo tĩnh**: mỗi loại tài nguyên (course, activity, community...) khai báo các đặc điểm của nó (có trường published không, có hỗ trợ gate theo nhóm không, tài nguyên cha thuộc loại nào). Loại tài nguyên được suy luận tự động từ tiền tố của UUID (mỗi loại có một tiền tố cố định như `course_`, `activity_`). Từ đó, việc kiểm tra quyền, kiểm tra khóa (lock), kiểm tra kế thừa quyền từ tài nguyên cha (activity kế thừa quyền truy cập từ chapter, chapter kế thừa từ course) đều chạy qua một hàm chung duy nhất.

Nguyên lý áp dụng cho mentingo: nếu trong tương lai số loại tài nguyên cần gate theo nhóm/quyền tăng nhanh (ví dụ khi thêm Community, Board), cân nhắc một bảng cấu hình khai báo tương tự thay vì viết guard riêng cho từng loại — giảm chi phí bảo trì khi thêm loại tài nguyên mới.

## 3. Cấu hình tổ chức dạng JSON có version hóa

Cấu hình tổ chức (branding, tính năng bật/tắt, giới hạn gói) gom vào một cột JSON duy nhất thay vì hàng chục cột riêng lẻ. Khi cấu trúc JSON đó cần thay đổi (thêm nhóm cấu hình mới, đổi tên trường), có một lớp "migration cho chính nội dung JSON" chạy độc lập với migration schema DB — cho phép tiến hóa cấu hình linh hoạt mà không cần ALTER TABLE liên tục, đồng thời vẫn kiểm soát được việc dữ liệu cũ tự động nâng cấp lên định dạng mới khi đọc.

## 4. Webhook: một nguồn sự thật duy nhất cho tài liệu và validate

Thiết kế hay nhất trong toàn bộ LearnHouse. Mỗi loại sự kiện webhook có một "lược đồ dữ liệu" (data schema) khai báo — mô tả các trường sẽ có trong payload. Lược đồ này được dùng **hai lần**: một lần để tự động sinh tài liệu hiển thị cho người dùng (họ biết payload sẽ chứa gì trước khi đăng ký nhận), một lần để validate runtime lúc thực sự gửi webhook (nếu payload thực tế lệch khỏi lược đồ đã khai báo, hệ thống cảnh báo thay vì chặn gửi — ưu tiên không làm gián đoạn dịch vụ hơn là chặt chẽ tuyệt đối). Nhờ đó tài liệu không bao giờ lạc hậu so với code thực tế.

Áp dụng cho mentingo: khi xây webhook đi ra ngoài (đợt 6), định nghĩa schema sự kiện dùng chung cho cả trang tài liệu webhook và validate lúc publish qua outbox — tránh lặp lại việc viết tài liệu tay rồi quên cập nhật khi thêm trường mới.

## 5. Plan/feature gating có một điểm short-circuit duy nhất

Mọi kiểm tra "tính năng này có được phép dùng không" đều đi qua một hàm duy nhất kiểm tra chế độ triển khai trước (oss/ee/saas) — nếu không phải bản SaaS thương mại, hàm trả về "luôn được phép" ngay lập tức mà không cần đánh giá logic gói/giới hạn phức tạp bên dưới. Điều này giữ cho code OSS đơn giản, dễ đọc, và không có nguy cơ vô tình khóa nhầm tính năng ở các bản tự triển khai.

mentingo không cần mô hình gói trả phí nhiều tầng như vậy (SaaS của mentingo dùng feature flag đơn giản trong `packages/shared/src/constants/features.ts`), nhưng nguyên lý "một điểm short-circuit duy nhất, đặt sớm nhất có thể" đáng giữ khi feature flag của mentingo phức tạp thêm.

## 6. Media serving: không bao giờ lộ storage key

File không bao giờ được trả về dưới dạng URL trực tiếp tới storage backend. Mọi truy cập đi qua một endpoint trung gian kiểm tra quyền trước, sau đó stream nội dung (hỗ trợ HTTP Range để tua video/audio được), giống nhau dù backend là filesystem cục bộ hay S3-compatible. Storage key ngẫu nhiên chỉ tồn tại phía server.

mentingo hiện dùng presigned URL S3/MinIO có thời hạn — đây là một đánh đổi hợp lý khác (giảm tải cho server ứng dụng, để CDN/S3 phục vụ trực tiếp) và **không cần thay đổi**, chỉ ghi nhận đây là một lựa chọn kiến trúc khác nhau có lý do riêng, không phải mentingo đang thiếu sót.

## 7. Auth: refresh rotation có "grace window" tường minh

Khi phát refresh token mới, token cũ bị vô hiệu ngay — nhưng hệ thống chấp nhận một khoảng thời gian ngắn (vài giây) mà token cũ vẫn dùng được, kèm giải thích rõ trong code: nhiều tab trình duyệt mở song song hoặc nhiều request refresh gần như đồng thời do mạng chậm dễ gây false-positive "phát hiện đánh cắp token" nếu không có khoảng đệm này. Đây là bài học vận hành thực tế đáng tham khảo nếu mentingo gặp báo cáo người dùng bị đăng xuất bất thường khi dùng nhiều thiết bị/tab.

## 8. Mô hình tiến độ 3 tầng

Tách rõ ba khái niệm dễ bị gộp lẫn: "hành trình học của một người trong một tổ chức" (không đổi theo thời gian), "một lượt học một khóa cụ thể" (có thể có nhiều lượt nếu học lại), và "tiến độ từng bước trong một lượt" (có cờ xác nhận thủ công riêng biệt với cờ hoàn thành tự động — hữu ích khi cần giáo viên xác nhận một hoạt động thực hành ngoài hệ thống, ví dụ thi đấu cờ trực tiếp). mentingo có mô hình tương đương đủ dùng; ghi nhận ở đây để khi thiết kế Assignment engine, cân nhắc thêm cờ "giáo viên xác nhận thủ công" tương tự cho các loại task không tự chấm được (ví dụ nộp video thi đấu).
