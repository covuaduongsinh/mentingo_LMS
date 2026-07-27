# Chess Broadcast (Tường thuật giải đấu) Business Spec — L10

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, xem `docs/research/lila/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt L10 — đợt cuối cùng của roadmap "còn thiếu so với lila" (`docs/research/lila/05-roadmap.md`), nối tiếp L9 (Cộng đồng cờ, PR #29). Tính năng "Relay/Broadcast" của lila cho phép phát trực tiếp một giải đấu cờ **thực tế ngoài đời** (không phải ván chơi trong mentingo) lên web — ví dụ giải đấu học sinh giỏi cấp trường/tỉnh diễn ra trên bàn cờ thật, ban tổ chức cập nhật biên bản ván đấu định kỳ, phụ huynh và học sinh không tham gia có thể theo dõi diễn biến gần như trực tiếp. Đây là giá trị truyền thông cao cho trường/CLB mà mentingo hiện hoàn toàn chưa có: `chess_matches` (L4) chỉ ghi ván chơi trực tuyến trong hệ thống, `chess_tournaments` (L6) chỉ ghép cặp/tính điểm ván nội bộ — không có khái niệm "tường thuật một sự kiện diễn ra bên ngoài ứng dụng".

## Who Uses It

- Giáo viên/HLV/admin có quyền `chess.broadcast.manage` — tạo buổi tường thuật, thêm vòng đấu, thêm bàn (ván), cập nhật PGN theo từng bàn (dán tay hoặc cấu hình nguồn kéo tự động), quản lý đội thi đấu.
- Học sinh, phụ huynh (mọi người dùng có `chess.broadcast.read`, mặc định mọi vai trò) — xem trực tiếp các bàn đang diễn ra, xem bảng xếp hạng đội.

## Feature Functions

### 1. Tường thuật (Broadcast) và vòng đấu

- `POST /chess/broadcast` — tạo buổi tường thuật mới: tên, mô tả, độ trễ phát sóng (phút, mặc định 15 — chống gian lận, xem mục 4).
- `POST /chess/broadcast/:id/rounds` — thêm vòng đấu (tên, thứ tự hiển thị).
- Trạng thái buổi tường thuật (`upcoming`/`live`/`finished`) do người tổ chức tự đặt qua `PATCH /chess/broadcast/:id` — **không** tự động chuyển trạng thái theo lịch (đơn giản hóa, xem "Follow-up Work").

### 2. Bàn đấu (Board/Game) và cập nhật PGN

- `POST /chess/broadcast/rounds/:roundId/games` — thêm một bàn: tên hai người chơi (chuỗi tự do — đây là người chơi **thật ngoài đời**, không nhất thiết có tài khoản mentingo), đội tương ứng (tùy chọn, xem mục 3).
- **Cập nhật PGN thủ công** (cơ chế chính): `PATCH /chess/broadcast/games/:id/pgn` — người tổ chức dán toàn bộ PGN hiện tại của bàn đó (thường lấy từ máy ghi biên bản điện tử hoặc gõ tay theo dõi ván thật). Server dùng `chess.js` để phát lại toàn bộ PGN, so khớp với danh sách nước đã lưu, **chỉ thêm các nước mới** (không ghi đè, giữ nguyên `ingestedAt` của các nước đã có) — cho phép gọi lại nhiều lần trong một ván mà không mất mốc thời gian nhận nước trước đó (mốc thời gian này chính là cơ sở để tính độ trễ phát sóng).
- **Kéo PGN tự động theo chu kỳ** (tùy chọn, bổ sung cho cách thủ công — không thay thế): mỗi bàn có thể cấu hình `pgnSourceUrl`; một cron job (mỗi phút) quét tất cả bàn thuộc buổi tường thuật đang `live` có cấu hình URL, tải nội dung PGN thô và áp dụng đúng cơ chế "chỉ thêm nước mới" ở trên. Dùng lại nguyên tắc chống SSRF đã có (`link-preview`/`webhooks`: chặn địa chỉ nội bộ/loopback, giới hạn kích thước phản hồi, không theo redirect quá 3 lần).
- Ván kết thúc (`result` được set khi PGN chứa thẻ kết quả `1-0`/`0-1`/`1/2-1/2`, hoặc người tổ chức đặt tay).

### 3. Đội thi đấu và bảng xếp hạng

- `POST /chess/broadcast/:id/teams` — tạo đội (tên). Gán đội cho từng bàn khi tạo/sửa bàn.
- `GET /chess/broadcast/:id/standings` — bảng xếp hạng đội, tính **pull-based** (đọc lại từ đầu mỗi lần gọi, không lưu trạng thái tăng dần — đúng nguyên tắc đã áp dụng cho tiebreak giải đấu ở L6): tổng điểm mỗi đội = tổng điểm các ván có đội đó tham gia (thắng 1, hòa 0.5, thua 0) trên toàn bộ vòng đã có kết quả.

### 4. Xem trực tiếp có độ trễ (chống gian lận)

- `GET /chess/broadcast/games/:id` — trạng thái bàn đấu dành cho người xem thường: chỉ hiển thị các nước đi có `ingestedAt ≤ hiện tại − delayMinutes` của buổi tường thuật — tái tạo lại FEN bằng cách phát lại đúng chuỗi nước đó bằng `chess.js` phía server (không tin bất kỳ FEN nào client tự tính). Người có quyền `chess.broadcast.manage` gọi kèm `?live=true` để xem không trễ (phục vụ vận hành/kiểm tra).
- Lý do có độ trễ: ngăn người xem từ xa dùng engine phân tích rồi mách nước cho người chơi thật qua điện thoại — đúng mục đích chống gian lận mà lila áp dụng cho mọi buổi tường thuật công khai.

## End-User Value

Trường/CLB tổ chức một giải đấu cờ thật (ví dụ giải học sinh giỏi cấp trường) giờ có thể phát trực tiếp diễn biến lên mentingo — phụ huynh không cần có mặt vẫn theo dõi được con thi đấu, học sinh không thi đấu có thể học hỏi qua các ván hay đang diễn ra. Độ trễ phát sóng bảo vệ tính công bằng của giải đấu thật. Bảng xếp hạng đội tạo không khí thi đấu đồng đội, phù hợp hình thức giải giao lưu giữa các lớp/trường.

## How It Works

Trước giải, giáo viên tạo buổi tường thuật, thêm các vòng đấu và bàn thi đấu (ghi tên hai người chơi thật, gán đội nếu có). Trong lúc giải diễn ra, giáo viên/tình nguyện viên đứng cạnh bàn cờ thật, sau mỗi vài nước lại dán bản PGN cập nhật vào đúng bàn đó trên mentingo (hoặc để hệ thống tự kéo nếu đã có nguồn PGN trực tuyến từ máy ghi biên bản điện tử). Phụ huynh/học sinh vào trang tường thuật, chọn buổi đang `live`, xem bàn mình quan tâm — bàn cờ cập nhật nước đi mới sau một khoảng trễ ngắn (mặc định 15 phút) so với thực tế. Bảng xếp hạng đội cập nhật tự động theo kết quả từng ván đã có.

## Key Technical Context

- Module mới hoàn toàn tách biệt `src/chess-broadcast/` (không import `ChessModule` — chỉ dùng `chess.js` như một thư viện thuần, không phụ thuộc service nào của module cờ khác), theo đúng mẫu các module chess-\* độc lập đã có (`chess-tournament`, `chess-learn`, `chess-class`).
- Bảng mới: `chess_broadcasts` (name, description, status, delayMinutes, tenantId, createdByUserId), `chess_broadcast_rounds` (broadcastId, name, displayOrder), `chess_broadcast_teams` (broadcastId, name), `chess_broadcast_games` (roundId, boardNumber, whiteName/blackName text tự do, whiteTeamId/blackTeamId tùy chọn, result, currentFen, pgnSourceUrl tùy chọn, lastFetchedAt), `chess_broadcast_game_moves` (gameId, ply, uci, san, fenAfter, `ingestedAt` — mốc **hệ thống ghi nhận** nước đi, khác với thời điểm nước đi thực sự xảy ra ngoài đời; đây chính là cơ sở duy nhất để tính độ trễ phát sóng). Migration mẫu "1 tạo bảng + 1 bật RLS riêng" (`0199`/`0200`).
- Thuật toán "chỉ thêm nước mới": phát lại PGN dán vào bằng `chess.js` (`new Chess(); game.loadPgn(pgnText)`), lấy `game.history({verbose: true})` thành danh sách nước UCI/SAN theo thứ tự, so với số nước đã lưu trong DB (`existingCount`) — nếu PGN mới có **nhiều hơn hoặc bằng** và **N nước đầu trùng khớp UCI** với DB, chèn thêm các nước từ vị trí `existingCount` trở đi với `ingestedAt = now()`; nếu không khớp (PGN dán nhầm ván khác hoặc bị sửa nước cũ), từ chối với lỗi rõ ràng thay vì âm thầm ghi đè lịch sử độ trễ.
- Kéo PGN tự động dùng `ChessBroadcastCron` (`@Cron(CronExpression.EVERY_MINUTE)`, mẫu `ChessMatchCron` đã có ở L4) quét qua `tenantRunner.runForEachTenant`. Hàm fetch PGN mới `apps/api/src/chess-broadcast/utils/safe-pgn-fetch.ts` **nhân bản pattern** `link-preview/utils/safe-fetch.ts` (chặn SSRF qua `safeLookup` kiểm tra địa chỉ IP đã resolve, giới hạn kích thước phản hồi, không theo redirect quá 3 lần) — đổi từ "GET rồi trích OG-tag HTML" thành "GET rồi coi toàn bộ response là văn bản PGN thô", cùng cách webhook module đã nhân bản pattern này cho hướng POST/SSRF ở Đợt 9 (LearnHouse roadmap).
- Độ trễ tính hoàn toàn ở tầng đọc (`GET .../games/:id`): lọc `chess_broadcast_game_moves` theo `ingestedAt ≤ NOW() - delayMinutes` rồi phát lại FEN — không có job nền "ẩn dần" dữ liệu, đơn giản và không có rủi ro đồng bộ.
- Bảng xếp hạng đội **pull-based** giống hệt nguyên lý tiebreak L6 (`docs/research/lila/04-subsystem-notes.md` không có mục riêng nhưng cùng logic đã ghi trong HANDOVER L6) — tính lại từ `chess_broadcast_games.result` mỗi lần gọi, không lưu điểm tăng dần.
- Permission mới: `chess.broadcast.read` (mọi vai trò), `chess.broadcast.manage` (trainer/admin — tạo/sửa buổi tường thuật, vòng, bàn, đội, dán PGN, cấu hình nguồn kéo).

## Test Evidence

- Unit test: phát lại PGN và trích đúng danh sách nước UCI/SAN; "chỉ thêm nước mới" — dán PGN dài hơn PGN cũ với tiền tố khớp thì chỉ chèn phần mới, dán PGN không khớp tiền tố thì bị từ chối, dán lại đúng PGN cũ (không đổi) thì không chèn gì cả (idempotent); tính độ trễ — nước có `ingestedAt` gần đây bị ẩn khỏi người xem thường nhưng hiện với `live=true`; tính bảng xếp hạng đội từ kết quả ván thắng/hòa/thua trộn lẫn nhiều vòng.
- `pnpm lint-tsc-api`/`lint-tsc-web` sạch, `pnpm test:api`/`test:web` xanh.
- Xác minh thủ công qua Caddy: tạo buổi tường thuật + vòng + bàn, dán PGN qua API, xác nhận nước đi mới xuất hiện; dán tiếp PGN dài hơn, xác nhận chỉ nước mới được thêm và mốc thời gian nước cũ không đổi; gọi endpoint xem với/không `live=true` để xác nhận độ trễ hoạt động đúng bằng cách chỉnh `delayMinutes` xuống giá trị rất nhỏ để kiểm tra nhanh.

## Follow-up Work (explicitly not done in this pass)

- **Tự động chuyển trạng thái buổi tường thuật theo lịch** (upcoming → live → finished tự động theo giờ vòng đấu) — đợt này người tổ chức tự đặt tay.
- **Tích hợp phần cứng bàn cờ điện tử (DGT board)** trực tiếp — đã loại khỏi phạm vi từ khảo sát ban đầu (`03-feature-matrix.md`), ngách hẹp cần phần cứng chuyên dụng.
- **Trình bóc tách PGN từ trang web giải đấu cụ thể** (scraping theo cấu trúc riêng của từng nguồn) — chỉ hỗ trợ URL trả về văn bản PGN thô hoặc dán tay, không có bộ chuyển đổi định dạng theo từng nguồn.
- **Tiebreak nâng cao cho bảng xếp hạng đội** (Buchholz đội, so board điểm...) — chỉ cộng điểm đơn giản.
- **Thông báo/toast realtime khi có nước đi mới** — đợt này người xem phải tự tải lại hoặc dùng polling phía client; chưa đẩy qua WebSocket (có thể bổ sung sau theo đúng mẫu `RealtimePublisher.emitToRoom` đã dùng ở L8/L9 nếu cần).
