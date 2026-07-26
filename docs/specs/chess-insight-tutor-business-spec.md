# Chess Insight / Tutor Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, xem `docs/research/lila/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó. Công thức độ chính xác (accuracy) và các ngưỡng phân loại nước đi trong spec này **do tự thiết kế** — một hàm suy giảm lũy thừa đơn giản theo tổn thất centipawn — không phải mô hình thống kê dựa trên xác suất thắng (win%) mà lichess công bố; xem mục "Key Technical Context" để biết lý do chọn công thức khác.

## Business Overview

Đợt L8 của roadmap "còn thiếu so với lila" (`docs/research/lila/05-roadmap.md`), nối tiếp L7 (nhập môn, PR #27). Đến hết L7, mentingo có ván đấu trực tuyến (L4) nhưng **không có cách nào để học sinh hoặc giáo viên nhìn lại một ván đã chơi và biết chính xác mình mạnh/yếu ở đâu** — chỉ có kết quả thắng/thua/hòa. Đợt này bổ sung **Insight** (chấm độ chính xác từng nước đi bằng engine, phân loại theo nhiều chiều: khai cuộc/giai đoạn/loại quân/thời gian suy nghĩ) và **Tutor** (báo cáo tự động tổng hợp điểm mạnh/yếu, khả năng gỡ thế xấu, khả năng chuyển ưu thế thành thắng).

Phạm vi áp dụng: chỉ **ván đấu trực tuyến người-với-người** (`chess_matches`, từ L4) — không áp dụng cho ngân hàng ván cờ dạy học tĩnh (`chess_games`, đã có PgnViewer riêng) hay puzzle (đã có dashboard riêng từ L3, xem `docs/specs/chess-puzzle-rating-business-spec.md`). Chỉ áp dụng cho ván **kết thúc từ khi tính năng này lên production trở đi** — không backfill các ván đã kết thúc trước đó (xem "Follow-up Work").

## Who Uses It

- Học sinh có quyền `chess.insight.read` — xem báo cáo Tutor của chính mình và xem lại độ chính xác từng ván mình đã chơi/xem.
- Giáo viên/HLV, admin có thêm quyền `chess.insight.read_all` — xem báo cáo Tutor của **bất kỳ học sinh nào trong tenant** (cùng mức tin cậy với `chess.class.progress` ở L5 — không giới hạn theo lớp cụ thể, giáo viên trong một tenant trường/CLB được tin cậy xem tiến độ học sinh) và có thể yêu cầu phân tích lại một ván cụ thể.

## Feature Functions

### 1. Chấm độ chính xác ván đấu bằng engine (nền cho Insight)

- Khi một `chess_matches` kết thúc (bất kỳ lý do: chiếu hết, hết giờ, đầu hàng, hòa...) và có ít nhất 2 nước đi, một BullMQ job được xếp hàng tự động để phân tích toàn bộ ván.
- Job dùng `ChessEngineService.analyze` (Arasan nếu có cấu hình `ARASAN_PATH`, tự động về builtin minimax nếu không — **không dùng Stockfish**) để lấy điểm đánh giá (`scoreCp`, theo quy ước UCI: luôn từ góc nhìn bên sắp đi) tại vị trí sau mỗi nước đi đã lưu sẵn trong `chess_match_moves.fenAfter`. Vị trí khởi đầu (trước nước đi đầu tiên) được coi là cân bằng (0 centipawn) — mọi ván đều bắt đầu từ thế cờ chuẩn.
- Với mỗi nước đi thứ _k_ (0-indexed), tổn thất centipawn của người đi = phần chênh giữa "đánh giá tốt nhất có thể đạt được trước khi đi" (đánh giá do engine tính tại vị trí trước nước đi, vốn đã tính đến continuation tối ưu) và "đánh giá thực tế sau khi đi" (âm hoá đánh giá tại vị trí sau nước đi, vì góc nhìn đổi bên) — cách tính chuẩn phổ biến trong các công cụ phân tích cờ, không phải công thức riêng của lichess.
- **Độ chính xác mỗi nước** = `100 × e^(−tổnThấtCentipawn / 300)`, giới hạn [0, 100] — hàm suy giảm mũ tự chọn đơn giản: tổn thất 0 → 100%, ~100cp → ~72%, ~300cp → ~37%, ≥1000cp → gần 0%. **Khác hoàn toàn công thức xác suất thắng (win%) mà lichess công bố** — chọn công thức này vì dễ hiểu, dễ kiểm chứng bằng tay, không phụ thuộc mô hình thống kê từ dữ liệu hàng triệu ván của lichess.
- Mỗi nước đi được gắn nhãn chất lượng (`best` ≤10cp, `good` ≤50cp, `inaccuracy` ≤100cp, `mistake` ≤300cp, `blunder` >300cp — ngưỡng tự chọn, thuật ngữ phổ thông dùng chung trong nhiều công cụ phân tích cờ, không phải sáng tạo riêng của lichess).
- Loại quân đi (`pawn/knight/bishop/rook/queen/king`) được đọc trực tiếp từ ô xuất phát của nước đi trên thế cờ trước đó, dùng `chess.js` (đã là dependency có sẵn).
- Giai đoạn ván (`opening/middlegame/endgame`) là suy luận đơn giản tự chọn: **khai cuộc** = nước đi thứ 20 trở về trước (10 nước mỗi bên); **tàn cuộc** = tổng giá trị quân hai bên trừ vua ≤ 26 điểm (thang điểm phổ thông Tốt 1/Mã-Tượng 3/Xe 5/Hậu 9); còn lại là **trung cuộc**.
- Khai cuộc ván (một nhãn áp cho toàn bộ ván) được phân loại bằng cách khớp tiền tố dãy nước UCI của ván với một "sổ khai cuộc" rút gọn tự soạn (~20 khai cuộc phổ biến trong chương trình dạy cờ trường học — Sicilia, Pháp, Caro-Kann, Tây Ban Nha, Ý, Gambit Hậu, Ấn Độ Vua...; xem `packages/shared/src/constants/chess.ts` mục `CHESS_OPENING_BOOK`), khớp tiền tố dài nhất trước, không khớp thì gắn `unclassified`. Đây là bảng rút gọn tự soạn theo tên khai cuộc phổ thông (kiến thức cờ vua phổ biến, không sao chép dữ liệu ECO đầy đủ hay dữ liệu lila).
- Thời gian suy nghĩ mỗi nước **suy ra từ dữ liệu đã có** (không thêm cột mới trên `chess_match_moves`): hiệu giữa `createdAt` của nước đi hiện tại và `createdAt` của nước đi liền trước (hoặc `createdAt` của chính `chess_matches` cho nước đi đầu tiên), giới hạn dưới 0.
- Kết quả được **làm phẳng thành một entry mỗi nước đi** trong bảng mới `chess_game_insights` (không phải một entry mỗi ván) — cho phép truy vấn nhiều chiều linh hoạt (nhóm theo giai đoạn, theo loại quân, theo khai cuộc, theo bất kỳ khoảng ply nào) mà không cần join lại bàn cờ.
- Job phân tích lại từ đầu mỗi khi chạy (xóa các entry cũ của ván đó trước khi chèn mới) — an toàn khi BullMQ tự retry.

### 2. Báo cáo Tutor cá nhân

`GET /chess/insight/report` (của chính mình) hoặc `GET /chess/insight/users/:userId/report` (giáo viên/admin xem học sinh khác):

- **Theo giai đoạn**: độ chính xác trung bình + tổn thất centipawn trung bình cho khai cuộc/trung cuộc/tàn cuộc, đánh dấu **yếu** (đủ ≥5 nước lấy mẫu trong giai đoạn đó VÀ độ chính xác dưới trung bình chung của chính người đó) và **mạnh** (ngược lại, tối đa 3 giai đoạn) — cùng nguyên tắc so sánh nội bộ (không so tuyệt đối) đã dùng ở dashboard puzzle L3.
- **Theo loại quân**: tương tự, độ chính xác trung bình mỗi loại quân khi chính người đó điều khiển quân đó, yếu/mạnh theo cùng ngưỡng ≥5 nước.
- **Theo khai cuộc**: độ chính xác trung bình các ván bắt đầu bằng từng khai cuộc đã chơi, yếu/mạnh theo cùng ngưỡng ≥3 ván (khai cuộc hiếm mẫu hơn nước đi đơn lẻ nên ngưỡng nhỏ hơn).
- **Quản lý thời gian**: thời gian suy nghĩ trung bình theo từng giai đoạn (phát hiện mẫu "đi nhanh đầu ván, hết giờ cuối ván" hay ngược lại); đếm số ván thua vì hết giờ trên tổng số ván thua — gắn cờ "cần cải thiện quản lý thời gian" nếu ≥2 ván thua vì hết giờ VÀ chiếm ≥30% tổng số ván thua.
- **Khả năng gỡ thế xấu**: trong số các ván đã phân tích mà người này từng rơi vào thế kém (đánh giá theo góc nhìn của họ ≤ −300cp tại một thời điểm nào đó), có bao nhiêu ván họ **không thua** (thắng hoặc hòa) — hiển thị số lượng + tỉ lệ.
- **Khả năng chuyển ưu thế thành thắng**: trong số các ván mà người này từng có ưu thế lớn (đánh giá ≥ +300cp), có bao nhiêu ván họ **không thắng** (hòa hoặc thua) — số ván "để tuột mất ưu thế", hiển thị số lượng + tỉ lệ.
- **So sánh trung bình toàn tenant** (đơn giản hóa, không theo khoảng rating — xem "Follow-up Work"): độ chính xác trung bình của người này so với độ chính xác trung bình của toàn bộ người dùng đã có ván được phân tích trong tenant.
- Không đủ dữ liệu (chưa có ván nào được phân tích) → trả về báo cáo rỗng có thông báo rõ ràng, không lỗi.

### 3. Báo cáo theo từng ván (post-game review)

`GET /chess/insight/matches/:id/report` — danh sách từng nước đi của **cả hai bên** kèm điểm đánh giá, tổn thất centipawn, nhãn chất lượng, độ chính xác; cộng độ chính xác trung bình mỗi bên cho cả ván và số nước blunder/mistake mỗi bên. Dùng để học sinh/giáo viên xem lại một ván cụ thể ngay sau khi chơi xong, không chỉ xem con số tổng hợp.

### 4. Yêu cầu phân tích lại (vận hành)

`POST /chess/insight/matches/:id/analyze` (giáo viên/admin, quyền `chess.insight.read_all`) — xếp lại đúng job phân tích cho một ván cụ thể đã kết thúc. Dùng khi job tự động thất bại (ví dụ Arasan tạm thời không khả dụng lúc ván kết thúc) hoặc khi cần chạy lại sau khi nâng cấp thuật toán.

## End-User Value

Học sinh không chỉ biết mình thắng/thua mà biết **vì sao** — sai nhiều ở tàn cuộc hay khai cuộc, quân nào hay bị đi sai, khai cuộc nào chơi tốt nhất, có hay bỏ lỡ thời gian suy nghĩ hợp lý không. Giáo viên có dữ liệu thật để soạn giáo án cá nhân hóa (ví dụ: một nhóm học sinh đều yếu tàn cuộc → dạy thêm bài Tàn cuộc) thay vì chỉ dựa cảm tính từ việc quan sát trực tiếp. Khả năng "gỡ thế xấu"/"chuyển ưu thế thành thắng" dạy học sinh về tâm lý thi đấu — nhiều học sinh giỏi chiến thuật nhưng hay buông xuôi khi bị dẫn trước, hoặc mất tập trung khi đang thắng.

## How It Works

Sau khi một ván đấu trực tuyến (L4) kết thúc theo bất kỳ cách nào, hệ thống tự động xếp một job phân tích chạy nền — người chơi không cần chờ, không thấy job này. Vài giây đến vài phút sau (tùy độ dài ván và engine sẵn có), báo cáo xuất hiện ở trang "Tiến bộ của tôi" (`/chess/insight`) — có thể xem tổng hợp mọi ván đã phân tích, hoặc bấm vào một ván cụ thể từ lịch sử ván đấu để xem báo cáo chi tiết từng nước. Giáo viên vào trang quản lý lớp (đã có từ L5), chọn một học sinh, xem đúng báo cáo Tutor của học sinh đó.

## Key Technical Context

- Bảng mới `chessGameInsights` (`matchId`, `userId`, `ply`, `phase`, `pieceType`, `openingKey`, `evaluationCpBefore`, `evaluationCpAfter` — cả hai theo góc nhìn người đi nước đó, `centipawnLoss`, `accuracy`, `moveQuality`, `thinkTimeMs`, `tenantId`) — unique theo `(matchId, ply)`. Migration theo mẫu "1 migration tạo bảng + 1 migration RLS riêng" (`0195`/`0196`).
- Module mới trong `src/chess/` (không tách module riêng — thao tác trực tiếp trên `chess_matches`/`chess_match_moves` đã thuộc `ChessModule`): `chess-insight.repository.ts`, `chess-insight.service.ts`, `chess-insight.worker.ts` (BullMQ, `QUEUE_NAMES.CHESS_MATCH_INSIGHT_ANALYSIS`). `ChessMatchService.endMatch` xếp job này ngay sau `finishMatch` (cùng vị trí xếp job time-out-check ở L4), bỏ qua nếu ván có ít hơn 2 nước.
- **Không** import bất kỳ thứ gì từ `src/statistics/` dưới dạng giá trị trong toàn bộ module Insight — bài học từ L3/L4 (vòng lặp require() cấp file, xem `nestjs-file-level-circular-require-vs-module-cycle`). Insight không cần dữ liệu từ `statistics`, nên rủi ro này không phát sinh, nhưng vẫn cần cẩn trọng nếu mở rộng sau này.
- Hằng số mới trong `packages/shared/src/constants/chess.ts`: `CHESS_GAME_PHASES`, `CHESS_PIECE_TYPES`, `CHESS_MOVE_QUALITIES` (+ ngưỡng centipawn), `CHESS_OPENING_BOOK` (~20 khai cuộc, tiền tố UCI + nhãn tiếng Việt) — hàm khớp tiền tố dài nhất nằm ở `apps/api/src/chess/utils/chess-opening.utils.ts` (logic server-side, giống cách `uciMoveSequencesEqual` tách khỏi `@repo/shared`).
- Quyền mới: `chess.insight.read` (student, content_creator, trainer, admin), `chess.insight.read_all` (trainer, admin — cùng mức với `chess.class.progress`).
- Truy cập chéo người dùng: controller gate bằng `chess.insight.read` (đủ để xem báo cáo của chính mình); service tự kiểm tra thêm — nếu `userId` mục tiêu khác người gọi, bắt buộc có `chess.insight.read_all`, nếu không ném `ForbiddenException` (cùng mẫu service tự quyết định quyền theo resource đã dùng ở `ChessStudyService` từ L2).
- Job phân tích chạy tuần tự từng nước một lần Arasan/builtin mỗi nước (không song song — tránh quá tải tiến trình con Arasan); ván rất dài (>100 nước) sẽ mất nhiều thời gian hơn để phân tích xong nhưng không chặn người dùng vì chạy nền hoàn toàn.

## Test Evidence

- Unit test: phân loại giai đoạn theo ply/vật chất, phân loại loại quân từ ô xuất phát, khớp tiền tố khai cuộc (kể cả không khớp → unclassified), tính tổn thất centipawn + độ chính xác từ chuỗi `scoreCp` mẫu (kể cả trường hợp mate), gắn nhãn chất lượng nước đi theo ngưỡng, tính thời gian suy nghĩ từ `createdAt`, xác định yếu/mạnh theo giai đoạn/loại quân/khai cuộc với ngưỡng mẫu tối thiểu, xác định gỡ thế xấu/chuyển ưu thế thành thắng từ quỹ đạo đánh giá mẫu, chặn xem báo cáo người khác khi thiếu `chess.insight.read_all`.
- `pnpm lint-tsc-api`/`lint-tsc-web` sạch, `pnpm test:api`/`test:web` xanh.

## Follow-up Work (explicitly not done in this pass)

- **So sánh theo khoảng rating (peer group)**: đợt này chỉ so với trung bình toàn tenant, không nhóm theo rating gần nhau — cần tenant đủ lớn mới có ý nghĩa thống kê, một trường/CLB đơn lẻ thường chưa đủ mẫu.
- **Backfill ván đã kết thúc trước khi tính năng lên production**: đợt này chỉ phân tích ván kết thúc từ nay trở đi; có thể chạy `POST .../analyze` từng ván thủ công nếu cần, không có job hàng loạt.
- **Insight cho `chess_games` (ngân hàng PGN dạy học) và puzzle**: hai loại nội dung này đã có cơ chế xem/chấm riêng, ngoài phạm vi đợt này.
- **Biểu đồ trực quan (đường đánh giá theo từng nước)**: đợt này báo cáo hiển thị dạng bảng/số liệu, chưa có biểu đồ eval-graph tương tác.
- **"Năm nhìn lại" (recap)**: đã loại khỏi roadmap từ `03-feature-matrix.md` — giá trị thấp ở giai đoạn ra mắt.
