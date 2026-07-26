# lila — Ghi chú thiết kế các hệ con đáng học hỏi

> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md) trước. Đây là ghi chú về **nguyên lý thiết kế và thuật toán**, không phải mô tả API hay cấu trúc file cụ thể để copy.

## 1. Glicko-2 — thuật toán rating (public domain, được phép cài lại từ đặc tả toán học)

Glicko-2 là cải tiến của Elo cổ điển: mỗi người chơi có 3 tham số thay vì 1 — rating (trình độ ước lượng), độ lệch chuẩn RD (mức độ chắc chắn của ước lượng đó), và độ biến động (mức độ thất thường gần đây). Ý nghĩa thực tiễn cho trường học: một học sinh mới có RD cao → mỗi ván đầu tiên làm rating thay đổi rất mạnh (hệ thống "học" nhanh trình độ thật); sau nhiều ván RD giảm dần → rating ổn định, mỗi ván sau đó chỉ thay đổi nhẹ. Đây là lý do nên **áp dụng Glicko-2 ngay từ Đợt L3 (puzzle)** thay vì Elo đơn giản — với học sinh mới luyện puzzle, hệ thống cần hội tụ nhanh về đúng mức độ khó phù hợp, không phải chờ hàng chục bài mới "đúng nhịp".

Áp dụng riêng biệt theo từng "loại hình" (mỗi thể loại thời gian chơi + puzzle có bộ 3 tham số độc lập) là nguyên lý quan trọng thứ hai: một học sinh có thể puzzle rating cao nhưng ván đấu thời gian ngắn (cờ chớp) lại thấp — không gộp chung một con số duy nhất sẽ đánh giá sai bản chất.

Thuật toán Glicko-2 công bố công khai bởi Mark Glickman ở dạng đặc tả toán học tự do (public domain) — cài đặt lại trực tiếp từ đặc tả gốc, tuyệt đối không nhìn implementation Scala của lila.

## 2. PuzzleDifficulty — độ khó như một "ống kính" tạm thời, không sửa rating gốc

Thiết kế tinh tế: 5 mức độ khó không sửa trực tiếp giá trị rating của người học, mà chỉ **cộng một độ lệch (delta) tạm thời khi chọn puzzle phù hợp** để hiển thị. Rating gốc của người học chỉ được cập nhật **sau khi giải xong**, dựa trên kết quả thật so với rating thật của puzzle — và với 2 mức cực trị (dễ nhất/khó nhất), mức độ ảnh hưởng lên rating thật bị giảm bớt có chủ đích. Đây là cách vừa cho học sinh chọn "luyện dễ hơn cho tự tin" hoặc "thử sức khó hơn" mà **không làm méo mó** thước đo trình độ thật dùng để ghép cặp/xếp hạng — tách bạch rõ "độ khó hiển thị cho người dùng chọn" khỏi "rating nội bộ dùng để đo lường".

## 3. PuzzleDashboard — chỉ số hiệu suất theo chủ đề, không chỉ đếm đúng/sai thô

Điểm hay nhất trong toàn bộ hệ thống puzzle: thay vì chỉ đếm "đúng bao nhiêu / sai bao nhiêu" theo từng chủ đề (dễ gây hiểu lầm — một học sinh giỏi có thể "sai nhiều" ở một chủ đề chỉ vì được giao toàn puzzle rating rất cao ở chủ đề đó), chỉ số hiệu suất **kết hợp rating trung bình của các puzzle đã gặp với tỉ lệ thắng ngay lần đầu** — cùng bản chất với "performance rating" trong tính Elo sau một giải đấu (đo trình độ thể hiện qua _đối thủ đã gặp_, không chỉ qua tỉ lệ thắng thô). Từ chỉ số này, "điểm yếu" được định nghĩa là chủ đề có hiệu suất **thấp hơn hiệu suất trung bình của chính người đó** (so sánh nội bộ, không so với người khác) — tránh gắn nhãn "yếu" cho một học sinh giỏi chỉ vì so với chuẩn tuyệt đối nào đó không phù hợp với trình độ của em.

Ngưỡng số lượng mẫu tối thiểu trước khi kết luận mạnh/yếu (không tính chủ đề mới thử 1-2 lần) là chi tiết nhỏ nhưng quan trọng để tránh dashboard "nhiễu" — đáng áp dụng nguyên vẹn khi làm Đợt L3.

## 4. Practice/PracticeGoal — mục tiêu suy ra từ dữ liệu có sẵn, không phải trường cấu hình riêng

Thay vì thêm một trường "loại mục tiêu" + "tham số mục tiêu" riêng trên mỗi bài luyện tập, lila **suy luận mục tiêu trực tiếp từ metadata PGN chuẩn** (thẻ kết quả ván) đã có sẵn trong dữ liệu chương. Nguyên lý: khi một khái niệm nghiệp vụ đã có thể được biểu diễn hoàn toàn qua dữ liệu đã tồn tại (theo một quy ước phân tích chuỗi rõ ràng), không cần thêm một trường lưu trữ riêng — giảm bề mặt cần đồng bộ giữa 2 nguồn dữ liệu dễ lệch nhau. Ghi nhận "chỉ giữ giá trị tốt nhất" (số nước tối thiểu đã dùng để đạt mục tiêu, cập nhật xuống khi có kết quả tốt hơn — không bao giờ cập nhật lên) là một mẫu cập nhật một chiều đáng áp dụng ở bất kỳ đâu cần "ghi nhận thành tích tốt nhất" (ví dụ tương lai: thời gian nhanh nhất giải một puzzle).

## 5. ClasLogin — mã đăng nhập ngắn hạn cho tài khoản trẻ em, không dùng lại cơ chế mật khẩu

Thay vì bắt học sinh nhỏ tuổi nhớ username + mật khẩu, lila tách hẳn một luồng đăng nhập riêng: giáo viên sinh một **mã ngắn dùng một lần, hết hạn rất nhanh (15 phút)**, chỉ áp dụng cho những tài khoản **do giáo viên quản lý (managed)** — không áp dụng được cho tài khoản tự quản, tránh trở thành lỗ hổng bảo mật cho tài khoản người lớn. Nguyên lý bảo mật đáng chú ý: mã có phạm vi hiệu lực hẹp cả về **thời gian** (15 phút) lẫn **đối tượng áp dụng** (chỉ managed account), giảm bề mặt tấn công so với việc mở rộng cơ chế OTP dùng chung cho mọi loại tài khoản.

## 6. Bộ ký tự sinh mật khẩu/username tự động loại trừ ký tự dễ nhầm

Chi tiết nhỏ nhưng thực dụng cao cho bối cảnh trẻ em tự đọc/chép mã bằng tay: bộ ký tự sinh tự động loại bỏ các ký tự dễ gây nhầm lẫn khi viết tay hoặc đọc to (ví dụ chữ thường "l" dễ lẫn với số "1" và chữ hoa "I"). Áp dụng y hệt khi sinh username/mật khẩu tự động cho tài khoản managed ở Đợt L5.

## 7. Study Settings — phân quyền theo tính năng, không phải phân quyền theo vai trò đơn khối

Thay vì một vai trò cứng "ai được làm gì", cấu hình phân quyền của Study tách theo **từng khía cạnh tính năng riêng biệt** (dùng công cụ phân tích, xem opening explorer, cho phép nhân bản, cho phép chia sẻ, ai được chat), mỗi khía cạnh có một ngưỡng mức truy cập độc lập (5 mức từ hẹp tới rộng). Nguyên lý: khi một tính năng có nhiều "khía cạnh sử dụng" khác nhau về độ nhạy cảm (xem là một chuyện, chỉnh sửa lại là chuyện khác, chia sẻ ra ngoài lại khác nữa), tách phân quyền theo khía cạnh linh hoạt hơn nhiều so với một vai trò gộp chung — đáng áp dụng khi thiết kế phân quyền Study ở Đợt L2 (dù mentingo có thể thu hẹp còn 2-3 khía cạnh thay vì 5, tùy nhu cầu thực tế).

## 8. Room — trừu tượng "phòng có realtime + chat" dùng chung nhiều tính năng

lila trừu tượng hóa khái niệm "phòng" (một nhóm người đang tương tác cùng lúc quanh một đối tượng trung tâm, kèm chat) thành một module hạ tầng dùng chung bởi Study, Tournament, Simul, Swiss — mỗi tính năng chỉ định nghĩa phần nghiệp vụ riêng của mình, còn phần "vào phòng/rời phòng/chat trong phòng" dùng lại một lần. mentingo đã có tiền lệ tương đương chính xác trong PR #19 (bàn phân tích cờ cộng tác): mở rộng `WsGateway` chung với quy ước đặt tên sự kiện `join:<domain>` → `client.join(<domain>:<id>)`. Nguyên lý cần giữ xuyên suốt L2/L4/L6/L9: **mọi tính năng realtime mới đều mở rộng `WsGateway` hiện có theo đúng quy ước này, không tạo gateway Socket.IO riêng cho từng tính năng.**

## 9. Forum shadowban — đếm số liệu song song 2 phiên bản

Cơ chế kiểm duyệt tinh vi nhất của lila: mọi bộ đếm liên quan tới nội dung (số bài trong 1 chủ đề, mốc "bài mới nhất") đều có **2 phiên bản song song** — một bản người dùng thường thấy, một bản người bị đánh dấu vi phạm thấy (bản này bao gồm cả bài viết của chính họ, để họ không nhận ra mình đã bị ẩn khỏi người khác). Đây là kỹ thuật shadowban ở tầng dữ liệu, không phải tầng hiển thị đơn thuần — tránh việc người bị shadowban dễ dàng phát hiện qua việc "bài của tôi không ai thấy". **Không đưa vào roadmap L9** (độ phức tạp vượt quá nhu cầu môi trường lớp học có giáo viên giám sát trực tiếp), chỉ ghi nhận như một tham khảo nếu tương lai cộng đồng mở rộng ra ngoài phạm vi trường học.

## 10. Auto-archive dựa trên mốc "lần xem cuối", không phải cron quét toàn bộ

Lớp học tự động chuyển sang lưu trữ khi giáo viên không mở xem trong thời gian dài — thực hiện bằng cách **ghi mốc thời gian mỗi lần giáo viên xem trang lớp** (một side-effect nhẹ trên một request đọc thông thường), rồi so sánh mốc đó khi cần (lazy check khi truy vấn, hoặc một cron nhẹ quét theo điều kiện mốc thời gian) — không cần một tiến trình nền phức tạp theo dõi "hoạt động" theo nghĩa rộng. Nguyên lý tiết kiệm: tái dùng một cột "lần cập nhật cuối" đã có ý nghĩa nghiệp vụ rõ ràng (không phải `updatedAt` kỹ thuật chung chung) để suy ra trạng thái vòng đời, thay vì dựng thêm bảng theo dõi hoạt động riêng.
