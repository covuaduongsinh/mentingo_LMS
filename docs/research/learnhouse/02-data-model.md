# LearnHouse — Mô hình dữ liệu (mô tả nghiệp vụ, không chứa DDL nguồn)

> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md) trước. Bảng dưới đây mô tả **khái niệm và quan hệ**, không phải định nghĩa cột sao chép nguyên văn. mentingo triển khai lại các khái niệm này bằng tên bảng/cột theo quy ước riêng của mình (JSONB `LocalizedText`, mixin `tenantId`/`timestamps` sẵn có trong `apps/api/src/storage/schema/utils.ts`).

LearnHouse có **53 bảng**. mentingo hiện có **~95 bảng** (schema `apps/api/src/storage/schema/index.ts`, 2626 dòng) — phạm vi rộng hơn đáng kể vì đã bao gồm AI mentor, SCORM, live training, learning path, chess, permission rule sets nhiều lớp mà LearnHouse OSS không có.

## Nhóm tổ chức / đa tenant

LearnHouse: một thực thể "Organization" mang cấu hình dạng JSON blob có **kiểm soát phiên bản** (v1 → v2, với migration riêng cho việc tiến hóa cấu hình) — ý tưởng đáng học: thay vì thêm cột mới liên tục cho mỗi cấu hình, gom vào JSON và versioning migration của chính JSON đó. mentingo hiện đã có bảng `settings` JSONB tương tự cho cấu hình toàn cục và theo user — có thể áp dụng nguyên tắc "version hóa cấu hình JSON" nếu cấu hình global phình to trong tương lai.

Domain tùy chỉnh (custom domain) của LearnHouse có quy trình xác thực rõ ràng: trạng thái `pending → verified → active`/`failed`, một token xác thực DNS TXT, timestamp xác thực, và một trường lưu lỗi kiểm tra gần nhất. mentingo hiện chỉ có `tenants.host` đặt tĩnh — đây là khoảng trống thực (xem đợt 7 trong roadmap).

## Nhóm người dùng / phân quyền

Tương đương `users` của mentingo. Điểm khác biệt đáng chú ý ở LearnHouse: **RBAC đa hình dựa trên tiền tố UUID** — mỗi loại tài nguyên (course, activity, community, ...) có một tiền tố UUID cố định, và một bảng cấu hình khai báo tĩnh (loại tài nguyên → có publish field không, có hỗ trợ usergroup gating không, có hỗ trợ đồng tác giả không, tài nguyên cha là ai). Nhờ vậy, loại tài nguyên được suy ra chỉ từ chuỗi UUID, và thêm loại tài nguyên mới chỉ là thêm một dòng cấu hình chứ không phải viết middleware mới. mentingo hiện dùng `@RequirePermission` gắn thủ công theo từng route — an toàn và tường minh hơn, nhưng kém "tự động hóa" hơn khi số loại tài nguyên tăng nhanh. Đáng cân nhắc áp dụng ý tưởng "cấu hình khai báo cho loại tài nguyên" nếu mentingo cần gate nhiều loại resource mới (ví dụ Board, Community ở các đợt sau) mà không muốn viết guard riêng cho từng loại.

Ma trận quyền của LearnHouse (`Rights`) chia theo nhóm tài nguyên (courses, users, folders, media, activities, assignments, roles, communities...), mỗi nhóm có CRUD cơ bản, một số nhóm có thêm quyền "chỉ với tài nguyên do chính mình sở hữu" (`action_read_own`, `update_own`, `delete_own`). mentingo đã có mô hình tương đương và **mạnh hơn** — ~90 permission key cộng hệ thống "rule set" nhiều lớp (`permission_rule_sets` → `permission_role_rule_sets`), không cần vay mượn.

## Nhóm khóa học (lõi hệ thống)

Cấu trúc phân cấp: **Course → Chapter → Activity**, với `ChapterActivity`/`CourseChapter` là bảng nối mang thứ tự hiển thị (`order`). Activity có hai trường phân loại: `activity_type` (VIDEO/DOCUMENT/DYNAMIC/ASSIGNMENT/CUSTOM/SCORM) và `activity_sub_type` chi tiết hơn (ví dụ DYNAMIC chia thành PAGE/MARKDOWN/EMBED/RESOURCE). Nội dung dạng văn bản-trong-trang lưu trực tiếp trong `Activity.content` (JSON — tài liệu TipTap), còn nội dung có file đính kèm (video, PDF, ảnh, audio) tách thành bảng `Block` riêng liên kết tới activity. Đây là một tách biệt hợp lý: nội dung thuần văn bản đi kèm với activity, nội dung có file đi kèm với block — mentingo lưu toàn bộ nội dung content-lesson trong một trường `description` JSONB duy nhất trên `lessons`, đơn giản hơn và đã đủ dùng ở quy mô hiện tại.

**Activity Versioning:** mỗi lần lưu tạo một snapshot (`content`, `version_number`, người tạo, thời điểm), cho phép xem lịch sử và khôi phục. mentingo chưa có khái niệm này cho nội dung bài học (xem đợt 4 roadmap).

**Chapter/Activity Lock:** mỗi chapter/activity có `lock_type` — `public` (ai cũng xem được kể cả chưa đăng nhập), `authenticated` (cần đăng nhập), `restricted` (cần thuộc usergroup được gán quyền qua bảng nối đa hình). mentingo có khái niệm gần tương đương ở mức chapter (`is_freemium`) nhưng chưa có gate theo group ở mức bài học đơn lẻ.

## Bài tập & chấm điểm — khoảng trống lớn nhất

Đây là hệ con **hoàn toàn không tồn tại trong schema mentingo** (đã xác nhận bằng grep, 0 kết quả cho `assignment`/`submission`). Mô hình 4 tầng của LearnHouse:

```
Assignment (đề bài, cấu hình chấm điểm chung)
  └─ AssignmentTask (một câu hỏi/nhiệm vụ cụ thể trong đề, có nhiều loại)
       └─ AssignmentTaskSubmission (bài nộp của một học viên cho một task, ràng buộc duy nhất user+task)
  └─ AssignmentUserSubmission (bản ghi tổng: trạng thái + điểm tổng của một học viên cho toàn bộ đề, ràng buộc duy nhất user+assignment)
```

Đặc điểm nghiệp vụ đáng giữ lại khi thiết kế lại cho mentingo (mô tả bằng lời, không phải schema cụ thể):

- **5 thang điểm khác nhau** cho cùng một đề bài: theo số (numeric), theo phần trăm, đạt/không đạt, theo chữ cái, theo thang GPA — đề bài chọn một thang, hệ thống tự quy đổi điểm câu hỏi con sang thang đó.
- **Nhiều loại nhiệm vụ con** trong cùng một đề: nộp file, quiz nhúng, form, code, câu trả lời ngắn, câu trả lời dạng số — mỗi loại có một cách chấm riêng, nhưng cùng lưu vào một bảng submission với nội dung linh hoạt (JSON).
- **Chấm tự động có thể bị người chấm ghi đè**, và khi đã ghi đè thủ công thì lần chấm lại tự động sau đó (regrade) không được xóa mất quyết định của người chấm — có một cờ đánh dấu "đã chấm tay" để phân biệt.
- **Đáp án đúng không bao giờ trả về client** trừ khi đề bài cho phép hiển thị đáp án VÀ bài nộp của chính học viên đó đã ở trạng thái đã chấm — đây là quy tắc bảo mật quan trọng nhất cần giữ nguyên tinh thần khi triển khai lại.
- **Giới hạn số lần nộp lại** (0 = không giới hạn), và khi nộp lại thì số lần thử tăng lên chứ không tạo ra lịch sử nhiều bản ghi song song — đơn giản hóa truy vấn "điểm hiện tại" nhưng đánh đổi mất lịch sử chi tiết các lần thử trước (mentingo có thể chọn giữ lịch sử nếu cần, tùy quyết định thiết kế ở giai đoạn code).
- **Chấm lại kéo theo thu hồi chứng chỉ**: nếu một bài nộp đã góp phần cấp chứng chỉ bị chấm lại và điểm tụt xuống dưới ngưỡng đạt, chứng chỉ liên quan bị thu hồi tự động.

## Theo dõi tiến độ

Mô hình 3 tầng: hành trình học của một người dùng trong một tổ chức (mức cao nhất) → một lượt học một khóa cụ thể → tiến độ từng activity trong lượt đó (có `complete`, `teacher_verified` — một cờ riêng cho việc giáo viên xác nhận thủ công, `grade`, dữ liệu tự do). mentingo có `student_courses` + `student_lesson_progress` + `student_chapter_progress` tương đương về bản chất, đã đủ dùng, không cần vay mượn thêm.

## Chứng chỉ

Mẫu chứng chỉ theo khóa (cấu hình JSON), và một bảng chứng chỉ-đã-cấp cho từng người dùng với ràng buộc duy nhất (một người chỉ có một chứng chỉ hoạt động cho một mẫu). Điểm mentingo hiện thiếu: **trang xác thực công khai** (verify certificate qua UUID, không cần đăng nhập) và **mã QR** trên bản in — cả hai đều rẻ để thêm vì mentingo đã có sẵn cấp/thu hồi chứng chỉ và xuất PDF bằng puppeteer.

## Thư viện nội dung

Cây thư mục **tự tham chiếu** (`parent_folder_id` trỏ về chính bảng đó) chứa được nhiều loại tài nguyên khác nhau (course, podcast, community, board, playground, media) thông qua một bảng nối đa hình (folder_id + resource_uuid + loại tài nguyên). mentingo hiện có `resource-library/` dạng phẳng, không phân cấp và không đa hình — nâng cấp này (đợt 5 roadmap) là công sức vừa phải nhưng cải thiện đáng kể khả năng tổ chức tài liệu cho một trung tâm nhiều lớp/nhiều HLV.

## Cộng đồng / thảo luận

Community (có thể gắn với một khóa học cụ thể hoặc đứng độc lập) chứa Discussion (bài viết, có nhãn/emoji, upvote, ghim, khóa) chứa Comment, cộng thêm bảng vote riêng cho cả discussion và comment, bảng reaction emoji riêng, và một tầng kiểm duyệt theo danh sách từ khóa cấu hình được. mentingo có `course_chat_*` (chat trong một khóa cụ thể) và `questions_and_answers` (hỏi-đáp) nhưng chưa có không gian cộng đồng đứng độc lập với vote/kiểm duyệt — phù hợp cho một "diễn đàn CLB cờ" nơi học viên khoe ván đấu, hỏi đáp giữa các lớp (đợt 3 roadmap).

## AI & nội dung sinh tự động

Một bảng nhật ký `AIGeneration` ghi lại mọi lượt gọi AI sinh nội dung (ảnh/quiz/bài tập/kịch bản) kèm loại, prompt, kết quả JSON — dùng để hiện lịch sử cho người dùng và giới hạn hạn mức theo tổ chức. Bảng embedding riêng cho RAG (pgvector, 768 chiều) có lưu kèm tên hoạt động/chương/khóa học phi chuẩn hóa (denormalized) để tăng tốc hiển thị kết quả tìm kiếm mà không cần join. mentingo đã có RAG (`doc_chunks`, pgvector) và AI judge — phần còn thiếu là **nhật ký lượt sinh AI + đo hạn mức theo tenant**, hữu ích khi mentingo mở rộng thêm các tính năng AI sinh nội dung (đợt 6 roadmap).

## Board / Playground / Podcast

Ba hệ con nhỏ, độc lập, không có trong mentingo:

- **Board**: bảng trắng cộng tác realtime, nội dung lưu dạng binary CRDT (Yjs), phân quyền theo vai trò owner/editor/viewer trên từng thành viên.
- **Playground**: khối HTML tương tác do AI sinh ra, lưu nguyên văn HTML, có thể gắn với một khóa học để lấy ngữ cảnh RAG khi sinh.
- **Podcast**: danh sách tập âm thanh có thứ tự, có feed RSS công khai.

Giá trị cho trường cờ: Board có thể trở thành "bàn phân tích chung" nhiều người cùng xem/thao tác trong buổi học trực tuyến (đợt 5 roadmap, dùng lại hạ tầng Yjs từ đợt 4 và component `ChessBoard.tsx` đã có).

## Tự động hóa

Webhook ra ngoài với danh sách hơn 40 sự kiện được đăng ký tĩnh, mỗi sự kiện có một "lược đồ dữ liệu" (data schema) khai báo dùng chung cho cả tài liệu hiển thị cho người dùng lẫn việc validate lúc gửi thực tế — tránh tài liệu và code lệch nhau theo thời gian. Ký HMAC, secret mã hóa khi lưu, log giao hàng có số lần thử. mentingo có outbox nội bộ (`apps/api/src/outbox/`) nhưng chưa có webhook đi ra ngoài cho khách hàng thứ ba — nền tảng outbox đã sẵn sàng để dựng thêm lớp này (đợt 6 roadmap).
