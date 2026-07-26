# Chess Learn / Coordinate Trainer / Practice Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, xem `docs/research/lila/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó. Nội dung bài học (vị trí FEN mẫu, văn bản hướng dẫn tiếng Việt) do tự viết mới hoàn toàn cho chương trình nhập môn cờ vua phổ thông, không sao chép nội dung Learn của lila.

## Business Overview

Đợt L7 của roadmap "còn thiếu so với lila" (`docs/research/lila/05-roadmap.md`), nối tiếp L6 (giải đấu, PR #26). Đến hết L6, mentingo phục vụ tốt người đã biết chơi cờ nhưng **chưa có lộ trình nhập môn** cho học sinh hoàn toàn mới. Đợt này bổ sung ba mảng độc lập nhưng bổ trợ nhau: **Learn** (chuỗi bài học tương tác dạy luật chơi từ số 0), **Coordinate trainer** (luyện phản xạ gọi tên ô cờ), và **Practice** (kích hoạt trường `practiceGoal` đã có sẵn từ L2 nhưng chưa được chấm điểm tự động).

## Who Uses It

- Học sinh có quyền `chess.learn.read` — học từng bài Learn, chơi Coordinate trainer, làm Practice.
- Giáo viên có quyền `chess.learn.read` như học sinh (không có thao tác quản lý riêng — nội dung Learn cố định, không soạn qua UI ở đợt này).

## Feature Functions

### 1. Learn — chuỗi bài nhập môn

- Nội dung cố định, viết sẵn bằng tiếng Việt trong mã nguồn (`packages/shared/src/constants/chessLearn.ts`), **không phải nội dung do giáo viên soạn qua UI** ở đợt này (xem "Follow-up Work").
- Cấu trúc **stage × level**: mỗi stage là một chủ đề luật chơi (theo đúng thứ tự học tự nhiên): nước đi từng quân → ăn quân → bảo vệ quân → chiếu → chiếu hết → hòa cờ → nhập thành → bắt tốt qua đường → đòn đôi (fork) → giá trị quân. Mỗi stage gồm nhiều level, mỗi level là một thế cờ (FEN) + yêu cầu tìm đúng nước đi (hoặc chuỗi nước đi) + gợi ý hiển thị khi cần.
- `GET /chess-learn/stages`: danh sách stage kèm % hoàn thành của người dùng hiện tại.
- `GET /chess-learn/stages/:stageId/levels/:levelId`: nội dung một level (FEN, mô tả, không trả lời đáp án).
- `POST /chess-learn/stages/:stageId/levels/:levelId/attempt`: học sinh gửi nước đi, server so khớp với đáp án đúng (tái dùng `uciMoveSequencesEqual` đã có từ L3, không viết lại logic so khớp), trả về đúng/sai; đúng thì ghi nhận hoàn thành.
- Tiến độ lưu theo `(userId, stageId, levelId)` — hoàn thành một lần là tính hoàn thành vĩnh viễn (không yêu cầu làm lại).

### 2. Luyện tọa độ (Coordinate trainer)

- Hoàn toàn phía client, không cần lưu trạng thái phía server ở đợt này (xem "Follow-up Work" về lưu điểm cao nhất).
- Hai chế độ: **tìm ô theo tên** (hệ thống gọi tên ô, ví dụ "e4", học sinh bấm đúng ô trên bàn cờ trống) và **gọi tên ô** (hệ thống chỉ một ô, học sinh gõ đúng tên). Mỗi chế độ chọn được **màu bàn cờ nhìn từ góc nào** (trắng/đen) — luyện phản xạ từ cả hai phía.
- Đếm số ô trả lời đúng trong 30 giây, hiển thị điểm cuối giờ.

### 3. Practice — kích hoạt chấm điểm mục tiêu chương

- L2 đã có trường `chessStudyChapters.practiceGoal` (văn bản tự do, chỉ hiển thị, chưa chấm được — xem spec L2 mục "Follow-up Work"). Đợt này thêm **hai cột có cấu trúc** để chấm tự động: `practiceGoalType` (`checkmate_in_n` | `draw` | `reach_material_advantage`) và `practiceGoalTargetValue` (số nước tối đa cho `checkmate_in_n`, hoặc ngưỡng chênh lệch giá trị quân cho `reach_material_advantage`, null cho `draw`). Trường `practiceGoal` cũ giữ nguyên làm nhãn hiển thị tiếng Việt cho học sinh (ví dụ "Chiếu hết trong 3 nước").
- `POST /chess/studies/:id/chapters/:chapterId/practice-attempt` — học sinh chơi từ `rootFen` của chapter (tự do đi quân, không theo `moveNodes` có sẵn — khác gamebook), gửi lên chuỗi nước đi UCI đã chơi. Server phát lại toàn bộ chuỗi bằng `chess.js` (không tin kết quả từ client) để xác nhận đạt mục tiêu: `checkmate_in_n` → thế cuối là chiếu hết VÀ số nước ≤ ngưỡng; `draw` → thế cuối là hòa (hòa vua bí/hết nước đi hợp lệ/lặp lại 3 lần/50 nước, tái dùng đúng phát hiện đã dùng ở L4); `reach_material_advantage` → tính tổng giá trị quân mỗi bên ở thế cuối (Tốt 1, Mã/Tượng 3, Xe 5, Hậu 9 — thang điểm phổ thông), chênh lệch ≥ ngưỡng.
- Ghi nhận **số nước tối thiểu đã dùng để đạt mục tiêu** (bảng mới `chess_practice_attempts`) — khuyến khích học sinh tìm lời giải tối ưu, không chỉ đạt mục tiêu bằng mọi giá.
- `GET /chess/studies/:id/continue`: trả về chapter đầu tiên (theo `displayOrder`) trong study mà học sinh **chưa đạt mục tiêu Practice** (hoặc chưa xem, với chapter không phải practice) — "học tiếp từ đâu".

## End-User Value

Học sinh hoàn toàn mới học được luật chơi cờ theo từng bước nhỏ có phản hồi ngay (đúng/sai), không cần giáo viên kèm 1-1 liên tục. Luyện tọa độ giúp học sinh đọc bàn cờ nhanh hơn — nền tảng cho việc ghi biên bản ván đấu (algebraic notation) sau này. Practice biến các chapter "mục tiêu" (vốn đã soạn được từ L2 nhưng chỉ mang tính tham khảo) thành bài tập có chấm điểm thật, khuyến khích tư duy tìm lời giải ngắn nhất.

## How It Works

Học sinh mới vào mục "Nhập môn", thấy danh sách stage theo thứ tự (stage sau khóa cho đến khi hoàn thành phần lớn stage trước — xem "Follow-up Work" về khóa chặt tuyệt đối), chọn một level, thử nước đi trên bàn cờ tương tác (tái dùng `ChessBoard` sẵn có), sai thì được gợi ý, đúng thì tự động chuyển level tiếp theo. Luyện tọa độ là một minigame độc lập, vào chơi ngay không cần điều kiện tiên quyết. Với Practice, giáo viên đã soạn sẵn chapter có mục tiêu từ trang biên tập Study (L2, chọn chế độ chapter phù hợp và điền mục tiêu có cấu trúc mới), học sinh vào chơi tự do từ vị trí gốc, khi cho là đã đạt mục tiêu thì bấm "Nộp bài", hệ thống chấm và báo kết quả + số nước đã dùng, có thể thử lại để tìm lời giải ngắn hơn.

## Key Technical Context

- Nội dung Learn là **dữ liệu tĩnh trong mã nguồn** (`packages/shared/src/constants/chessLearn.ts`): mảng stage, mỗi stage có `id`, nhãn tiếng Việt, mảng level (`id`, `fen`, `solutionUci: string[]` — cho phép nhiều nước đúng, `hint`). Không có bảng DB cho nội dung — chỉ có bảng tiến độ.
- Bảng mới: `chessLearnProgress` (userId, stageId, levelId, completedAt, tenantId — unique theo `(userId, stageId, levelId)`), `chessPracticeAttempts` (chapterId, userId, movesUsed, achievedGoal boolean, createdAt, tenantId). Migration theo mẫu "1 migration tạo bảng + 1 migration RLS riêng".
- Mở rộng `chessStudyChapters`: `practiceGoalType` (`$type<ChessPracticeGoalType>`, nullable), `practiceGoalTargetValue` (integer, nullable) — cột mới, không phá dữ liệu cũ (mọi chapter hiện có giữ nguyên `practiceGoalType = null`, không chấm được cho đến khi giáo viên điền).
- Module mới `apps/api/src/chess-learn/` (stages/levels tĩnh + tiến độ) — tách khỏi `src/chess/` vì không thao tác trên `chess_studies`/`chess_matches`. Endpoint Practice-attempt nằm trong `ChessStudyController`/`ChessStudyService` hiện có (L2), vì nó thao tác trực tiếp trên `chessStudyChapters` — không tạo module riêng cho một endpoint.
- Validate nước đi Learn/Practice đều dùng `chess.js` phía server (không tin client) — tái dùng `uciMoveSequencesEqual` (L3) cho Learn, và logic phát hiện hòa đã dùng ở L4 cho Practice.
- Permission mới: `chess.learn.read` (không có permission "manage" — nội dung Learn cố định trong mã nguồn, không có UI soạn thảo ở đợt này).

## Test Evidence

- Unit test: so khớp nước đi Learn đúng/sai (kể cả khi có nhiều đáp án đúng), chấm Practice đúng cho cả 3 loại mục tiêu (chiếu hết đúng số nước/quá số nước cho phép/không phải chiếu hết, hòa cờ theo từng kiểu hòa, đạt/không đạt ngưỡng chênh lệch vật chất), tính tổng giá trị quân từ FEN đúng, ghi nhận đúng số nước tối thiểu khi thử lại nhiều lần, "học tiếp từ đâu" trả đúng chapter đầu tiên chưa đạt mục tiêu.
- `pnpm lint-tsc-api`/`lint-tsc-web` sạch, `pnpm test:api`/`test:web` xanh.

## Follow-up Work (explicitly not done in this pass)

- **Soạn nội dung Learn qua UI cho giáo viên**: đợt này nội dung cố định trong mã nguồn; một CMS nhập môn tùy biến được là công việc lớn riêng, cân nhắc sau khi có phản hồi thực tế về chương trình học hiện tại.
- **Khóa stage tuần tự bắt buộc**: đợt này mọi stage đều mở, chỉ hiển thị % hoàn thành — chưa chặn học sinh nhảy cóc sang stage sau khi chưa xong stage trước.
- **Lưu điểm cao nhất Coordinate trainer**: đợt này chỉ hiển thị điểm cuối phiên, không lưu lịch sử/bảng xếp hạng cá nhân.
- **Gắn Learn/Practice vào `learning_paths`**: kế hoạch gốc có nêu, đợt này chưa nối — giáo viên chưa xếp được bài Learn/Practice cụ thể vào một lộ trình học có sẵn; cân nhắc bổ sung khi có nhu cầu thực tế.
