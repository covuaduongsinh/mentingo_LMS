# Chess Puzzle & Rating Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, xem `docs/research/lila/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó. Thuật toán Glicko-2 cài đặt từ đặc tả toán học public-domain của Mark Glickman (xem "Key Technical Context"), không nhìn code lila.

## Business Overview

Đợt L3 của roadmap "còn thiếu so với lila" (`docs/research/lila/05-roadmap.md`). Ngân hàng bài tập hiện tại (`chess_exercises`) là tĩnh: không có độ khó thích ứng theo trình độ người học, không có hệ số đánh giá trình độ, không theo dõi người học yếu ở chủ đề nào. Đợt này bổ sung một **hệ thống luyện puzzle thích ứng** hoàn toàn mới, song song và độc lập với `chess_exercises`: mỗi người học có một **hệ số Glicko-2 riêng cho puzzle**, hệ thống chọn puzzle có độ khó phù hợp trình độ hiện tại, và một **dashboard** tổng hợp cho biết người học mạnh/yếu ở chủ đề chiến thuật (motif) nào.

## Who Uses It

- Học sinh có quyền `chess.puzzle.read` — giải puzzle thích ứng, xem hệ số của mình, xem dashboard cá nhân.
- Giáo viên/Admin có quyền `chess.puzzle.manage` — nhập (import) bộ puzzle mới từ dữ liệu CC0.

## Feature Functions

### 1. Ngân hàng puzzle (nhập từ dữ liệu CC0)

- Bảng `chess_puzzles`: vị trí FEN, chuỗi nước giải (UCI), hệ số khó (rating puzzle riêng, độc lập với rating người dùng), danh sách chủ đề/motif chiến thuật, độ phổ biến (tùy chọn), nguồn gốc (`cc0_import` hoặc `manual`).
- **Nhập theo lô**: admin tải lên một file CSV theo đúng cấu trúc cột của Lichess Puzzle Database (CC0 — `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags`), hệ thống lọc theo khoảng rating và/hoặc theo chủ đề trước khi ghi vào DB (tránh nhập nguyên khối hàng triệu dòng nếu không cần). Job chạy nền qua BullMQ (dữ liệu có thể tới hàng chục nghìn dòng, không chạy đồng bộ trong một request HTTP).
- Việc thật sự tải một bộ dữ liệu CC0 đầy đủ về máy chủ production là bước triển khai (deploy-time), không phải một phần của đợt code này — xem "Follow-up Work".

### 2. Taxonomy motif chiến thuật

- Mở rộng `packages/shared/src/constants/chess.ts` với trục mới `CHESS_MOTIFS` (độc lập với `CHESS_TOPICS` — topic là trục chương trình học, motif là trục phân loại puzzle theo kiểu chiến thuật: đòn đôi, ghim, xiên, chiếu hết hàng ngang cuối...). Đây là từ vựng cờ vua phổ thông (không phải sáng tạo riêng của bất kỳ hệ thống nào), có nhãn tiếng Việt.

### 3. Hệ số Glicko-2 cho puzzle

- Mỗi người dùng có một hàng `chess_ratings` riêng cho hạng mục `puzzle` (thiết kế mở rộng được sang hạng mục khác ở Đợt L4 — cờ chớp/nhanh/tiêu chuẩn — qua cột `category`), gồm `rating` (mặc định 1500), `ratingDeviation` (mặc định 350 — người mới, chưa chắc chắn), `volatility` (mặc định 0.06).
- Sau mỗi lần giải một puzzle (đúng hoặc sai), tính lại **cả** hệ số người dùng **và** hệ số puzzle theo thuật toán Glicko-2 chuẩn (coi lượt giải như một "ván" người dùng đấu với puzzle — thắng nếu giải đúng, thua nếu giải sai). Lưu lịch sử vào `chess_rating_history` (dùng cho biểu đồ tiến bộ theo thời gian).

### 4. Chọn puzzle thích ứng

- `GET /chess/puzzles/next`: trả về một puzzle **chưa từng giải đúng** bởi người dùng, có `rating` nằm trong khoảng `[hệ số người dùng − delta, hệ số người dùng + delta]`. `delta` chia 5 mức độ khó (rất dễ → rất khó, ví dụ ±100/±200/±300 quanh hệ số hiện tại, người dùng chọn mức), có thể lọc thêm theo `motif`.
- Nếu không còn puzzle nào khớp khoảng rating (ngân hàng còn nhỏ trong giai đoạn đầu), nới khoảng tìm kiếm dần cho tới khi có kết quả — không bao giờ trả lỗi "hết bài" khi ngân hàng còn puzzle.

### 5. Nộp lời giải

- `POST /chess/puzzles/:id/attempts`: nhận chuỗi nước UCI người dùng đã đi, so khớp chính xác với lời giải lưu sẵn (đúng tuyệt đối theo thứ tự, giống mô hình chấm "chess position line" đã có ở Assignment engine). Ghi nhận lượt giải (`chess_puzzle_attempts`: đúng/sai, hệ số trước/sau), cập nhật Glicko-2 hai chiều (mục 3), và đánh dấu hoạt động trong ngày qua `StatisticsService.updateUserActivity` sẵn có (tái dùng streak/activity-history toàn hệ thống, không tạo streak riêng cho puzzle).

### 6. Giải lại puzzle đã sai

- `GET /chess/puzzles/mistakes`: liệt kê puzzle người dùng từng giải sai và **chưa** giải đúng lại lần nào sau đó — cho phép luyện lại có chủ đích thay vì chỉ tiến tới puzzle mới.

### 7. Puzzle hằng ngày

- `GET /chess/puzzles/daily`: một puzzle cố định cho cả tenant trong ngày (chọn định để tất cả người dùng cùng tenant nhận đúng một puzzle trong cùng một ngày — hash quyết định theo ngày, không ngẫu nhiên mỗi lần gọi). Giải puzzle hằng ngày tính là hoạt động trong ngày giống mục 5.

### 8. Dashboard tiến bộ

- `GET /chess/puzzles/dashboard`: hệ số hiện tại + lịch sử (cho biểu đồ), tỉ lệ đúng theo từng motif, và hai danh sách tự động suy ra: **điểm yếu** (motif có ≥3 lượt sai và tỉ lệ đúng dưới trung bình chung của người dùng đó) và **điểm mạnh** (motif có tỉ lệ đúng cao nhất, đủ số lượt để có ý nghĩa thống kê — tối thiểu 3 lượt).

## End-User Value

Học sinh luyện puzzle ở đúng độ khó của mình thay vì một ngân hàng bài tập tĩnh chung cho mọi trình độ — hệ số tự điều chỉnh theo từng lượt giải. Giáo viên (qua dashboard, ở Đợt L8 sẽ mở rộng thành báo cáo đầy đủ) biết ngay học sinh yếu chiến thuật nào để soạn bài tập bổ sung, thay vì đoán.

## How It Works

Học sinh mở trang luyện tập, chọn mức độ khó mong muốn (hoặc để mặc định), hệ thống gọi `next` để lấy một puzzle phù hợp hệ số hiện tại, hiển thị FEN lên `ChessBoard` (tái dùng từ L1) ở chế độ tương tác. Học sinh đi thử nước; mỗi nước đi được so khớp ngay với vị trí tương ứng trong lời giải (phản hồi tức thời đúng/sai từng nước, không phải chỉ chấm khi đi hết chuỗi — giữ trải nghiệm giống puzzle trainer thông thường), khi đi sai chuỗi dừng lại và gọi `attempts` với kết quả sai; khi đi đúng hết chuỗi, gọi `attempts` với kết quả đúng. Hệ số cập nhật ngay, hiển thị thay đổi (+/-) sau mỗi lượt. Dashboard hiển thị biểu đồ hệ số theo thời gian và danh sách motif mạnh/yếu, có nút "luyện lại các bài đã sai" dẫn tới danh sách `mistakes`.

## Key Technical Context

- **Glicko-2**: cài đặt tại `apps/api/src/chess/glicko/glicko2.ts` — hàm thuần `updateRating(player: GlickoRating, results: {opponent: GlickoRating, score: 0|0.5|1}[]): GlickoRating`, theo đúng 8 bước trong "Example of the Glicko-2 system" (Mark Glickman, http://www.glicko.net/glicko/glicko2.pdf — tài liệu toán học công khai, không phải mã nguồn của bất kỳ hệ thống nào): chuyển rating/RD/volatility sang thang Glicko-2 (`μ`/`φ`), tính `v` và `Δ`, giải volatility mới bằng phương pháp Illinois (biến thể regula falsi hội tụ nhanh hơn bisection thường), cập nhật `φ'`/`μ'`, chuyển ngược về thang Glicko gốc (rating trung bình 1500, độ lệch ×173.7178). Mỗi lượt giải puzzle là MỘT kết quả (`score = 1` nếu đúng, `0` nếu sai) đấu với "đối thủ" chính là puzzle ở hệ số hiện tại của nó — gọi `updateRating` hai lần đối xứng: một lần cho người dùng (đối thủ = puzzle), một lần cho puzzle (đối thủ = người dùng, `score` đảo ngược).
- Bảng mới (`apps/api/src/storage/schema/index.ts`): `chessPuzzles` (fen, solutionUci text[], rating, ratingDeviation, volatility, motifs text[], popularity nullable, source, tenantId), `chessPuzzleAttempts` (puzzleId, userId, correct boolean, userRatingBefore/After, puzzleRatingBefore/After, solvedAt, tenantId), `chessRatings` (userId, category — enum mở rộng được, đợt này chỉ có `puzzle` — rating/RD/volatility/gamesPlayed, unique theo userId+category, tenantId), `chessRatingHistory` (userId, category, rating, recordedAt, tenantId). Migration theo mẫu "1 migration tạo bảng + 1 migration RLS riêng".
- Hằng số mới: `CHESS_MOTIFS` (~30 motif, nhãn tiếng Việt) + `CHESS_RATING_CATEGORIES` (`{PUZZLE: "puzzle"}`, mở rộng ở L4) trong `packages/shared/src/constants/chess.ts`.
- Permission mới: `chess.puzzle.read`, `chess.puzzle.manage` — gán STUDENT/TRAINER/CONTENT_CREATOR (read), CONTENT_CREATOR/ADMIN (manage).
- **Import CC0**: job BullMQ mới (`QUEUE_NAMES.CHESS_PUZZLE_IMPORT`), worker theo mẫu `ScormImportWorker` (`apps/api/src/scorm/scorm-import.worker.ts`, dùng `TenantDbRunnerService` để chạy đúng ngữ cảnh tenant). Đơn giản hóa so với kế hoạch gốc: `POST /chess/puzzles/import` nhận nội dung CSV trực tiếp dưới dạng chuỗi trong body JSON (không qua `FileService`/multipart) — đủ dùng cho các lô đã lọc trước, tránh boilerplate upload đa phần không cần thiết ở quy mô trường/CLB; parser (`utils/puzzle-csv.utils.ts`) lọc theo `minRating`/`maxRating`/`motifs`/`maxCount` trước khi worker insert theo lô (batch 500 dòng/lần).
- Chấm lời giải theo đúng cách "chess position line" grader đã có ở Assignment engine (`apps/api/src/assignments/graders/chess-position-line.grader.ts`) — so khớp tuyệt đối chuỗi UCI, tái dùng logic thay vì viết lại.
- **Streak toàn hệ thống (`StatisticsService.updateUserActivity`) KHÔNG được nối vào đợt này** — phát hiện trong lúc verify: bất kỳ file nào trong `src/chess/` import trực tiếp từ `src/statistics/` đều tạo một vòng phụ thuộc require() ở cấp file (không phải cấp module Nest): `chess → statistics.service → FileService (src/file) → video-upload-notification.gateway → barrel src/websocket → WebSocketModule → ChessModule` — vòng này làm hỏng decorator metadata của tham số thứ 2 trong constructor của `StatisticsService` lúc boot (`Nest can't resolve dependencies of the StatisticsService ... argument at index [1]`), vì `WebSocketModule` (global) đã import `ChessModule` từ trước (phục vụ PR #19). `forwardRef()` ở cấp module Nest không sửa được vì đây là vòng lặp `require()` thuần JS/TS, xảy ra trước khi Nest DI vào cuộc. Đã gỡ bỏ phần gọi `updateUserActivity` khỏi `ChessPuzzleService` để giữ đợt này chạy được — xem "Follow-up Work".

## Test Evidence

- Unit test Glicko-2: đối chiếu với ví dụ số minh họa chính thức trong tài liệu Glickman (bộ 3 "đối thủ" mẫu với rating/RD cho trước, kết quả rating/RD/volatility mới đã biết trước) — đảm bảo cài đặt đúng công thức, không chỉ "chạy không lỗi".
- Unit test service: chọn puzzle thích ứng (đúng khoảng rating, nới khoảng khi cạn), chấm lời giải (đúng/sai từng trường hợp biên), tính điểm yếu/mạnh dashboard (ngưỡng ≥3 lượt).
- `pnpm lint-tsc-api`/`lint-tsc-web` sạch, `pnpm test:api`/`test:web` xanh.

## Follow-up Work (explicitly not done in this pass)

- **Nhập dữ liệu CC0 thật vào production**: đợt này chỉ dựng đúng cơ chế nhập (job + parser CSV + lọc theo rating/motif, kiểm thử bằng dữ liệu mẫu trong unit test — xem `puzzle-csv.utils.spec.ts`); việc tải file CSV thật từ một bộ dữ liệu CC0 công khai (có thể tới hàng triệu dòng, cần băng thông/lưu trữ) và gọi `POST /chess/puzzles/import` trên môi trường thật là thao tác vận hành, thực hiện khi triển khai — không có trong phạm vi code của đợt này. Ngân hàng puzzle production trống cho tới khi bước import đó được chạy; giao diện luyện tập xử lý đúng trường hợp "chưa có puzzle nào" (không lỗi, chỉ hiện thông báo trống).
- **Puzzle Storm/Racer (chế độ tính giờ)**: có trong lila nhưng bị loại khỏi phạm vi ở bước lọc giá trị trường cờ ban đầu (xem `03-feature-matrix.md`) — không làm ở đợt này.
- **5 mức độ khó**: đợt này cài đặt cơ chế delta có thể cấu hình nhưng UI chỉ cho 3 mức (dễ/vừa/khó) thay vì 5 — đơn giản hóa cho quy mô trường học; có thể mở rộng UI sau nếu cần, backend không giới hạn số mức.
- **Streak toàn hệ thống chưa tính lượt giải puzzle**: giải puzzle chưa đánh dấu ngày hoạt động qua `user_statistics`/`StatisticsService` — bị chặn bởi vòng lặp require() nêu ở "Key Technical Context". Hướng giải quyết đúng đắn (không thử ở đợt này để tránh trì hoãn giá trị cốt lõi): tách một cổng sự kiện nhẹ (ví dụ `EventEmitter2` hoặc mở rộng cơ chế outbox sẵn có) để `ChessPuzzleService` phát sự kiện "đã hoạt động" mà không cần import trực tiếp bất kỳ file nào trong `src/statistics/` — người nghe sự kiện đăng ký ở một module trung lập, phá vỡ vòng lặp file thay vì chỉ bọc `forwardRef()` ở cấp Nest module (không đủ, vì vòng lặp xảy ra ở cấp require() JS/TS trước khi Nest DI chạy).
