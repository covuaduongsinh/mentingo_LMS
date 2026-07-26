# GDPR User Data Export & Anonymize Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (xem `docs/research/learnhouse/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt 10 của roadmap là đợt cuối trong danh sách "còn thiếu so với LearnHouse", gộp 8 hạng mục vận hành/tuân thủ không liên quan kỹ thuật với nhau: GDPR export/anonymize, custom domain, menu builder, landing page builder, custom scripts theo tenant, đồng tác giả khóa học, khóa bài học theo nhóm, xuất user CSV, SEO mặc định theo tenant. Khảo sát trước khi code (2026-07-26) xác nhận **đây thực chất là 8 tính năng độc lập bị gộp chung vì cùng nhãn "vận hành"** — đúng tinh thần "mỗi đợt một khối thay đổi mạch lạc" đã áp dụng xuyên suốt các đợt trước (Đợt 6/7/8 đều từng thu hẹp tương tự), đợt này **chỉ triển khai GDPR export + anonymize** — tính năng tuân thủ pháp lý có giá trị cao nhất và độc lập nhất về mặt kỹ thuật. 7 hạng mục còn lại chuyển sang Follow-up Work, mỗi hạng mục đủ lớn để là một đợt riêng trong tương lai.

## Who Uses It

- Admin tenant (quyền `user.manage` hiện có — không thêm quyền mới) — khi nhận được yêu cầu từ một cá nhân ("cho tôi xem dữ liệu của tôi" / "xóa dữ liệu của tôi" theo GDPR Điều 15 và Điều 17), admin vào trang quản lý người dùng, chọn 1 tài khoản, tải xuống toàn bộ dữ liệu liên quan (export) hoặc ẩn danh hóa tài khoản đó (anonymize).

## Feature Functions

### 1. Xuất dữ liệu người dùng (export)

- Từ trang chi tiết người dùng (admin), nút "Xuất dữ liệu (GDPR)" tải xuống 1 file JSON chứa toàn bộ dữ liệu cá nhân + hoạt động học tập liên quan đến người dùng đó, gom theo nhóm:
  - **Hồ sơ**: thông tin `users` (trừ mật khẩu/hash) + `userDetails` (điện thoại, mô tả, chức danh).
  - **Học tập**: `studentCourses` (khóa đã ghi danh + tiến độ), `studentLessonProgress`, `studentChapterProgress`, `quizAttempts`, `studentQuestionAnswers`, `assignmentUserSubmissions` (+ nội dung `assignmentTaskSubmissions` liên quan), `certificates`, `learningPaths` liên quan.
  - **Tương tác cộng đồng**: `communityPosts`/`communityComments`/`communityVotes` do người dùng tạo, `courseChatMessages`, câu hỏi `questions`/`studentQuestionAnswers` (đã liệt kê ở trên, không lặp).
  - **Nhật ký hệ thống**: `userStatistics` (streak/tổng hợp), thời điểm tạo tài khoản/lần đăng nhập gần nhất.
- File JSON có cấu trúc phẳng theo nhóm ở trên (`{ profile, learning, community, systemStats }`), mỗi bản ghi giữ nguyên tên cột gốc — không cần định dạng đẹp, đây là dữ liệu thô cho mục đích tuân thủ, không phải báo cáo cho người dùng đọc.
- Không xuất dữ liệu tổng hợp cấp tenant (`coursesSummaryStats`, `courseStudentsStats`) vì đây là số liệu tổng hợp nhiều người dùng, không phải dữ liệu cá nhân thuần túy.

### 2. Ẩn danh hóa người dùng (anonymize)

- Nút "Ẩn danh hóa tài khoản" trên trang chi tiết người dùng, có hộp thoại xác nhận cảnh báo rõ: **không thể hoàn tác**, tài khoản sẽ không đăng nhập được nữa, nhưng lịch sử học tập tổng hợp (chứng chỉ, thống kê) vẫn được giữ lại dưới dạng ẩn danh để không phá vỡ báo cáo/đối soát của tenant.
- Sau khi ẩn danh hóa:
  - `users`: `email` → `deleted_<phần đầu id>@anonymized.local`, `firstName`/`lastName` → "Deleted User", `avatarReference` → rỗng, `username` → rỗng, `publicProfileEnabled` → tắt, đánh dấu `deletedAt` (mẫu hành vi đã có ở `deleteUser` hiện tại — tái dùng nguyên cơ chế `deletedAt`, chỉ mở rộng thêm các cột bị xóa).
  - `userDetails`: điện thoại/mô tả/email liên hệ/chức danh → rỗng.
  - Thu hồi toàn bộ phiên đăng nhập/token: xóa các dòng `resetTokens`/`createTokens`/`magicLinkTokens` của người dùng đó.
  - **Giữ nguyên** (không xóa, không sửa): `certificates` (chứng chỉ vẫn xác minh được qua QR/token — chỉ tên trên chứng chỉ đã tạo trước đó không đổi ngược, đây là hồ sơ lịch sử), `studentCourses`/tiến độ học tập, `userStatistics`, mọi bảng thống kê tổng hợp cấp tenant — đảm bảo số liệu báo cáo tenant không bị lệch.
  - Nội dung cộng đồng (`communityPosts`/`communityComments`) **giữ nguyên nội dung**, chỉ hiển thị tên tác giả là "Deleted User" (vì `authorId` vẫn trỏ tới user đã ẩn danh, tên hiển thị lấy từ `users.firstName`/`lastName` đã bị ghi đè — không cần sửa gì thêm ở bảng community).
- Sau khi hoàn tất, phát sự kiện outbox mới (giống mẫu `DeleteUserEvent` hiện có) để các listener khác (nếu có trong tương lai) có thể phản ứng.
- Khác với `deleteUser` hiện tại (chỉ áp dụng cho học viên, chặn nếu có quyền quản lý khóa học/chế độ học), anonymize GDPR áp dụng được cho **mọi vai trò** vì đây là yêu cầu pháp lý từ cá nhân, không phải thao tác quản lý người dùng thông thường — nhưng vẫn chặn nếu đây là tài khoản admin duy nhất còn lại của tenant (tránh khóa tenant hoàn toàn), kiểm tra trước khi thực hiện.

### 3. Quyền truy cập

- Dùng lại quyền `USER_MANAGE` hiện có cho cả 2 endpoint (export + anonymize) — không thêm quyền `gdpr.*` riêng, tránh làm phức tạp thêm phạm vi đợt này.

## End-User Value

Trường cờ đáp ứng được yêu cầu pháp lý GDPR (quyền truy cập dữ liệu — Điều 15, quyền xóa/lãng quên — Điều 17) từ học viên/giáo viên/admin mà không cần thao tác thủ công trên database, đồng thời không phá vỡ báo cáo thống kê hay tính toàn vẹn của chứng chỉ đã cấp.

## How It Works

- **Không cần bảng mới, không cần migration** — hoàn toàn dựa trên schema hiện có, chỉ thêm logic đọc/ghi.
- **`GdprService`** mới trong `apps/api/src/user/` (mở rộng module `user` hiện có, không tạo module riêng):
  - `exportUserData(userId)`: truy vấn song song tất cả bảng liên quan (liệt kê ở mục 1), gom thành object JSON, trả về buffer qua repository hiện có + query trực tiếp cho các bảng chưa có repository method sẵn.
  - `anonymizeUser(userId, actor)`: trong 1 `db.transaction`, kiểm tra không phải admin cuối cùng của tenant, ghi đè các cột PII (mẫu chính xác từ `UsersService.deleteUser` hiện tại, mở rộng thêm cột), xóa token, publish `UserAnonymizedEvent` mới (`apps/api/src/events/user/user-anonymized.event.ts`).
- **Controller**: 2 route mới trong `user.controller.ts` hiện có (không tạo controller riêng): `GET /user/:id/gdpr-export` (trả file JSON qua `res.send()` + header `Content-Disposition`, mẫu `report.controller.ts`), `POST /user/:id/anonymize`.
- **Frontend**: 2 nút mới trên trang chi tiết người dùng admin hiện có (`apps/web/app/modules/Admin/Users/` — khảo sát đúng đường dẫn trước khi code), nút export tải file trực tiếp, nút anonymize mở dialog xác nhận (mẫu `AlertDialog` đã dùng cho các thao tác phá hủy khác trong hệ thống).

## Non-Goals (đợt này — chuyển sang Follow-up Work)

- **Custom domain tự phục vụ**, **menu builder**, **landing page builder**, **custom scripts theo tenant**, **đồng tác giả khóa học**, **khóa bài học theo nhóm (lockType public/authenticated/restricted)**, **xuất danh sách user CSV**, **SEO mặc định theo tenant**: 7 hạng mục còn lại của Đợt 10 gốc — mỗi hạng mục đủ lớn để là 1 đợt riêng, không liên quan kỹ thuật đến GDPR.
- **Tự phục vụ (self-service) "tải dữ liệu của tôi"** từ phía học viên: đợt này chỉ làm luồng admin-thực-hiện-thay (đáp ứng đúng yêu cầu pháp lý tối thiểu — data controller xử lý yêu cầu); nút tự phục vụ trong trang cài đặt cá nhân có thể thêm sau nếu cần.
- **Xuất định dạng người đọc được (PDF/XLSX có định dạng)**: JSON thô là đủ cho mục đích tuân thủ ở đợt này.
- **Xóa cứng hoàn toàn (hard delete)** khỏi database: giữ nguyên triết lý "ẩn danh hóa, không xóa" của hệ thống hiện tại (giống `deleteUser`) để không phá vỡ tham chiếu khóa ngoại và báo cáo.

## Key Technical Context

- `apps/api/src/user/services/gdpr.service.ts` (mới), `apps/api/src/user/user.controller.ts` (mở rộng 2 route).
- `apps/api/src/events/user/user-anonymized.event.ts` (mới, mẫu `delete-user.event.ts`).
- Tái dùng mẫu ghi đè PII từ `UsersService.deleteUser` (`apps/api/src/user/user.service.ts`), mẫu xuất file từ `ReportController`/`ReportService`.
- Frontend: trang chi tiết người dùng admin hiện có.

## Test Evidence

- Không có migration mới (dùng schema hiện có).
- `apps/api`/`apps/web` `tsc --noEmit` sạch, `eslint --max-warnings=0` sạch (Node 22).
- Test mới `apps/api/src/user/services/__tests__/gdpr.service.spec.ts` (4 test, Jest Node 22): `NotFoundException` khi không tìm thấy user, chặn ẩn danh hóa admin cuối cùng của tenant, ẩn danh hóa thành công + phát `UserAnonymizedEvent` khi còn admin khác, cho phép ẩn danh hóa user không phải admin dù tenant chỉ còn 1 admin (vì user đó không phải admin).
- Regenerate `apps/api/src/swagger/api-schema.json` xác nhận đủ 2 route `/api/user/gdpr-export` + `/api/user/gdpr-anonymize`; `pnpm run generate:client` đồng bộ `apps/web/app/api/generated-api.ts`.
- Full API Jest suite chạy sạch (xem log thực thi trước khi commit).
- i18n: đủ 7 locale (en/vi/pl/de/es/lt/cs) cho khóa `adminUserView.gdpr.*`, validate `JSON.parse` sạch trên cả 7 file.

## Follow-up Work (đợt sau, nếu cần)

- Custom domain tự phục vụ (pending/verified/active/failed + token TXT + tích hợp Caddy on-demand TLS).
- Menu builder + landing page builder (Classic trước) + custom scripts theo tenant.
- Đồng tác giả khóa học (bảng `course_collaborators`, vai trò contributor/maintainer).
- Khóa bài học theo nhóm (`lockType` public/authenticated/restricted + bảng nối lesson↔group).
- Xuất danh sách user CSV, cấu hình SEO mặc định theo tenant.
- Tự phục vụ "tải dữ liệu của tôi" từ trang cài đặt cá nhân học viên.
