# Classroom (Lớp học) Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, module `clas`, xem `docs/research/lila/06-clas-teardown.md`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó. Cơ chế kỹ thuật cụ thể (schema PostgreSQL, cách gate quyền, cách sinh username/mật khẩu) là thiết kế riêng của mentingo, khớp với kiến trúc hiện có (NestJS/Drizzle/RLS đa tenant), không sao chép cách lila làm (Scala/Play/MongoDB). Đây là roadmap nhiều đợt (C0–C8); tài liệu được cập nhật ở cuối mỗi đợt — xem "Test Evidence" và "Follow-up Work" để biết chính xác phần nào đã xong tại thời điểm đọc.

## Business Overview

Đợt L5 (`docs/specs/chess-class-management-business-spec.md`, PR #25, **nay superseded bởi tài liệu này**) mới làm một lát mỏng của "lớp học": 5 endpoint tiện ích quản trị tài khoản học sinh cờ vua, dựng tạm trên bảng `groups` (cohort HR của LMS, không có chủ sở hữu/archive/bảng tin/ghi chú riêng). Khảo sát lại module `clas` của lila (`docs/research/lila/06-clas-teardown.md`) cho thấy khoảng cách lớn: 41 route so với 5, 4 entity lớp học so với 0.

Roadmap này (**C0–C8**) xây một module **Classroom** đầy đủ, độc lập với `groups`, phục vụ mọi loại lớp học trong LMS (không chỉ cờ vua — cờ vua là một trong các "khóa học" có thể gán cho lớp). Đạt tính năng ngang lila `clas` (quản lý lớp nhiều giáo viên, mời/tạo học sinh hàng loạt, mã đăng nhập nhanh cho tài khoản trẻ em, bảng tin, báo cáo tiến độ, thao tác hàng loạt, chuyển lớp, graduate/đóng tài khoản), cộng thêm phần mở rộng riêng của mentingo mà lila không có: gán khóa học/bài tập/chứng chỉ cho lớp — xem mục "Ngoài phạm vi lila" bên dưới để phân biệt rõ hai loại.

## Who Uses It

- **Giáo viên** (bất kỳ ai có quyền `classroom.create` — mặc định vai trò `trainer`, `admin`): tự đăng ký làm giáo viên, tạo/sửa/đóng lớp, quản lý học sinh trong lớp mình dạy, xem báo cáo tiến độ, gán nội dung học.
- **Học sinh**: thành viên của một hay nhiều lớp — xem dashboard lớp, bảng tin, danh sách bạn cùng lớp; nếu là tài khoản do giáo viên quản lý (managed) thì đăng nhập bằng mã lớp hoặc username/mật khẩu được cấp.
- **Quản trị viên** (`admin`): toàn quyền như giáo viên trên mọi lớp, cộng thêm xem lớp của một giáo viên bất kỳ và xem thông tin định danh thật của học sinh cho mục đích giám sát.

## Feature Functions

### 1. Quản lý lớp (C1)

- Tạo/sửa/xem danh sách lớp — mỗi lớp có tên, mô tả, danh sách giáo viên (1–10, quyền ngang nhau), cờ cho-phép-nhắn-tin, trần số học sinh (mặc định 100, đọc từ settings).
- Archive (đóng mềm) / reopen. Đóng không xóa dữ liệu, chỉ ẩn khỏi danh sách học sinh nhìn thấy.
- Ghi nhận "lần xem gần nhất" mỗi khi giáo viên mở trang lớp — làm cơ sở cho auto-archive (C4).
- Mọi truy cập không thuộc quan hệ giáo viên/học sinh của lớp trả 404 (không lộ sự tồn tại của lớp).

### 2. Học sinh trong lớp (C3)

- Ba cách thêm học sinh: mời tài khoản có sẵn (4 nhánh phản hồi tùy trạng thái người được mời), tạo 1 tài khoản managed mới, tạo hàng loạt từ danh sách tên thật dán vào.
- Tài khoản managed: email nội bộ không nhận thư thật, mật khẩu ngẫu nhiên hiện **một lần**, bắt buộc kid mode, rating cờ khởi tạo thấp hơn mặc định (áp dụng khi lớp gắn nội dung cờ vua).
- Hồ sơ học sinh trong lớp: tên thật + ghi chú riêng (chỉ giáo viên của đúng lớp đó thấy).
- Archive/khôi phục học sinh, reset mật khẩu (đăng xuất mọi phiên), graduate (chuyển sang email thật → tự quản), đóng tài khoản vĩnh viễn, chuyển sang lớp khác (giữ nguyên hồ sơ).
- Thao tác hàng loạt: archive/restore/move/remove/delete-invites theo cơ chế "sửa danh sách để giữ lại, phần còn lại bị tác động".

### 3. Mã đăng nhập nhanh (C1/C3)

- Sinh một bộ mã 5 ký tự (bảng ký tự loại trừ ký tự dễ nhầm) cho toàn bộ học sinh managed+hoạt động của lớp, hết hạn 15 phút, dùng một lần, vô hiệu hóa bộ cũ khi sinh bộ mới.
- Đăng nhập công khai bằng mã, rate limit theo IP, không kiểm tra mật khẩu.

### 4. Bảng tin & thông báo lớp (C4)

- Bảng tin (wall) markdown do giáo viên soạn, học sinh chỉ xem.
- Gửi thông báo toàn lớp (10–300 ký tự, tự nối link lớp), chỉ khả dụng khi ≤ trần học sinh.
- Tự động archive lớp không được giáo viên xem quá 30 ngày (cron theo tenant, dry-run trước khi bật thật).

### 5. Báo cáo tiến độ (C6)

- Theo hạng mục × số ngày: rating đầu/cuối, số ván/bài, thắng, thời lượng, win rate, trung bình lớp.
- Tiến độ nội dung nhập môn (nếu lớp gắn nội dung cờ vua): % hoàn thành Learn/Practice/Coordinate.
- Tiến độ khóa học/bài tập LMS thường (nếu lớp gắn khóa học — mục 6).

### 6. Nối lớp với LMS — **ngoài phạm vi lila, mở rộng riêng của mentingo** (C5)

- Gán/gỡ khóa học cho lớp (ghi danh toàn bộ học sinh, giữ provenance qua `enrolled_by_classroom_id`).
- Giao bài tập (`assignments`) cho lớp.
- Nếu lớp gắn nội dung cờ vua: giao Study/Puzzle, mời hàng loạt vào giải đấu (không auto-join).

### 7. Quyền riêng tư & bảo mật (C1/C3/C7)

- Tên thật hiển thị có điều kiện qua một serializer duy nhất: chính chủ không thấy, giáo viên chỉ thấy học sinh lớp mình dạy, học sinh chỉ thấy bạn cùng lớp.
- Tài khoản managed: bắt buộc kid mode, không tự tắt được, không tự đóng tài khoản được, không tự đổi mật khẩu được.
- Kid-mode DM/follow chỉ giữa bạn cùng lớp (lớp bật `canMsg`) hoặc với giáo viên của mình — mở rộng cơ chế `community` sẵn có (Đợt L9), không viết lại.
- GDPR: xóa user → ghost hoá vai trò trong lớp, xóa hồ sơ học sinh liên quan.

## Ngoài phạm vi lila (không suy diễn từ hành vi lila — quyết định riêng của mentingo)

Gán khóa học/bài tập/chứng chỉ cho lớp (mục 6) là phần mở rộng có chủ đích, **lila không có khái niệm này** (`docs/research/lila/06-clas-teardown.md` mục F.1). Không làm: điểm danh, sổ điểm, thời khóa biểu — lila cũng không có, và đã chốt không mở rộng sang đó.

## Không port từ lila (đã cân nhắc, quyết định bỏ hoặc thay thế)

Xem bảng đầy đủ ở kế hoạch triển khai nội bộ; tóm tắt: bloom filter (thay bằng partial index Postgres), chặn Tor/proxy/firewall IP (đã có rate-limit + reverse proxy), đồng bộ lớp ↔ Team Lichess (mentingo không có khái niệm Team, dùng `chess_tournaments` sẵn có), auto-join giải đấu (đổi thành mời hàng loạt, không tự động), denormalize trường lên bản ghi ván đấu (tối ưu MongoDB-specific, Postgres JOIN đủ nhanh), xuất OAuth token học sinh (ngoài phạm vi chương trình học), metrics/modlog riêng (gộp vào `activity_logs`/`statistics` sẵn có).

## End-User Value

Trường/CLB dạy học có thể quản lý một lớp thật (nhiều giáo viên cùng dạy, học sinh nhỏ tuổi không cần email, đăng nhập bằng mã chiếu lên bảng, ghi chú riêng tư về từng em, chuyển lớp khi đổi giáo viên, đóng lớp cuối khóa mà không mất dữ liệu) — thay vì phải mượn tạm khái niệm "nhóm" của HR/L&D vốn không có các ngữ nghĩa này. Gán khóa học/bài tập cho lớp giúp lớp học không chỉ dừng ở quản lý tài khoản mà thực sự là nơi giao và theo dõi việc học.

## How It Works

Giáo viên (đã có quyền, hoặc tự đăng ký nếu đủ điều kiện) tạo một lớp, dán danh sách tên học sinh để tạo tài khoản hàng loạt hoặc mời tài khoản có sẵn. Đầu buổi học, giáo viên sinh mã đăng nhập nhanh và chiếu lên màn hình; học sinh gõ mã vào trang đăng nhập, vào thẳng hệ thống trong 15 phút. Giáo viên viết bảng tin, gửi thông báo, gán khóa học/bài tập cho lớp, xem báo cáo tiến độ định kỳ. Khi học sinh đủ lớn hoặc chuyển đi, giáo viên chạy "graduate" (chuyển sang tài khoản tự quản) hoặc "chuyển lớp". Lớp không dùng tới sẽ tự động được lưu trữ sau 30 ngày, không mất dữ liệu, mở lại được bất kỳ lúc nào.

## Key Technical Context

_(Mục này được bổ sung dần theo từng đợt C1–C8 — xem lịch sử git của file này để biết trạng thái tại một thời điểm cụ thể trong roadmap. Tại thời điểm C0, chưa có dòng code nào được viết.)_

- Bảng dự kiến: `classrooms`, `classroom_teachers`, `classroom_students`, `classroom_invites`, `classroom_announcements`, `classroom_courses`, `classroom_assignments` — tất cả độc lập với `groups` (không phụ thuộc, không mở rộng bảng đó).
- Bốn điểm neo `groupId` ẩn cần xử lý khi tách sạch khỏi `groups`: `community-social.repository.ts` (`shareGroup()` — kid-mode DM, sửa thành UNION với `classroom_students`), `group_announcements`, `group_courses`, `student_courses.enrolled_by_group_id`.
- Module backend: `apps/api/src/classroom/`. Mọi method controller prefix `classroom` (tránh trùng tên với `swagger-typescript-api` — đã có tiền lệ vấp lỗi này ở Đợt L2/L7/L10 và ở chính module `chess-class`).
- Permission mới: `classroom.read`, `classroom.create`, `classroom.manage`, `classroom.manage_own` (C1), mở rộng thêm theo từng đợt sau.
- 5 endpoint `chess-class` cũ (Đợt L5) giữ làm alias deprecated trong C2, xóa hẳn ở C8 sau khi UI mới đã thay thế.

## Test Evidence

_(Cập nhật cuối mỗi đợt.)_

- C0: không có code — chỉ tài liệu. Không có test evidence.

## Follow-up Work (explicitly not done in this pass)

- Toàn bộ C1–C8 chưa triển khai tại thời điểm viết tài liệu này (C0). Roadmap chi tiết theo từng đợt nằm trong kế hoạch triển khai nội bộ (không phải file này) và trong `docs/research/lila/05-roadmap.md` sau khi mục roadmap mới được mở.
