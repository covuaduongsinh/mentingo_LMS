# Chess Online Match Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, xem `docs/research/lila/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt L4 của roadmap "còn thiếu so với lila" (`docs/research/lila/05-roadmap.md`). Đến hết Đợt L3, mentingo chỉ cho phép chơi cờ với máy (Arasan/builtin). Đợt này bổ sung khả năng **hai người dùng thật đấu với nhau qua mạng, thời gian thực**: sảnh mời ghép cặp (mở hoặc nhắm đích danh), ván đấu có đồng hồ do server quyết định (chống gian lận thời gian phía client), và hệ số Glicko-2 cập nhật sau mỗi ván theo đúng thể loại thời gian.

> ⚠️ **Lưu ý đặt tên bảng**: `chess_games` hiện tại là ngân hàng PGN dạy học (giáo viên soạn sẵn), không phải ván đấu. Đợt này dùng bảng riêng `chess_matches` để tránh nhầm lẫn — đúng như rủi ro đã ghi nhận từ khi lập kế hoạch.

## Who Uses It

- Học sinh/giáo viên có quyền `chess.match.play` — gửi lời mời, ghép cặp, chơi ván đấu.
- Người xem có quyền `chess.match.watch` — xem trực tiếp một ván đang diễn ra (không đi được nước).

## Feature Functions

### 1. Sảnh ghép cặp (seek) và thách đấu trực tiếp

- Một bảng duy nhất `chess_seeks` biểu diễn cả hai hình thức: **seek mở** (`challengedUserId = null`, ai cũng nhận được, hiển thị trong danh sách sảnh chung) và **thách đấu đích danh** (`challengedUserId` được đặt, chỉ người đó thấy và nhận thông báo realtime).
- Mỗi seek/thách đấu gồm: thể loại thời gian (tái dùng `CHESS_TIME_CONTROLS` đã có), màu quân mong muốn (trắng/đen/ngẫu nhiên), có tính rating hay không (`rated`).
- `GET /chess/seeks`: danh sách seek mở đang chờ (không gồm thách đấu đích danh của người khác).
- `POST /chess/seeks`: tạo seek mở hoặc thách đấu (nếu truyền `challengedUserId`).
- `POST /chess/seeks/:id/accept`: chấp nhận — tạo một `chess_matches` mới, seek chuyển trạng thái `matched`. Người tạo seek không thể tự chấp nhận seek của chính mình.
- `POST /chess/seeks/:id/cancel`: chỉ người tạo hủy được, khi còn `pending`.
- Seek tự hết hạn sau một khoảng thời gian cấu hình được (mặc định 5 phút) — quét bằng job định kỳ, không cần thao tác tay.
- Thông báo realtime: seek mới/hủy/hết hạn phát tới phòng sảnh chung (`chess-lobby`); thách đấu đích danh phát riêng tới đúng người bị mời.

### 2. Ván đấu thời gian thực

- Đi nước: `chess-match:move` qua WebSocket — server validate hợp lệ bằng `chess.js` (không tin client), từ chối và không cập nhật trạng thái nếu nước đi sai luật hoặc không đến lượt.
- **Đồng hồ do server quyết định**: mỗi ván lưu `whiteTimeRemainingMs`/`blackTimeRemainingMs` và `lastMoveAt`; mỗi nước đi trừ đúng thời gian đã trôi qua kể từ `lastMoveAt` vào đồng hồ của bên vừa đi, cộng thêm increment, rồi đổi lượt. Hết giờ được phát hiện qua một job hẹn giờ (không phải polling phía client) đặt lại sau mỗi nước đi — khi job kích hoạt đúng lúc phía cần thua hết giờ, kiểm tra ván vẫn đang `active` và đúng người đó chưa đi nước nào kể từ khi đặt job, nếu đúng thì kết thúc ván với lý do `timeout`.
- Đầu hàng: `chess-match:resign` — kết thúc ván ngay, bên còn lại thắng.
- Xin hòa: `chess-match:offer-draw` (thông báo tới đối thủ) / `chess-match:accept-draw` (kết thúc hòa) / từ chối ngầm định bằng cách đi nước tiếp theo.
- Tự động phát hiện kết thúc ván qua `chess.js` sau mỗi nước: chiếu hết, hết nước đi hợp lệ (hòa), và toàn bộ điều kiện hòa tự động của `chess.js` (xem ghi chú kỹ thuật) — không có bước "xin hòa" riêng cho các điều kiện này vì `chess.js` đã coi chúng là tự động, không phải có thể yêu cầu.
- Xem trực tiếp (spectate): `join:chess-match` với vai trò `viewer` — nhận đúng luồng nước đi/đồng hồ, không có quyền đi nước.

### 3. Hệ số Glicko-2 theo thể loại thời gian

- Mở rộng trục `category` của `chess_ratings`/`chess_rating_history` (đã có từ Đợt L3) với 3 hạng mục mới: `bullet`, `blitz`, `rapid` — suy ra từ thời gian cơ bản của ván (dưới 3 phút/dưới 10 phút/còn lại), không cần người dùng tự chọn.
- Khi ván `rated` kết thúc (không phải do một bên rời phòng chưa phân định), cập nhật Glicko-2 hai chiều cho cả hai người chơi ở đúng hạng mục — tái dùng nguyên hàm `updateRating` đã viết ở Đợt L3, không viết lại.

## End-User Value

Học sinh có thể đấu thật với bạn học/giáo viên qua mạng thay vì chỉ luyện với máy — đúng nhu cầu cốt lõi của một CLB cờ. Giáo viên xem trực tiếp ván học sinh đang đấu để nhận xét sau giờ học.

## How It Works

Người chơi mở sảnh, thấy danh sách seek mở (kèm thể loại thời gian, rating người tạo), chọn tham gia một seek hoặc tự tạo seek mới; hoặc thách đấu đích danh một người cụ thể (ví dụ từ trang hồ sơ). Khi một seek/thách đấu được chấp nhận, cả hai được điều hướng tới trang ván đấu, bàn cờ khởi tạo vị trí chuẩn, màu quân theo `rated`/tuỳ chọn đã ghi khi tạo seek. Mỗi nước đi gửi qua WebSocket, server xác thực rồi phát cho cả hai người chơi và mọi người xem trong phòng; đồng hồ hiển thị phía client chỉ mang tính hiển thị — số liệu thật luôn lấy từ server sau mỗi lần đồng bộ. Ván kết thúc (chiếu hết/hòa/đầu hàng/hết giờ), cả hai thấy kết quả ngay, hệ số Glicko-2 cập nhật và hiển thị thay đổi.

## Key Technical Context

- Bảng mới: `chessSeeks` (creatorUserId, challengedUserId nullable, timeControlId tham chiếu `CHESS_TIME_CONTROLS`, colorPreference, rated, status pending/matched/cancelled/expired, matchId nullable sau khi ghép, tenantId), `chessMatches` (whiteUserId, blackUserId, timeControlId, rated, status active/finished, result, endReason, currentFen, whiteTimeRemainingMs, blackTimeRemainingMs, lastMoveAt, tenantId), `chessMatchMoves` (matchId, ply, uci, san, fenAfter, createdAt, tenantId). Migration theo mẫu "1 migration tạo bảng + 1 migration RLS riêng".
- **Mở rộng `WsGateway` hiện có** (`apps/api/src/websocket/websocket.gateway.ts`) — thêm handler mới (`join:chess-match`, `leave:chess-match`, `chess-match:move`, `chess-match:resign`, `chess-match:offer-draw`, `chess-match:accept-draw`), đúng theo mẫu PR #19 đã xác lập cho `chess-analysis`: gateway gọi service, service trả kết quả thuần, gateway tự `emitToRoom`. **`ChessMatchService` (trong `src/chess/`) không được import bất kỳ thứ gì từ `src/websocket/` dưới dạng giá trị** — bài học từ Đợt L3 (`nestjs-file-level-circular-require-vs-module-cycle`) cho thấy điều đó có thể tạo vòng lặp require() cấp file; hướng đi an toàn duy nhất khi service cần tự phát sự kiện (không phải phản hồi trực tiếp một message tới) là `@Inject(REALTIME_PUBLISHER)` với type `RealtimePublisher` từ `src/websocket/realtime.publisher.ts` — file này không import gì cả (chỉ định nghĩa interface + Symbol token), nên an toàn tuyệt đối, đã được `course-chat.service.ts` dùng đúng cách này từ trước.
- **Hết giờ phát hiện qua BullMQ delayed job** (queue mới `CHESS_MATCH_TIMEOUT_CHECK`), đặt lại (xóa job cũ, tạo job mới) sau mỗi nước đi hợp lệ với độ trễ đúng bằng thời gian còn lại của bên sắp đi — khi job kích hoạt, service kiểm tra lại `lastMoveAt` chưa đổi (nghĩa là người đó thật sự chưa đi) trước khi xử lý thua cuộc, tránh race giữa "vừa đi nước" và "job cũ vẫn đang chờ bị hủy".
- Validate nước đi qua `chess.js` — tái dùng đúng cách PR #19 (`chess-analysis.service.ts`) đã làm, không viết lại logic.
- Phát hiện kết thúc ván tự động: dùng đúng phát hiện đã ghi trong wiki nội bộ (`chessjs-isdraw-behavior`) — `isDraw()`/`isGameOver()` của `chess.js` đã tự động bao gồm mọi điều kiện hòa, không cần nút "xin hòa" riêng cho các điều kiện đó.
- Glicko-2: tái dùng `updateRating`/`GlickoRating` từ `apps/api/src/chess/glicko/glicko2.ts` (Đợt L3), không viết lại. `CHESS_RATING_CATEGORIES` (`packages/shared/src/constants/chess.ts`) mở rộng thêm `BULLET`/`BLITZ`/`RAPID` bên cạnh `PUZZLE` đã có.
- Permission mới: `chess.match.play`, `chess.match.watch`.

## Test Evidence

- Unit test service: validate nước đi đúng/sai theo lượt, tính lại đồng hồ chính xác theo thời gian trôi qua, phát hiện thắng/thua/hòa qua các trường hợp biên của `chess.js`, ghép seek (từ chối tự ghép với chính mình, từ chối ghép seek đã hết hạn/đã hủy), cập nhật Glicko-2 đúng chiều cho ván có tính rating, bỏ qua cập nhật rating cho ván không tính rating.
- `pnpm lint-tsc-api`/`lint-tsc-web` sạch, `pnpm test:api`/`test:web` xanh.

## Follow-up Work (explicitly not done in this pass)

- **Xin hoãn nước (takeback)**: có trong kế hoạch gốc, lùi lại — thêm một luồng thương lượng riêng (đề nghị/chấp nhận/từ chối) không phải giá trị cốt lõi so với việc có ván đấu chơi được; cân nhắc bổ sung khi có nhu cầu thực tế.
- **Chat trong ván đấu**: kế hoạch gốc có nêu tái dùng mẫu `course_chat` — lùi lại đợt này để tập trung vào luồng chơi cờ chính; hạ tầng `course_chat` đã sẵn sàng tái dùng khi cần.
- **Chống gian lận nâng cao** (chặn truy cập engine trong lúc chơi ván tính rating): chỉ ghi `activity_logs` chuẩn hiện có, chưa xây cơ chế phát hiện/chặn riêng — quy mô trường/CLB chưa đặt ra nhu cầu cấp thiết; cân nhắc ở đợt sau nếu phát sinh vấn đề thực tế.
- **Cờ thư (correspondence, không giới hạn thời gian chặt)**: chưa làm, chỉ có ván đồng bộ thời gian thực.
