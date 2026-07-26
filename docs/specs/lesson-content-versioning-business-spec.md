# Lesson Content Versioning Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (xem `docs/research/learnhouse/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt 4 của roadmap "còn thiếu so với LearnHouse" (`docs/research/learnhouse/05-roadmap.md`) thêm lịch sử phiên bản cho nội dung bài học dạng rich-text (`lessons.description`). Hiện tại mỗi lần lưu bài học sẽ **ghi đè hoàn toàn** nội dung cũ — không có cách nào xem lại hoặc khôi phục một phiên bản trước, và hai người cùng sửa một bài học cùng lúc sẽ khiến người lưu sau âm thầm xóa mất thay đổi của người lưu trước mà không ai biết. Đợt này thêm: (1) lưu snapshot nội dung mỗi lần lưu, giữ tối đa 20 bản gần nhất mỗi bài học; (2) panel xem lịch sử + xem trước read-only + khôi phục một bản cũ; (3) cảnh báo xung đột khi phát hiện bài học đã bị người khác lưu đè trong lúc mình đang soạn.

## Who Uses It

- Giáo viên/trợ giảng biên soạn nội dung bài học (đã có quyền `course.update`/`course.update_own`) — xem lịch sử chỉnh sửa, khôi phục nội dung cũ nếu lỡ tay xóa/ghi đè nhầm, được cảnh báo trước khi lưu đè lên thay đổi của người khác.
- Admin tenant — không có thao tác cấu hình riêng cho tính năng này (luôn bật, không có feature flag — đây là một cải tiến an toàn dữ liệu, không phải tính năng tùy chọn có thể gây phá vỡ hành vi cũ).

## Feature Functions

### 1. Snapshot tự động khi lưu nội dung bài học

- Mỗi lần `updateLesson` ghi đè `description` (nội dung rich-text theo ngôn ngữ) của một bài học, **trước khi ghi đè**, hệ thống lưu lại một bản snapshot của nội dung **hiện tại (trước khi sửa)** vào bảng lịch sử. Snapshot chứa: `lessonId`, `language` (ngôn ngữ đang sửa), `title` + `description` tại thời điểm đó, `createdBy` (người tạo ra bản snapshot này — chính là người _trước đó_ đã lưu nội dung này, không phải người đang lưu đè), `versionNumber` (số thứ tự tăng dần theo từng bài học, bắt đầu từ 1).
- **Chỉ snapshot khi nội dung thực sự thay đổi** — nếu `description` mới giống hệt `description` cũ (so sánh giá trị, không phải tham chiếu), không tạo bản ghi lịch sử mới (tránh làm đầy lịch sử với các lần "lưu" không đổi gì, ví dụ do người dùng bấm lưu nhiều lần liên tiếp mà không sửa gì).
- **Giới hạn 20 bản/bài học**: sau khi thêm một snapshot mới, nếu tổng số bản ghi của `lessonId` đó vượt quá 20, xóa (các) bản **cũ nhất** cho đến khi còn đúng 20. Việc này không áp dụng cho các loại bài học khác (quiz, AI mentor...) ở đợt này — chỉ áp dụng cho bài học loại nội dung văn bản (`content` lesson type) vì đây là loại duy nhất có nội dung rich-text dài, dễ sửa nhầm và cần lịch sử; các loại khác để đợt sau nếu cần.
- Snapshot đầu tiên của một bài học **chỉ được tạo khi có ít nhất một lần sửa** — không tạo snapshot rỗng lúc bài học mới được tạo ra (chưa có gì để "trước khi ghi đè" cả).

### 2. Xem danh sách lịch sử + xem trước read-only

- Endpoint liệt kê tất cả snapshot của một `lessonId` theo ngôn ngữ, sắp xếp mới nhất trước, gồm: số phiên bản, thời điểm tạo, người tạo (tên hiển thị), và một đoạn trích ngắn (plain-text, cắt từ rich-text, ví dụ 100 ký tự đầu) để nhận diện nhanh phiên bản nào là phiên bản nào mà không cần mở từng bản.
- Endpoint lấy chi tiết một snapshot theo `versionId` — trả về `title`/`description` đầy đủ để hiển thị bằng component xem (read-only), tái dùng chính component `Viewer` đang hiển thị nội dung bài học cho học viên (không cho sửa trực tiếp trên bản xem trước).

### 3. Khôi phục một phiên bản cũ

- Endpoint khôi phục nhận `versionId`, ghi `title`/`description` của snapshot đó đè lên bài học hiện tại — **quá trình khôi phục bản thân nó cũng tuân theo quy tắc mục 1** (nội dung hiện tại trước khi bị ghi đè bởi bản khôi phục cũng được snapshot lại trước, để việc khôi phục nhầm cũng có thể hoàn tác được).
- Sau khi khôi phục, bài học hiển thị đúng nội dung của phiên bản đã chọn; danh sách lịch sử có thêm một bản ghi mới (nội dung ngay trước lúc khôi phục).
- Chỉ người có quyền sửa bài học đó (`course.update` hoặc `course.update_own` với đúng khóa học của mình) mới được khôi phục — dùng lại chính xác luồng kiểm tra quyền hiện có của `updateLesson`.

### 4. Cảnh báo xung đột chỉnh sửa đồng thời

- Khi mở form sửa nội dung bài học, frontend ghi nhớ giá trị `updatedAt` của bài học tại thời điểm mở (đã có sẵn trên bản ghi lesson, không cần trường mới).
- Khi bấm Lưu, nếu `updatedAt` phía server **khác** với giá trị đã ghi nhớ lúc mở form (nghĩa là ai đó đã lưu bài học này trong lúc mình đang soạn), hệ thống **không tự động ghi đè** — trả về lỗi xung đột rõ ràng, frontend hiển thị cảnh báo: "Bài học này đã được người khác cập nhật trong lúc bạn đang chỉnh sửa. Nội dung của bạn sẽ không được lưu tự động — vào lịch sử phiên bản để xem thay đổi mới nhất, hoặc lưu đè có chủ đích." Người dùng có nút "Lưu đè" để xác nhận ghi đè bất chấp (gửi lại request với cờ xác nhận), hoặc có thể vào panel lịch sử để xem bản mới nhất trước khi quyết định.
- Đây là cơ chế phát hiện xung đột kiểu optimistic locking đơn giản — không khóa bản ghi (không có "ai đang sửa"), chỉ so sánh dấu thời gian tại thời điểm lưu.

## End-User Value

Giáo viên không còn sợ mất nội dung khi lỡ tay xóa/ghi đè nhầm, hoặc khi hai người cùng sửa một bài học không biết công sức của nhau đã bị ghi đè.

## How It Works

- **Bảng mới `lesson_content_versions`**: `id`, `lessonId` (FK → `lessons.id`, `onDelete: cascade`), `language` (varchar, mã ngôn ngữ), `title` (jsonb hoặc text — lưu đúng dạng title tại thời điểm đó cho ngôn ngữ này), `description` (text/jsonb — nội dung rich-text tại thời điểm đó), `versionNumber` (integer, tăng dần theo từng `lessonId`, tính bằng cách lấy `MAX(versionNumber)+1` trong cùng transaction lúc chèn), `createdBy` (uuid, nullable — người đã tạo ra nội dung được snapshot, có thể null nếu không xác định được), `tenantId` + RLS theo đúng mẫu `chess_exercises`/`0163_enable_chess_tenant_rls.sql`.
- **Hook vào `AdminLessonService.updateLesson`** (`apps/api/src/lesson/services/adminLesson.service.ts:658`): trước khi gọi `adminLessonRepository.updateLesson`, nếu bài học là loại `content` **và** `description` mới khác `description` cũ theo ngôn ngữ đang sửa, gọi `lessonContentVersionsRepository.createSnapshot({...})` trong cùng transaction, sau đó dọn bản cũ vượt quá 20 (xóa theo `versionNumber` nhỏ nhất).
- **Kiểm tra xung đột**: `updateLesson` nhận thêm trường tùy chọn `expectedUpdatedAt` (frontend gửi kèm) — nếu có gửi và khác với `lessons.updatedAt` hiện tại trong DB, và không có cờ `forceOverwrite`, ném lỗi xung đột (HTTP 409) thay vì tiếp tục ghi.
- **Endpoint mới** (theo đúng convention gate quyền của lesson hiện có, `PERMISSIONS.COURSE_UPDATE`/`COURSE_UPDATE_OWN`):
  - `GET /lesson/:lessonId/content-versions?language=` — danh sách rút gọn.
  - `GET /lesson/content-versions/:versionId` — chi tiết đầy đủ một bản.
  - `POST /lesson/content-versions/:versionId/restore` — khôi phục (tự snapshot bản hiện tại trước).
- **Frontend**: nút "Lịch sử phiên bản" trong `ContentLessonForm.tsx` (cạnh nút Lưu/Xóa) mở một panel/dialog liệt kê các phiên bản (query mới `useLessonContentVersions`), mỗi dòng có nút "Xem" (mở dialog xem bằng `Viewer` read-only) và "Khôi phục" (gọi mutation `useRestoreLessonContentVersion`, có xác nhận trước khi thực hiện vì đây là thao tác ghi đè). `useContentLessonForm.ts` ghi nhớ `updatedAt` lúc mount, gửi kèm trong `onSubmit`; nếu server trả 409, hiển thị toast cảnh báo xung đột kèm nút "Lưu đè" gọi lại `onSubmit` với `forceOverwrite: true`.

## Non-Goals (đợt này)

- Chỉ áp dụng cho lesson loại `content` (rich-text) — không áp dụng cho quiz, AI mentor, embed, assignment, video, hay các loại bài học khác.
- Không làm diff trực quan (so sánh 2 phiên bản side-by-side) — chỉ xem từng bản riêng lẻ và khôi phục toàn bộ.
- Không giới hạn theo thời gian (ví dụ "giữ trong 30 ngày") — chỉ giới hạn theo số lượng (20 bản/bài học).
- Không áp dụng cho `articles`/`news`/`QA` — phạm vi chỉ nội dung bài học (`lessons.description`), các module khác dùng chung editor nhưng không có yêu cầu lịch sử ở đợt này.
- Không có khóa "đang có người sửa" (pessimistic locking) — chỉ phát hiện xung đột tại thời điểm lưu (optimistic).

## Key Technical Context

- Bảng mới: `apps/api/src/storage/schema/index.ts` (thêm `lessonContentVersions`).
- Migration: `apps/api/src/storage/migrations/0171_add_lesson_content_versions.sql` (tạo bảng, generated qua `drizzle-kit generate`), `apps/api/src/storage/migrations/0172_enable_lesson_content_versions_rls.sql` (RLS, hand-written theo mẫu `0163_enable_chess_tenant_rls.sql`).
- Repository/service mới: `apps/api/src/lesson/repositories/lessonContentVersions.repository.ts`, hoặc gộp method vào `adminLesson.repository.ts`/`adminLesson.service.ts` nếu gọn hơn.
- Hook điểm sửa: `apps/api/src/lesson/services/adminLesson.service.ts:658` (`updateLesson`).
- Controller: `apps/api/src/lesson/lesson.controller.ts` (thêm 3 route mới, cùng file với route `updateLesson` hiện có ở dòng 339 để nhất quán permission gate).
- Frontend: `apps/web/app/modules/Admin/EditCourse/CourseLessons/NewLesson/ContentLessonForm/ContentLessonForm.tsx`, `hooks/useContentLessonForm.ts`, query/mutation mới trong `apps/web/app/api/queries/admin/` và `apps/web/app/api/mutations/admin/`.

## Test Evidence

- `apps/api/src/lesson/repositories/__tests__/lessonContentVersions.repository.spec.ts` (5 test, Jest, Node 22): `createSnapshot` tính đúng số phiên bản tiếp theo (max+1, hoặc 1 nếu chưa có bản nào); `pruneOldVersions` không xóa gì khi số bản dưới ngưỡng, xóa đúng phần vượt ngưỡng khi đạt 20 bản; `listVersions` rút trích đúng excerpt dạng plain-text từ HTML và ghép đúng tên người tạo (hoặc `null` khi không xác định được).
- `pnpm exec tsc --noEmit` sạch cho cả `apps/api` và `apps/web` (Node 22).
- `pnpm exec eslint` sạch cho toàn bộ file mới/sửa của đợt 4 (backend + frontend).
- Toàn bộ Jest suite `apps/api` (55 suite / 334 test) và Vitest suite `apps/web` (47 file / 228 test, 12 skip có sẵn từ trước) chạy lại sau khi thêm test mới — không có hồi quy.
- Migration `0171`/`0172` áp dụng thành công lên DB dev qua `drizzle-kit migrate`; xác nhận bảng `lesson_content_versions` có RLS bật đúng theo mẫu `chess_exercises`.
- Kiểm tra thủ công qua đọc code: endpoint mới dùng lại đúng `PERMISSIONS.COURSE_UPDATE`/`COURSE_UPDATE_OWN` và `validateAccess` hiện có của `updateLesson` — không có lỗ hổng phân quyền mới; khôi phục phiên bản tái sử dụng toàn bộ luồng `updateLesson` (bao gồm snapshot bản hiện tại trước khi ghi đè), nên bản thân việc khôi phục cũng có thể hoàn tác được.

## Follow-up Work (đợt sau, nếu cần)

- Mở rộng versioning cho quiz/AI mentor/embed lesson nếu có nhu cầu thực tế.
- Diff trực quan giữa 2 phiên bản.
- Giới hạn theo thời gian thay vì/ngoài số lượng.
