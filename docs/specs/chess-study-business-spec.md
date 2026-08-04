# Chess Study/Chapter Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, xem `docs/research/lila/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt L2 của roadmap "còn thiếu so với lila" (`docs/research/lila/05-roadmap.md`). Đợt L1 đã cho bàn cờ khả năng vẽ chú thích, glyph và cây biến — nhưng toàn bộ trạng thái đó chỉ sống trong state React của một phiên trình duyệt, biến mất khi tải lại trang. mentingo chưa có khái niệm "bài giảng cờ có thể lưu, chia sẻ, và học lại nhiều lần": giáo viên không có cách nào chuẩn bị trước một bài phân tích nhiều chương, mời đồng nghiệp cùng biên tập, hay giao cho học sinh một chuỗi thế cờ có mục tiêu cụ thể.

Đợt này bổ sung **Study** (một bài giảng cờ, gồm nhiều **Chapter**) — mỗi chapter là một cây biến đã lưu server, có thể ở một trong ba chế độ: **thường** (xem/phân tích tự do), **gamebook** (hỏi–đáp, học sinh phải tự tìm nước đúng trước khi xem đáp án), hoặc **conceal** (che các nước từ một ply nhất định trở đi — dùng làm bài đố). Study có 3 mức hiển thị (công khai/không niêm yết/riêng tư) và phân quyền thành viên 2 mức (đọc/ghi), có thể nhân bản (clone) từ một study khác.

## Who Uses It

- Giáo viên/HLV cờ có quyền `chess.study.create` — tạo và biên tập study của chính mình.
- Thành viên được mời với vai trò `write` — cùng biên tập một study không phải của mình.
- Học sinh/người xem có quyền `chess.study.read` — xem study công khai, hoặc study riêng tư/không niêm yết mà mình được mời làm thành viên.
- Admin (`chess.study.manage`) — quản lý mọi study trong tenant, không phụ thuộc quyền sở hữu.

## Feature Functions

### 1. Study (bài giảng)

- Tạo study mới: tiêu đề, mô tả (tùy chọn), mức hiển thị (`public`/`private`, mặc định `private`), danh sách chủ đề (tái dùng `CHESS_TOPICS` đã có ở L0/L3).
- Sửa/xóa study — chỉ chủ sở hữu, thành viên có quyền `write`, hoặc admin.
- Liệt kê study: phân trang, tìm theo tiêu đề, lọc theo chủ đề, lọc "của tôi" (`mine=true`). Kết quả chỉ gồm study công khai, study do chính người xem sở hữu, hoặc study mà người xem là thành viên — thực thi ở tầng truy vấn (không lọc phía client).
- **Nhân bản (clone)**: tạo một study mới thuộc sở hữu người nhân bản, sao chép toàn bộ chapter hiện có; study gốc được ghi nhận qua `sourceStudyId`. Điều kiện: người nhân bản phải có quyền đọc study gốc (không cần quyền ghi) — giống lila, "xem được thì nhân bản được".

### 2. Chapter (chương)

- Mỗi chapter thuộc về đúng một study, có: tiêu đề, FEN gốc (`rootFen`, mặc định vị trí chuẩn), cây biến đã lưu (`moveNodes` — xem mục Key Technical Context), thứ tự hiển thị trong study.
- **3 chế độ chapter**:
  - `normal` — xem/phân tích tự do, giống trang Analysis ở L1 nhưng đã lưu server và có thể chia sẻ.
  - `gamebook` — ẩn cây biến, học sinh phải tự đi nước trên bàn; đi đúng nước chính (mainline) mới được đi tiếp, đi sai hiện phản hồi rồi cho thử lại; xem được toàn bộ bình luận/glyph chỉ sau khi hoàn thành hoặc bấm "xem đáp án".
  - `conceal` — che các nước từ ply thứ `concealFromPly` trở đi cho tới khi người xem tự đi tới đó; dùng để giao bài tập "tìm nước tiếp theo" trên một ván đã có sẵn.
- `practiceGoal` (tùy chọn, văn bản tự do): mục tiêu của chapter, ví dụ "Chiếu hết trong 3 nước" hay "Tìm cách hòa" — hiển thị cho người học, không được máy chấm tự động ở đợt này (việc chấm điểm theo mục tiêu thuộc phạm vi Đợt L7 — Practice).
- Thêm/sửa/xóa chapter — yêu cầu quyền `write` trên study cha.
- **Sắp xếp lại thứ tự chapter** (`reorder`): gửi đúng tập hợp id chapter hiện có theo thứ tự mới; từ chối nếu thiếu/thừa id (chống mất đồng bộ dữ liệu).

### 3. Phân quyền & thành viên

- 3 mức hiển thị đã lược còn 2 ở đợt này (`public`, `private`) — bỏ "không niêm yết" (`unlisted`) so với kế hoạch gốc vì không có giá trị nghiệp vụ rõ ràng khi chưa có tính năng chia sẻ liên kết công khai không cần đăng nhập; có thể bổ sung khi có nhu cầu thực tế.
- Thành viên có 2 vai trò: `read` (xem study riêng tư), `write` (cùng biên tập).
- Thêm/xóa thành viên — chỉ chủ sở hữu hoặc admin (`chess.study.manage`); không thể thêm chính chủ sở hữu làm thành viên (đã có toàn quyền).
- `canWrite` được tính và trả kèm mỗi study trong response — cho phép frontend hiện/ẩn nút biên tập mà không cần tự suy luận lại logic phân quyền.

## End-User Value

Giáo viên chuẩn bị bài giảng cờ trước ở nhà (nhiều chương, có bình luận, có phần hỏi-đáp gamebook), rồi dùng lại nhiều lần cho nhiều lớp thay vì phân tích lại từ đầu mỗi buổi học. Đồng nghiệp có thể cùng biên tập một study. Học sinh học lại đúng bài giảng đã lưu, luyện gamebook để tự tìm nước đi thay vì chỉ xem thụ động, và có thể nhân bản một study công khai để tự chú thích thêm cho riêng mình.

## How It Works

### Luồng tạo và biên tập

Giáo viên tạo study mới (tiêu đề + chủ đề), sau đó thêm từng chapter — mỗi chapter khởi tạo từ một FEN gốc (mặc định vị trí chuẩn) rồi biên tập cây biến bằng đúng bộ công cụ đã có từ Đợt L1 (`useMoveTree`, `MoveTreeView`, `BoardShapesOverlay`, glyph) ở phía client; khi lưu, cây biến được làm phẳng thành `moveNodes` (danh sách kề — xem Key Technical Context) và gửi lên server nguyên khối qua `PATCH /chess/studies/:id/chapters/:chapterId`. Không có autosave từng nước — biên tập viên bấm "Lưu" sau khi chỉnh xong một chapter (đơn giản hóa so với lila, phù hợp quy mô lớp học).

### Luồng xem/học

Người xem mở study, thấy danh sách chapter theo `displayOrder`; chọn một chapter để xem cây biến trên bàn cờ (chế độ `normal`), hoặc được dẫn vào luồng hỏi-đáp (chế độ `gamebook`: chỉ hiện thế cờ hiện tại, đợi người dùng tự đi; so khớp nước đi với nhánh chính tại đúng vị trí trong cây; đi sai → không cập nhật bàn, hiện thông báo thử lại; đi đúng → tiến tới nút tiếp theo, hiện bình luận/glyph của nút vừa qua nếu có), hoặc chế độ `conceal` (các nước từ `concealFromPly` trở đi hiển thị dạng ẩn "\*\*\*" cho tới khi người xem tự đi đúng nước đó trên bàn, sau đó lộ ra bình thường).

### Nhúng vào khóa học

Đợt này **không** thêm lesson type mới hay TipTap block riêng cho study (khác với kế hoạch gốc trong `05-roadmap.md`) — quyết định lùi lại vì việc nhúng an toàn (kiểm tra quyền đọc study từ trong ngữ cảnh một bài học khóa học, xử lý study bị xóa sau khi đã nhúng...) cần thiết kế riêng và không chặn giá trị cốt lõi của Study/Chapter như một tính năng độc lập trước. Xem "Follow-up Work".

## Key Technical Context

- Backend module: `apps/api/src/chess/` — thêm `chess-study.repository.ts`, `chess-study.service.ts`, `schemas/chess-study.schema.ts`; các endpoint mới nối vào `chess.controller.ts` hiện có (không tạo controller/module riêng, theo đúng cách L1/PR#19 đã tổ chức module `chess`).
- Bảng mới (`apps/api/src/storage/schema/index.ts`): `chessStudies` (authorId FK set-null, title, description, visibility, topics `text[]`, `sourceStudyId` tự tham chiếu, `chapterCount`, tenantId), `chessStudyChapters` (studyId FK cascade, title, rootFen, `moveNodes` jsonb array, mode, concealFromPly, practiceGoal, displayOrder, tenantId), `chessStudyMembers` (studyId/userId FK cascade, role, tenantId, unique index studyId+userId). Migration `0183_add_chess_studies.sql` (tạo bảng) + `0184_enable_chess_studies_rls.sql` (bật RLS, policy `tenant_isolation` trên cả 3 bảng) — theo đúng mẫu "1 migration tạo bảng + 1 migration RLS riêng" đã dùng cho `chess_exercises`.
- **Cây biến làm phẳng thành adjacency list** (`ChessStudyFlatMoveNode: {id, parentId, uci, san, fenAfter, comment?, glyph?, order}`) khi lưu server, thay vì cây đệ quy `MoveNode[]` phía client (L1) — tránh TypeBox phải khai schema đệ quy (không hỗ trợ tốt), đồng thời khớp quy ước repo đã dùng cho các cấu trúc jsonb khác (ví dụ `assignmentTaskContentsSchema`). Client tự dựng lại cây từ danh sách phẳng khi tải chapter, dùng lại `moveTree.ts` của L1 (hàm dựng cây mới thêm ở đợt này, không sửa cấu trúc `MoveTree`/`MoveNode` hiện có).
- Permission mới (`packages/shared/src/constants/permissions.ts`): `chess.study.read`, `chess.study.create`, `chess.study.manage`, `chess.study.manage_own` — gán: STUDENT (read), CONTENT_CREATOR (read + create + manage_own), TRAINER (read), ADMIN (cả 4). `manage_own` hiện chưa được `ChessStudyService` dùng riêng (logic sở hữu dựa trực tiếp vào so khớp `authorId`, không qua permission `manage_own`) — giữ permission này khai báo sẵn để nhất quán với mẫu RBAC của các module khác trong repo (ví dụ `assignment.manage_own`), dùng thật khi có nhu cầu phân biệt "sở hữu" theo permission thay vì theo cột `authorId`.
- Hằng số mới (`packages/shared/src/constants/chess.ts`): `CHESS_STUDY_VISIBILITY` (`PUBLIC`/`PRIVATE`), `CHESS_STUDY_MEMBER_ROLES` (`READ`/`WRITE`), `CHESS_STUDY_CHAPTER_MODES` (`NORMAL`/`GAMEBOOK`/`CONCEAL`).
- Truy vấn hiển thị (`ChessStudyRepository.listStudies`): điều kiện `visibility = PUBLIC OR authorId = viewerId OR EXISTS(SELECT 1 FROM chess_study_members WHERE studyId = ... AND userId = viewerId)` — thực thi ngay trong câu SQL liệt kê, không lọc hậu kỳ.
- `ChessStudyService` tách rõ 3 mức kiểm tra quyền qua các hàm private: `assertCanRead` (công khai hoặc chủ sở hữu hoặc admin hoặc có role thành viên bất kỳ), `assertCanWrite` (chủ sở hữu hoặc admin hoặc role thành viên = `write`), `assertCanManage` (chỉ chủ sở hữu hoặc admin — dùng cho xóa study, thêm/xóa thành viên).
- `cloneStudy`/`createChapter`/`deleteChapter` ở `ChessStudyRepository` chạy trong transaction Drizzle — nhân bản study phải sao chép toàn bộ chapter nguyên tử (không để lại study clone với chapter thiếu nếu giữa chừng lỗi); xóa chapter cập nhật lại `chapterCount` của study cha trong cùng transaction.
- Endpoint theo mẫu `@Validate({request:[...]})` của `nestjs-typebox` — `@CurrentUser()` luôn là tham số cuối cùng, tham số `@Query()` optional khai kiểu TS không có dấu `?` (đúng quy ước đã áp dụng cho `listStudies`, xem ghi chú kỹ thuật ở `listPlaySessions`).
- Đợt này **không** đổi `apps/web` — toàn bộ là backend (schema, repository, service, controller, test). Frontend Study/Chapter dự kiến hoàn thiện trong cùng đợt L2 trước khi merge (xem "Follow-up Work" nếu bị lùi sang một PR riêng).

## Test Evidence

- `apps/api/src/chess/__tests__/chess-study.service.spec.ts` — 19 test Jest: quyền đọc/ghi/quản lý theo từng vai trò (chủ sở hữu, thành viên read/write, admin, người ngoài cuộc), luồng tạo/sửa/xóa study và chapter, điều kiện nhân bản (chỉ cần quyền đọc), điều kiện reorder (từ chối khi tập id không khớp), điều kiện thêm thành viên (từ chối thêm chính chủ sở hữu).
- `pnpm run generate:client` chạy sạch sau khi tái sinh `api-schema.json` — `apps/web/app/api/generated-api.ts` có đầy đủ 15 phương thức mới (`chessControllerListStudies`, `CreateStudy`, `GetStudy`, `UpdateStudy`, `DeleteStudy`, `CloneStudy`, `*Chapter*`, `*Member*`) khớp `chess.controller.ts`.
- `tsc --noEmit`/`eslint` cho `apps/api` sạch cho các file mới (xác nhận riêng lẻ khi viết; xem lại lần cuối trong bước verify toàn bộ trước khi commit).

## Follow-up Work (explicitly not done in this pass)

> **Cập nhật 2026-08-04 (S6):** roadmap Study depth **S0–S6 đã triển khai**. Teardown: `docs/research/lila/07-study-deep-teardown.md`. Roadmap: `docs/research/lila/08-study-roadmap.md`.

### Đã làm trong S\*

- **S1** (#43): Import/export PGN, orientation, description, pgnTags.
- **S2** (#44): Shapes persist + gamebook hint/onWrong/onCorrect.
- **S3** (#45): Discovery mine/shared/all, invite email/username, allowClone.
- **S4** (#46): Lesson type `chess_study` + `lesson_chess_studies` embed.
- **S5** (#47): Autosave debounce + `expectedUpdatedAt` conflict 409.
- **S6**: E2E smoke list page, i18n en/vi keys, HANDOVER/roadmap.

### Vẫn ngoài phạm vi (có chủ đích)

- **Like/lượt thích study** — không làm trong S\* (tenant trường).
- **Unlisted visibility** — không làm trong S\*.
- **Realtime collab full tree / chat study / presence room** — hoãn sau S\*.
- **Swagger regenerate** — chạy API dev + `pnpm generate:client` khi deploy để bỏ cast tạm trên web.
