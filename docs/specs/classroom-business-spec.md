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

_(Mục này được bổ sung dần theo từng đợt C1–C8 — xem lịch sử git của file này để biết trạng thái tại một thời điểm cụ thể trong roadmap.)_

- Bảng dự kiến toàn roadmap: `classrooms`, `classroom_teachers`, `classroom_students`, `classroom_invites`, `classroom_announcements`, `classroom_courses`, `classroom_assignments` — tất cả độc lập với `groups` (không phụ thuộc, không mở rộng bảng đó).
- Bốn điểm neo `groupId` ẩn cần xử lý khi tách sạch khỏi `groups`: `community-social.repository.ts` (kid-mode DM), `group_announcements`, `group_courses`, `student_courses.enrolled_by_group_id`.
- Module backend: `apps/api/src/classroom/`. Mọi method controller prefix `classroom` (tránh trùng tên với `swagger-typescript-api` — đã có tiền lệ vấp lỗi này ở Đợt L2/L7/L10 và ở chính module `chess-class`).
- 5 endpoint `chess-class` cũ (Đợt L5) giữ làm alias deprecated trong C2, xóa hẳn ở C8 sau khi UI mới đã thay thế.

### Đợt C1 (hoàn tất)

- 3 bảng mới (`classrooms`, `classroom_teachers`, `classroom_students`) — migration `0201_add_classrooms` (drizzle-kit) + `0202_enable_classrooms_rls` (custom, RLS theo tenant). `classroom_students.classroom_id` có partial index `WHERE archived_at IS NULL` để tối ưu truy vấn "học sinh đang hoạt động" — bảng này chưa có ghi nào ở C1 (chưa có endpoint tạo học sinh, đó là phạm vi C3), nhưng schema đã sẵn sàng để `assertCanRead`/kid-mode dùng ngay.
- Module `apps/api/src/classroom/` (`classroom.controller.ts` + `.service.ts` + `.repository.ts` + `.module.ts` + `schemas/classroom.schema.ts` + `classroom.types.ts` + `__tests__/`), đăng ký vào `app.module.ts`.
- 8 endpoint: `createClassroom`, `listTeachingClassrooms`, `listLearningClassrooms`, `getClassroomDetail`, `updateClassroom`, `setClassroomArchived`, `addClassroomTeacher`, `removeClassroomTeacher` — không method nào trùng tên với method có sẵn trong `apps/api/src` (xác minh bằng test tự động, xem dưới).
- Permission mới: `classroom.read` (student/trainer/admin), `classroom.create` (trainer/admin), `classroom.manage` (admin — bỏ qua kiểm tra quan hệ, quản lý mọi lớp), `classroom.manage_own` (trainer — chỉ lớp mình dạy).
- Bất biến bảo mật đã cài đặt: gate ở controller bằng `classroom.read` (thô nhất), service tự quyết theo resource qua `assertCanRead`/`assertCanManage`; **luôn 404** cho người lạ (không phải giáo viên/học sinh của lớp), **403** cho học sinh-thành-viên cố sửa lớp (họ biết lớp tồn tại, chỉ không đủ quyền); trần 10 giáo viên/lớp (`CLASSROOM_DEFAULTS.MAX_TEACHERS`, `packages/shared/src/constants/classroom.ts`); không cho xóa giáo viên cuối cùng của lớp; `viewedAt` chỉ cập nhật khi **giáo viên** (không phải học sinh) mở trang lớp — cơ sở cho auto-archive ở C4.
- **Sửa `CommunitySocialRepository.shareGroup()` → đổi tên `sharesClassmateRelationship()`**, mở rộng raw SQL thành `UNION ALL` giữa `group_users` (giữ nguyên hành vi cũ) và `classroom_students` (active-only, mới thêm) — theo đúng yêu cầu bắt buộc của kế hoạch. Cập nhật `community-social.service.ts` (`assertCanInteract`) và toàn bộ mock trong `community-social.service.spec.ts`.
- CI check tự động: `apps/api/src/__tests__/no-duplicate-controller-method-names.spec.ts` — quét mọi `*.controller.ts`, chặn **method mới** trùng tên xuyên suốt `apps/api/src` (không chặn ~20 trùng tên đã tồn tại từ trước, liệt kê rõ trong file làm baseline).
- Test key-parity locale: `apps/web/app/locales/__tests__/classroomLocaleKeyParity.spec.ts` — đảm bảo namespace `classroom.*` giống hệt nhau ở cả 7 file locale (không cố sửa phần drift có sẵn từ trước ở các namespace khác — đó là nợ kỹ thuật không liên quan tới đợt này).
- Frontend: `apps/web/app/modules/Classroom/{ClassroomList,ClassroomDetail}.page.tsx`, route `classrooms` + `classrooms/:classroomId` (trong `PublicDashboard.layout` — không phải `Admin.layout`, vì học sinh cũng cần truy cập), `routeAccessConfig.ts` cập nhật, 8 hook TanStack Query (`api/queries/use{Teaching,Learning}Classrooms.ts`, `useClassroomDetail.ts`; `api/mutations/use{Create,Update,SetArchived,AddTeacher,RemoveTeacher}Classroom*.ts`).
- Chuỗi UI mới thêm vào đủ 7 file locale (`classroom.*` + 2 khóa `pages.classrooms`/`pages.classroomDetail`), dịch thật (không machine-copy).

### Đợt C2 (hoàn tất)

- **Migration schema (0203, generated)**: thêm 2 cột cầu nối, cả hai nullable, đúng nguyên tắc additive-only — `chess_class_login_codes.classroom_id` (FK `classrooms`, chưa nơi nào đọc) và `classrooms.source_group_id` (FK `groups`, unique). `sourceGroupId` **chỉ dùng cho di trú/redirect ngược**, không service/repository nào của Classroom đọc cột này để quyết định thành viên lớp — ghi rõ bằng comment tại chỗ khai báo trong `storage/schema/index.ts` để tránh bị hiểu nhầm là một phụ thuộc thật vào `groups`.
- **Migration data (0204, custom, idempotent)**: với mỗi `groups` đang có ít nhất 1 học sinh managed (Đợt L5) → tạo 1 `classrooms` (tên lấy từ `groups.name` locale en/vi, fallback "Untitled classroom"), owner = giáo viên quản nhiều học sinh nhất trong group đó (`users.managed_by_user_id`, phá hòa bằng `owner_id`) → 1 `classroom_teachers` (owner) → N `classroom_students` (mọi học sinh managed trong group, `realName` từ `users.real_name`/`username`/fallback "Học sinh") → backfill `chess_class_login_codes.classroom_id` từ mapping. Idempotent qua `ON CONFLICT (source_group_id) DO NOTHING` ở bước tạo lớp + `NOT EXISTS` ở bước tạo học sinh — chạy lại nhiều lần cho kết quả giống hệt. **Không** `UPDATE`/`DELETE` bất kỳ dòng nào trong `groups`/`group_users`.
- **5 endpoint `chess-class` cũ**: thêm `@ApiOperation({ deprecated: true, summary: "..." })` trỏ về spec này — chỉ đổi metadata Swagger, **hành vi giữ nguyên 100%** (vẫn đọc/ghi qua `groups`/`group_users` như trước, chưa chuyển sang `classroom_students` — việc đó thuộc C3 khi tính năng tạo học sinh chuyển hẳn sang Classroom module).
- **Endpoint cầu nối mới** `GET /classroom/by-source-group/:groupId` (`getClassroomIdForSourceGroup`) — chỉ để tra `classroomId` tương ứng cho mục đích redirect UI, không thuộc bề mặt tính năng Classroom, sẽ xóa cùng lúc dọn trang admin cũ ở C8.
- **UI "redirect"**: triển khai như **banner liên kết**, không phải điều hướng ép buộc — quyết định có chủ đích khác với chữ dùng gốc trong kế hoạch ("redirect"), vì tính năng tạo học sinh/mã đăng nhập/báo cáo tiến độ **chưa được port sang Classroom module** (đó là phạm vi C3–C6); ép điều hướng ngay bây giờ sẽ làm giáo viên mất đường vào chức năng duy nhất còn hoạt động. `ChessClassManagement.page.tsx` hiện banner "đang được thay thế" + nút "Xem lớp học tương ứng" khi backfill đã có lớp khớp; `EditGroup.page.tsx` thêm nút thứ hai cạnh "Manage chess class" với cùng điều kiện. Điều hướng ép buộc thật sẽ làm ở C8 khi trang cũ bị xóa hẳn.
- 2 khóa locale mới (`chessClass.deprecatedBanner.text`/`.link`) chỉ thêm vào **en/vi** — theo đúng hiện trạng namespace `chessClass` (vốn đã chỉ tồn tại ở 2 locale này từ Đợt L5, `pl`/`de`/`lt`/`cs`/`es` chưa từng có namespace này; đây là nợ kỹ thuật có sẵn, không phải do đợt này tạo ra, và nằm ngoài phạm vi `classroomLocaleKeyParity.spec.ts` vốn chỉ kiểm namespace `classroom.*` mới).

## Test Evidence

### Đợt C1

- Backend: `pnpm --filter=api exec tsc --noEmit` sạch; eslint sạch trên toàn bộ file mới/sửa; `pnpm --filter=api test` — 80/80 test suite, 627/627 test pass (bao gồm `classroom.service.spec.ts` — 15 test case cho `assertCanRead`/`assertCanManage`/trần giáo viên/guard giáo viên cuối cùng; `no-duplicate-controller-method-names.spec.ts`; `community-social.service.spec.ts` sau khi đổi tên `shareGroup`→`sharesClassmateRelationship`).
- Frontend: `pnpm --filter=web exec tsc --noEmit` sạch; eslint sạch; `pnpm --filter=web test` — 51/51 test suite, 264/264 test pass (bao gồm `classroomLocaleKeyParity.spec.ts` — 7/7).
- **Xác minh qua HTTP thật** (Postgres + Redis thật qua Docker, API chạy `nest start` thật, đăng nhập bằng 2 tài khoản trainer đã seed sẵn của `tenant1.lms.localhost`): tạo lớp → xem chi tiết (xác nhận `viewedAt` cập nhật) → sửa tên → thêm giáo viên thứ 2 → giáo viên đầu tự rời lớp → xác nhận giáo viên đã rời nhận **404** khi xem/sửa lớp (không phải 403 — đúng quy tắc "không lộ tồn tại") → giáo viên còn lại thử tự xóa mình (giáo viên cuối cùng) → nhận đúng lỗi `classroom.error.lastTeacher` (400) → archive → reopen — toàn bộ đúng như kỳ vọng. Dữ liệu test đã dọn sau khi xác minh xong.
- **Xác minh riêng cho điểm rủi ro cao nhất của kế hoạch** (sửa `shareGroup`): chạy trực tiếp câu SQL `UNION ALL` mới trong một transaction `ROLLBACK` (không ghi dữ liệu thật) trên Postgres thật — xác nhận trả về 1 dòng khi 2 user cùng là thành viên **đang hoạt động** của một `classroom`, và trả về 0 dòng khi một trong hai đã bị archive khỏi lớp (`archived_at IS NOT NULL`) — đúng ngữ nghĩa "chỉ tính bạn cùng lớp đang học".
- `pnpm --filter=api db:migrate` chạy thật trên Postgres dev (Docker), áp dụng `0201`/`0202` thành công, không lỗi.
- `pnpm generate:client` chạy thật (API dev server sống, sinh `api-schema.json` qua Swagger, sinh `generated-api.ts` qua `swagger-typescript-api`) — xác nhận 8 method `classroomController*` được đặt tên đúng, không ghi đè type của method nào khác.

**Giới hạn đã biết**: chưa kiểm tra qua trình duyệt thật (Playwright/thao tác chuột) trong đợt này — chỉ xác minh UI qua `tsc`/eslint/Vitest sạch và luồng API thật qua HTTP trực tiếp (không qua Caddy, vì máy dev không có domain `*.lms.localhost` trỏ Caddy sẵn sàng trong phiên này — gọi thẳng `localhost:3000` kèm header `x-forwarded-host`/`x-forwarded-proto` giả lập đúng tenant). Chưa kiểm tra lại luồng kid-mode DM qua tầng API/service đầy đủ với tài khoản managed thật (managed account chỉ tạo được từ Đợt C3 trở đi) — chỉ xác minh câu SQL cốt lõi trực tiếp trên DB thật; sẽ kiểm tra lại toàn luồng khi C3 có endpoint tạo học sinh managed.

### Đợt C2

- Backend: `pnpm --filter=api exec tsc --noEmit` sạch; eslint sạch; `pnpm --filter=api test` — 80/80 test suite, 627/627 test pass (không hồi quy so với C1; `chess-class.service.spec.ts` vẫn xanh nguyên vẹn — xác nhận thêm `@ApiOperation` không đổi hành vi runtime).
- Frontend: `pnpm --filter=web exec tsc --noEmit` sạch; eslint sạch; `pnpm --filter=web test` — 51/51 test suite, 264/264 test pass.
- `pnpm --filter=api db:migrate` chạy thật trên Postgres dev (Docker), áp dụng `0203`/`0204` thành công. Xác nhận trên DB dev thật: 0 dòng backfill (đúng — dev DB hiện chưa có tài khoản managed nào, `is_managed_account = true` đếm được 0 dòng, không phải lỗi).
- **Xác minh logic backfill với dữ liệu thật** (transaction `ROLLBACK`, không ghi dữ liệu thật): tạo 1 group test + 2 user managed (cùng `managed_by_user_id`) + 2 dòng `group_users`, chạy nguyên văn 3 câu lệnh của migration `0204` → xác nhận đúng 1 `classrooms` (tên lấy đúng từ `groups.name->>'en'`, `owner_id` đúng giáo viên), đúng 1 `classroom_teachers`, đúng 2 `classroom_students` (tên thật lấy đúng từ `users.real_name`) — khớp 100% kỳ vọng.
- `pnpm generate:client` chạy lại thật sau khi thêm endpoint cầu nối — xác nhận `apps/api/src/swagger/api-schema.json` có đúng 5 endpoint `deprecated: true`; `classroomControllerGetClassroomIdForSourceGroup` sinh đúng tên, không trùng.
- Smoke test HTTP thật: `GET /api/classroom/by-source-group/:groupId` với group không tồn tại trong bảng backfill → trả `{ classroomId: null }`, HTTP 200 (không lỗi) — đúng hành vi mong đợi cho trang cũ khi chưa có lớp tương ứng.

## Follow-up Work (explicitly not done in this pass)

- C3–C8 chưa triển khai tại thời điểm C2 kết thúc.
- Kiểm tra kid-mode DM đầy đủ qua tầng API (không chỉ SQL) — cần tài khoản managed, hoãn tới sau C3.
- Kiểm tra UI bằng trình duyệt thật/Playwright — hoãn tới C8 (đợt E2E).
- Backfill data thật (không phải test data rolled-back) chưa từng chạy trên một dev DB có tài khoản managed thật — sẽ xác nhận lại khi tenant nào đó thực sự có dữ liệu L5 cũ trong quá trình vận hành.
- Namespace `chessClass.*` vẫn thiếu hoàn toàn ở `pl`/`de`/`lt`/`cs`/`es` (nợ kỹ thuật có từ Đợt L5, không phải do C2 tạo ra) — không backfill toàn bộ namespace trong đợt này vì ngoài phạm vi.
