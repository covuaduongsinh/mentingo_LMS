# Chess Class Management Business Spec

> **SUPERSEDED** — kể từ Đợt C0 của roadmap "Classroom", tài liệu này được thay thế bởi `docs/specs/classroom-business-spec.md`, mô tả một module Classroom đầy đủ (không phụ thuộc `groups`) mà 5 endpoint dưới đây chỉ là một lát mỏng ban đầu. Các endpoint `chess-class/*` mô tả ở đây vẫn hoạt động như alias tương thích ngược qua Đợt C2, và bị xóa hẳn ở Đợt C8 — xem `docs/specs/classroom-business-spec.md` để biết trạng thái hiện tại. Giữ nguyên nội dung gốc bên dưới làm hồ sơ lịch sử.
>
> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, xem `docs/research/lila/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó. Cơ chế kỹ thuật cụ thể (mã hóa mã đăng nhập, cách sinh email/username giả) là thiết kế riêng của mentingo, khớp với kiến trúc auth/users hiện có, không sao chép cách lila làm.

## Business Overview

Đợt L5 của roadmap "còn thiếu so với lila" (`docs/research/lila/05-roadmap.md`), nối tiếp L4 (chơi trực tuyến, PR #24). Mentingo hiện đã có `groups`/`group_users` (nhóm/lớp) và luồng import CSV người dùng (`UserImportService`), nhưng **bắt buộc mọi tài khoản phải có email thật** — không phù hợp học sinh tiểu học/THCS chưa có email riêng. Đợt này bổ sung **tài khoản do giáo viên quản lý** (không cần email), **mã đăng nhập lớp** (học sinh nhỏ tuổi không cần nhớ mật khẩu), và **báo cáo tiến độ cờ vua theo lớp**.

## Who Uses It

- Giáo viên/HLV có quyền `chess.class.manage_students` — tạo/tạo hàng loạt/đặt lại mật khẩu/giải phóng tài khoản học sinh, sinh mã đăng nhập lớp.
- Giáo viên/HLV có quyền `chess.class.progress` — xem báo cáo tiến độ cờ vua theo từng học sinh và cả lớp.
- Học sinh sở hữu tài khoản do giáo viên quản lý — đăng nhập bằng mã lớp (không cần nhớ mật khẩu) hoặc bằng username/mật khẩu được cấp.
- Quản trị viên (ADMIN) có toàn bộ quyền trên.

## Feature Functions

### 1. Tài khoản do giáo viên quản lý (managed account)

- Mở rộng bảng `users`: `isManagedAccount` (boolean), `managedByUserId` (uuid, tham chiếu `users.id`, ai đang quản lý tài khoản này), `realName` (text, nullable — tên thật, chỉ giáo viên quản lý/admin xem được, **không** hiển thị công khai).
- Tài khoản managed vẫn có `email` (cột hiện tại `NOT NULL` + unique theo tenant, giữ nguyên để không phải sửa hàng loạt nơi dùng `users.email` trong codebase) nhưng là **email giả sinh tự động, không gửi được** (dạng `managed.<mã ngẫu nhiên>@class.mentingo.local`) — không ai thực sự sở hữu hộp thư này, chỉ dùng để thỏa ràng buộc unique/NOT NULL hiện có.
- `firstName`/`lastName` (hiện có, NOT NULL, hiển thị công khai ở mọi nơi trong ứng dụng) được đặt bằng **tên hiển thị sinh tự động** (bút danh, ví dụ ghép từ danh sách từ tiếng Việt trung tính + số thứ tự) — **không phải tên thật** — đây chính là cơ chế "tên thật tách khỏi username" bảo vệ quyền riêng tư trẻ em: mọi nơi hệ thống hiển thị tên người dùng (bảng xếp hạng, thảo luận, hồ sơ) đều thấy bút danh, không thấy tên thật.
- `username` (cột hiện có, nullable + unique theo tenant, đã dùng cho public profile) được sinh cùng lúc, dùng làm định danh đăng nhập chính cho tài khoản managed thay vì email.

### 2. Tạo tài khoản học sinh hàng loạt

- `POST /chess-class/groups/:groupId/students/bulk` — body: danh sách tên thật (mỗi dòng một tên, giáo viên dán từ danh sách lớp). Với mỗi tên:
  - Sinh `username` duy nhất trong tenant (bộ ký tự loại bỏ ký tự dễ nhầm: không dùng `l`, `1`, `0`, `O`, `I`).
  - Sinh mật khẩu ngẫu nhiên cùng bộ ký tự an toàn, hash bằng cơ chế hash mật khẩu hiện có (giống mọi tài khoản khác).
  - Sinh email giả duy nhất, tạo user với `isManagedAccount = true`, `managedByUserId = <giáo viên đang gọi API>`, `realName = <tên thật nhập vào>`.
  - Gán vai trò STUDENT (tái dùng cơ chế gán vai trò hiện có).
  - Thêm vào `group_users` của `groupId` được chỉ định — lớp học cờ **chính là một `groups` hiện có**, không tạo mô hình lớp song song.
  - Tái dùng `insertUserOnboardingRows`/`createSettingsForUsers` như luồng `UserImportService` đã có, **bỏ qua bước gửi email mời** (không có email thật để gửi).
- Trả về danh sách `{ username, temporaryPassword, realName }` — **chỉ hiển thị một lần trong response**, không lưu mật khẩu dạng plaintext, giáo viên tự in/ghi lại cho học sinh.
- Tạo một học sinh đơn lẻ dùng cùng cơ chế qua `POST /chess-class/groups/:groupId/students`.

### 3. Mã đăng nhập lớp (class login code)

- `POST /chess-class/groups/:groupId/login-codes` — giáo viên bấm một nút, hệ thống sinh một mã ngắn (5 ký tự, cùng bộ ký tự an toàn như username/mật khẩu) cho **mỗi tài khoản managed thuộc lớp**, hết hạn sau 15 phút, lưu vào bảng mới `chess_class_login_codes` (chỉ lưu **hash** của mã, không lưu plaintext — cùng nguyên tắc với `magic_link_tokens` đã có).
- Trả về danh sách `{ userId, username, code }` (plaintext, chỉ trong response này) để giáo viên chiếu lên màn hình lớp.
- `POST /auth/class-login` (public, không cần đăng nhập trước) — body `{ code }`. Tra theo hash trong tenant hiện tại (tenant xác định qua tên miền phụ, giống mọi endpoint auth công khai khác), khóa dòng tương ứng (`SELECT ... FOR UPDATE`, theo đúng mẫu `handleMagicLinkLogin` đã có ở L0), kiểm tra chưa hết hạn và chưa dùng, đánh dấu `consumedAt = now` (dùng một lần), rồi phát hành JWT + cookie **giống hệt luồng đăng nhập thường** — không kiểm tra mật khẩu, vì bản thân việc sở hữu mã đã là bằng chứng ủy quyền (giáo viên chỉ chiếu mã cho đúng học sinh trong lớp).
- Đây là luồng đăng nhập **song song** với đăng nhập email/mật khẩu hiện có, không thay thế — tài khoản managed vẫn có thể đăng nhập bằng username + mật khẩu được cấp nếu học sinh nhớ được.

### 4. Quản lý tài khoản: đặt lại mật khẩu, lưu trữ, giải phóng

- `POST /chess-class/students/:userId/reset-password` — giáo viên đang quản lý (hoặc admin) sinh mật khẩu mới ngẫu nhiên, cập nhật `credentials` trực tiếp (không cần email vì không có email thật), trả về mật khẩu mới một lần.
- Lưu trữ (archive): tái dùng nguyên cơ chế `archived` đã có sẵn trên `users` — không xây API riêng, chỉ đảm bảo giáo viên quản lý tài khoản đó có quyền gọi API archive hiện có đối với học sinh do mình quản lý (kiểm tra `managedByUserId = currentUser.id` hoặc quyền admin).
- `POST /chess-class/students/:userId/release` — **giải phóng tài khoản**: học sinh (hoặc phụ huynh) nhập email thật của mình → body `{ email }`. Kiểm tra email chưa tồn tại trong tenant, cập nhật `users.email = email`, `isManagedAccount = false`, `managedByUserId = null`, rồi tạo một dòng `create_tokens` (đúng cơ chế bảng/hash token đã dùng cho luồng mời tài khoản qua CSV import) và trả về token đó trong response — giáo viên tự gửi liên kết `/create-password?token=...` cho học sinh qua kênh liên lạc của mình. Từ lúc học sinh đặt mật khẩu qua liên kết đó, tài khoản hoạt động hoàn toàn độc lập, tách khỏi giáo viên.

### 5. Báo cáo tiến độ lớp

- `GET /chess-class/groups/:groupId/progress?days=30` — với mỗi thành viên lớp (qua `group_users`):
  - Hạng Glicko-2 hiện tại theo từng hạng mục (`puzzle`/`bullet`/`blitz`/`rapid`, từ `chess_ratings` — tái dùng nguyên bảng Đợt L3/L4).
  - Biến thiên rating trong N ngày gần nhất (từ `chess_rating_history`, lọc theo `createdAt >= now - N days`).
  - Tỉ lệ thắng/số ván (từ `chess_matches`, đếm theo `whiteUserId`/`blackUserId` và `result`).
  - Tiến độ puzzle theo theme/motif — tái dùng logic điểm mạnh/yếu đã viết ở `ChessPuzzleService.getDashboard` (Đợt L3), gọi lại cho từng thành viên thay vì viết mới.
  - Thời lượng chơi/số ván puzzle đã giải trong N ngày (đếm `chess_puzzle_attempts`).
  - Điểm trung bình của cả lớp cho mỗi chỉ số trên (tổng hợp thêm, không phải chỉ liệt kê từng học sinh).

### 6. Bảng tin lớp

- Tái dùng nguyên `announcements` + `group_announcements` đã có: giáo viên tạo announcement, chọn phạm vi là nhóm/lớp cờ vua — không có endpoint/bảng riêng cho đợt này. Chỉ cần đảm bảo vai trò TRAINER có quyền `ANNOUNCEMENT_CREATE` (đã có sẵn trong `SYSTEM_ROLE_PERMISSIONS`).

## End-User Value

Giáo viên dạy cờ ở trường tiểu học/THCS có thể tạo tài khoản cho cả lớp 30 học sinh trong một thao tác, không cần mỗi em có email riêng — điều mà mọi hệ thống LMS thông thường (kể cả mentingo trước đợt này) đều yêu cầu. Mã đăng nhập lớp giúp học sinh nhỏ tuổi vào được hệ thống mà không cần nhớ mật khẩu phức tạp. Báo cáo tiến độ theo lớp giúp giáo viên nắm bắt học sinh nào đang tiến bộ, học sinh nào cần kèm thêm — đúng nhu cầu cốt lõi của một lớp học cờ có tổ chức.

## How It Works

Giáo viên tạo một lớp (một `groups` bình thường), dán danh sách tên học sinh, hệ thống tạo hàng loạt tài khoản và trả về danh sách username/mật khẩu để giáo viên lưu lại (in ra hoặc ghi vào sổ). Đầu mỗi buổi học, giáo viên bấm "Tạo mã đăng nhập lớp", hệ thống hiện danh sách mã 5 ký tự cho từng học sinh (kèm bút danh để học sinh nhận ra tài khoản của mình), chiếu lên màn hình hoặc bảng; mỗi học sinh gõ mã của mình vào trang đăng nhập, vào thẳng hệ thống trong 15 phút kể từ lúc mã được tạo, mã dùng một lần. Nếu học sinh quên tài khoản mình dùng gì hoặc mã đã hết hạn, giáo viên tạo lại mã mới bất kỳ lúc nào. Khi học sinh đủ lớn muốn tự quản lý tài khoản (đổi trường, ra khỏi CLB), giáo viên hoặc chính học sinh (qua giáo viên hỗ trợ) chạy thao tác "giải phóng" — nhập email thật, từ đó tài khoản hoạt động như mọi tài khoản thông thường khác. Giáo viên xem báo cáo tiến độ lớp bất kỳ lúc nào để biết ai đang chơi nhiều/ít, rating tăng/giảm, theme puzzle nào cả lớp còn yếu để dạy bổ sung.

## Key Technical Context

- Mở rộng bảng `users` (nullable, không phá vỡ dữ liệu hiện có): `is_managed_account boolean NOT NULL DEFAULT false`, `managed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL`, `real_name text`. Migration theo mẫu "1 migration ALTER + 1 migration RLS" nếu cần (bảng `users` RLS đã có sẵn, cột mới tự động nằm trong policy hiện có — không cần migration RLS riêng cho phần này).
- Bảng mới `chess_class_login_codes`: `id`, `userId` (FK `users.id`, cascade), `groupId` (FK `groups.id`, cascade — để truy vấn "mọi mã đang hoạt động của lớp X"), `codeHash` (text, hash của mã — cùng cơ chế hash dùng cho `magic_link_tokens`, không phải bcrypt vì mã ngắn/dùng một lần/hết hạn nhanh), `expiresAt` (timestamp tz), `consumedAt` (timestamp tz, nullable), `tenantId`. Migration theo mẫu "1 migration tạo bảng + 1 migration RLS riêng" như mọi bảng chess trước đó.
- **Không sửa `LocalStrategy`/`AuthService.validateUser`** (luồng đăng nhập email/mật khẩu hiện có) — đăng nhập bằng mã lớp là một **luồng public endpoint riêng** (`POST /auth/class-login`), mô phỏng đúng cấu trúc `handleMagicLinkLogin` đã có (khóa dòng bằng `SELECT ... FOR UPDATE`, dùng một lần, phát hành token giống hệt sau khi xác thực) — giảm rủi ro thay đổi đường code nhạy cảm hiện có, nhất quán với bài học "đổi tối thiểu, tái dùng mẫu đã kiểm chứng" từ các đợt trước.
- **Giữ nguyên `users.email` là `NOT NULL` + unique theo tenant** — dùng email giả sinh tự động thay vì nới lỏng ràng buộc, để không phải rà soát lại mọi nơi trong codebase đang giả định `email` luôn là một địa chỉ thật dùng được (đăng nhập, quên mật khẩu, mời qua email, OAuth provider linking, v.v. — khảo sát cho thấy có hơn 10 điểm phụ thuộc vào giả định này). Đây là đơn giản hóa có chủ đích, ghi vào "Follow-up Work".
- Module mới `apps/api/src/chess-class/` (`chess-class.module.ts`, `.service.ts`, `.repository.ts`, `.controller.ts`) — tách khỏi `src/chess/` vì phạm vi chính là quản lý người dùng/lớp, không phải logic cờ vua; inject `GroupService` (đọc thành viên lớp) và các repository chess hiện có (đọc rating/puzzle/match) để dựng báo cáo, không viết lại logic tính toán.
- Sinh username/mật khẩu/mã: dùng chung một hàm tiện ích `generateSafeCode(length, charset)` loại bỏ ký tự dễ nhầm (`l`, `1`, `0`, `O`, `I`), tái sử dụng cho cả ba trường hợp (username, mật khẩu, mã lớp) với độ dài khác nhau.
- Permission mới: `chess.class.manage_students`, `chess.class.reset_password`, `chess.class.progress` — gán cho `TRAINER` và `ADMIN` (không gán `STUDENT`/`CONTENT_CREATOR`). Đợt này cũng gán thêm `ANNOUNCEMENT_CREATE` cho `TRAINER` (hiện chỉ có `ANNOUNCEMENT_READ`) — cần thiết để "bảng tin lớp" (mục 6) dùng được, tái dùng cơ chế announcement/group_announcements sẵn có.

## Test Evidence

- Unit test service: sinh username/mật khẩu/mã không trùng lặp trong tenant, tạo hàng loạt đúng số lượng + đúng gán nhóm, mã lớp hết hạn đúng 15 phút và dùng một lần (dùng lại lần hai phải thất bại), đăng nhập bằng mã sai/hết hạn bị từ chối, giải phóng tài khoản cập nhật đúng field và chặn email đã tồn tại, báo cáo tiến độ tổng hợp đúng số liệu từ dữ liệu rating/puzzle/match có sẵn.
- `pnpm lint-tsc-api`/`lint-tsc-web` sạch, `pnpm test:api`/`test:web` xanh.

## Follow-up Work (explicitly not done in this pass)

- **Chuyển lớp (transfer)**: đổi `managedByUserId`/nhóm cho một loạt tài khoản cùng lúc khi giáo viên nghỉ/đổi lớp — chưa xây thao tác hàng loạt riêng, có thể làm thủ công qua từng tài khoản; cân nhắc bổ sung nếu phát sinh nhu cầu thực tế ở quy mô lớn.
- **Giới hạn quyền tài khoản managed** (ví dụ chặn nhắn tin/kết bạn ngoài lớp) — thuộc phạm vi "kid mode" đã lùi sang Đợt L9, không làm trùng lặp ở đây.
- **Biểu đồ trực quan cho báo cáo tiến độ** (chart rating theo thời gian) — đợt này chỉ trả dữ liệu thô (mảng số liệu theo ngày), UI vẽ biểu đồ đơn giản bằng thư viện đã có sẵn trong dự án, không thiết kế thư viện chart mới.
- **Thông báo tự động cho phụ huynh** khi tài khoản được giải phóng — chưa có khái niệm "phụ huynh" trong hệ thống, ngoài phạm vi đợt này.
- **Tự động gửi email liên kết tạo mật khẩu khi giải phóng tài khoản**: đợt này chỉ trả token/liên kết trong response API, giáo viên tự gửi thủ công — chưa nối vào `EmailService`/mẫu email tự động như luồng mời qua CSV import. Cân nhắc nối khi có nhu cầu thực tế (tránh kéo thêm phụ thuộc `EmailModule` vào module mới `chess-class` ở đợt đầu tiên này).
