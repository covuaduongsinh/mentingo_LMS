# Collaborative Chess Analysis Board Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (xem `docs/research/learnhouse/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt 11 triển khai tính năng đã bị hoãn từ Đợt 8 (thư viện tài nguyên phân cấp) — khi đó xác định đây là 2 việc không liên quan kỹ thuật, tách sang đợt riêng. Tính năng: **phòng phân tích cờ cộng tác thời gian thực** — HLV mở 1 phòng, chia sẻ link cho học viên, tất cả cùng xem và đi nước trên 1 bàn cờ chung, dùng cho buổi học/phân tích ván đấu trực tuyến.

Khảo sát trước khi code (2026-07-26) xác nhận hạ tầng sẵn có rất phù hợp: `WsGateway` (namespace `/ws`, Socket.IO + Redis adapter cho multi-instance) đã có mẫu room-join hoàn chỉnh (`join:live-training` → `live-training:${id}`), `ChessBoard.tsx` đã là component hoàn toàn controlled qua `fen`/`onMove` (không giữ state FEN nội bộ) nên tái dùng được ngay cho chế độ đồng bộ qua socket, và `chess.js` đã là dependency của cả `apps/api` lẫn `apps/web` nên validate nước đi phía server dùng được thư viện đã có sẵn.

## Who Uses It

- HLV/giáo viên (quyền `chess.game.manage` hiện có) — tạo phòng phân tích, chia sẻ link, đi nước, kết thúc phòng.
- Học viên/người xem (quyền `chess.game.read` hiện có) — vào phòng qua link, xem bàn cờ đồng bộ real-time, đi nước cùng (phân tích là hoạt động cộng tác, không phải 1 người điều khiển — xem mục 2).

## Feature Functions

### 1. Tạo và tham gia phòng

- HLV tạo phòng mới với FEN khởi tạo (mặc định vị trí bắt đầu chuẩn, hoặc dán FEN/PGN của 1 ván đấu cụ thể để phân tích lại), phòng có tên tùy chọn.
- Link phòng dạng `/chess/analysis-room/:id` — bất kỳ ai có quyền `chess.game.read` trong cùng tenant truy cập link đều vào được (mẫu route `:id` kép của live-training: trang chi tiết/phòng dùng chung component, phân biệt qua route id).
- Khi vào phòng, client gọi `GET /chess/analysis-sessions/:id` lấy trạng thái hiện tại (FEN, danh sách nước đi, trạng thái phòng) **trước khi** kết nối socket — đảm bảo người vào sau vẫn thấy đúng ván đang phân tích dở, không chỉ người có mặt từ đầu mới đồng bộ được.
- Sau khi có state ban đầu, client emit `join:chess-analysis` (kèm `sessionId`) để vào room Socket.IO `chess-analysis:${sessionId}` và nhận cập nhật real-time từ đó.

### 2. Đi nước cộng tác

- Bất kỳ người nào trong phòng (host lẫn viewer) đều đi nước được — đây là hoạt động phân tích cộng tác, không phải 1 người điều khiển còn lại chỉ xem (khác với ván đấu 1-1 hiện có).
- Đi nước: client validate trước bằng `chess.js` (như `ChessAnalysis.page.tsx` hiện tại), sau đó emit `chess-analysis:move` (nước đi dạng UCI). Server **validate lại bằng `chess.js`** dựa trên FEN hiện tại lưu trong DB (không tin client) — nếu hợp lệ, cập nhật FEN + nối vào danh sách nước đi, ghi vào DB, rồi broadcast `chess-analysis:move` tới toàn bộ room (trừ người gửi, đã áp dụng optimistic ở client). Nếu không hợp lệ (do 2 người đi cùng lúc gây lệch trạng thái), trả lỗi riêng cho người gửi để client tự đồng bộ lại FEN mới nhất.
- Không cần khóa lượt đi theo lượt trắng/đen nghiêm ngặt cho **người** — vẫn tuân thủ luật cờ vua bình thường (không thể đi 2 nước trắng liên tiếp), chỉ khác ở chỗ bất kỳ ai trong phòng đều có thể thực hiện nước đi hợp lệ tiếp theo, không gán cứng người chơi theo màu quân.

### 3. Điều khiển phòng (chỉ host)

- Chỉ host (người tạo phòng) mới thực hiện được: đặt lại vị trí bàn cờ (`chess-analysis:reset-fen`, dán FEN mới), kết thúc phòng (`chess-analysis:end`).
- Kết thúc phòng: trạng thái chuyển `ended`, broadcast cho toàn phòng, không cho đi nước tiếp (server từ chối `chess-analysis:move` khi phòng đã `ended`). Phòng đã kết thúc vẫn xem lại được (read-only) qua `PgnViewer` hiện có, dùng danh sách nước đi đã lưu.
- Không giới hạn số lượng người xem tối đa ở đợt này (khác live-training vốn có giới hạn LiveKit).

### 4. Quyền truy cập

- Dùng lại quyền `CHESS_GAME_MANAGE` (tạo phòng, làm host, điều khiển phòng) và `CHESS_GAME_READ` (tham gia phòng làm người xem/cùng đi nước) hiện có — không thêm quyền `chess_analysis.*` riêng, tránh mở rộng thêm phạm vi đợt này.
- Kiểm tra tenant khi join room: `WsGateway` hiện tại không tự động cô lập theo tenant ở tầng room name — mỗi handler `join:chess-analysis` phải tự kiểm tra `session.tenantId === client.data.user.tenantId` trước khi cho `client.join(...)`, đúng mẫu bảo mật cần áp dụng nhất quán cho mọi room mới (không riêng tính năng này).

## End-User Value

HLV dạy cờ trực tuyến phân tích ván đấu cùng học viên theo thời gian thực, tất cả cùng nhìn thấy và thử nước đi trên 1 bàn cờ chung, không cần công cụ chia sẻ màn hình hay mô tả nước đi bằng lời.

## How It Works

- **Bảng mới `chess_analysis_sessions`**: `id`, `...timestamps`, `hostUserId` (FK `users.id`, set null), `name` (varchar, tùy chọn), `status` (varchar: `active` | `ended`, mặc định `active`), `currentFen` (varchar, mặc định vị trí bắt đầu chuẩn), `moveList` (jsonb mảng nước UCI, mặc định `[]`), `endedAt` (timestamp, nullable), `tenantId` + RLS.
- **Bảng mới `chess_analysis_session_participants`**: `id`, `...timestamps`, `sessionId` (FK cascade), `userId` (FK `users.id`, cascade), `role` (varchar: `host` | `viewer`), `firstJoinedAt`, `lastLeftAt` (nullable), `tenantId` + RLS, unique `(sessionId, userId)` — mẫu rút gọn 2 bảng từ `live_training_sessions`/`live_training_session_participants`, bỏ bảng `live_training_attendance` log chi tiết (không cần cho phạm vi đợt này).
- **`ChessAnalysisService`** mới trong `apps/api/src/chess/` (mở rộng module `chess` hiện có, không tạo module mới): tạo phòng, lấy state, xử lý nước đi (validate lại bằng `chess.js` — dependency đã có), ghi participant khi join, đặt lại FEN, kết thúc phòng.
- **Handler mới trong `WsGateway`** (mở rộng file hiện có, đúng mẫu `join:live-training`): `join:chess-analysis`, `leave:chess-analysis`, `chess-analysis:move`, `chess-analysis:reset-fen`, `chess-analysis:end` — mỗi handler dùng `@UseGuards(WsJwtGuard)`, kiểm tra tenant khớp trước khi thao tác, broadcast qua `REALTIME_PUBLISHER`/`emitToRoom` tới `chess-analysis:${sessionId}`.
- **Controller/schema mới** `apps/api/src/chess/`: `POST /chess/analysis-sessions` (tạo phòng, host), `GET /chess/analysis-sessions/:id` (lấy state hiện tại trước khi join socket).
- **Frontend**: trang mới `apps/web/app/modules/Chess/Room/ChessAnalysisRoom.page.tsx` (không sửa `ChessAnalysis.page.tsx` đơn người chơi hiện có), route `chess/analysis-room/:id` trong `routes.ts`, tái dùng `ChessBoard`/`PgnViewer` từ `modules/Chess/board/index.ts` với `fen` được điều khiển bởi state đồng bộ qua socket (không phải state cục bộ tự quản lý như trang phân tích đơn hiện tại) và `onMove` emit lên socket thay vì tự validate-rồi-lưu-local.
- **Migration**: 2 bảng mới trong 1 file `drizzle-kit generate` + 1 file RLS riêng theo mẫu các đợt trước.

## Non-Goals (đợt này — chuyển sang Follow-up Work)

- **Con trỏ chuột/presence hiển thị ai đang xem** (kiểu Google Docs): chỉ cần đồng bộ bàn cờ, không cần hiển thị presence chi tiết.
- **Chat trong phòng**: dùng kênh liên lạc khác (video call ngoài luồng) nếu cần trong buổi học, không tích hợp chat text vào phòng cờ.
- **Giới hạn số người xem tối đa / thống kê chi tiết theo phiên** (kiểu `live_training_attendance`): bỏ hẳn ở đợt này, chỉ cần biết ai đã tham gia (bảng participants), không cần log join/leave chi tiết theo giây.
- **Chuyển quyền host giữa những người trong phòng**: host cố định là người tạo phòng trong suốt vòng đời phòng.
- **Danh sách phòng đang hoạt động** (trang liệt kê tất cả phòng cờ đang mở của tenant): đợt này chỉ vào phòng qua link trực tiếp, giống hành vi join-link hiện tại của live-training.
- **Quyền `chess_analysis.*` riêng**: dùng ké `CHESS_GAME_MANAGE`/`CHESS_GAME_READ` hiện có.

## Key Technical Context

- `apps/api/src/storage/schema/index.ts` — bảng `chessAnalysisSessions`, `chessAnalysisSessionParticipants` mới.
- `apps/api/src/websocket/websocket.gateway.ts` — mở rộng thêm 5 handler mới, mẫu chính xác `join:live-training`.
- `apps/api/src/chess/` — mở rộng `chess.service.ts`/`chess.controller.ts`/`schemas/chess.schema.ts` (không tạo module mới), file mới `chess-analysis.service.ts` nếu tách riêng cho gọn.
- `apps/web/app/modules/Chess/board/index.ts` (`ChessBoard`, `PgnViewer`) tái dùng nguyên vẹn — không sửa.
- `apps/web/app/modules/Chess/Room/ChessAnalysisRoom.page.tsx` (mới), `apps/web/routes.ts` thêm route `chess/analysis-room/:id`.

## Test Evidence

- Migration `0181_add_chess_analysis_sessions.sql` + `0182_enable_chess_analysis_sessions_rls.sql` áp dụng thành công vào DB dev.
- `apps/api`/`apps/web` `tsc --noEmit` sạch, `eslint --max-warnings=0` sạch (Node 22).
- Test mới `apps/api/src/chess/__tests__/chess-analysis.service.spec.ts` (11 test, Jest Node 22): tạo phòng gán host đúng, từ chối FEN không hợp lệ, `NotFoundException`/`ForbiddenException` khi phòng không tồn tại/khác tenant, gán vai trò host/viewer đúng người, validate nước đi hợp lệ + cập nhật FEN, từ chối nước đi bất hợp lệ mà không ghi DB, từ chối đi nước khi phòng đã kết thúc, chặn reset FEN/kết thúc phòng từ người không phải host.
- Khởi động tạm API bằng Node 22 xác nhận **không có lỗi circular dependency** khi `WebSocketModule` (global) import `ChessModule` để tiêm `ChessAnalysisService` vào `WsGateway` — log "Nest application successfully started" xuất hiện bình thường.
- Regenerate `apps/api/src/swagger/api-schema.json` xác nhận đủ 2 route `/api/chess/analysis-sessions` + `/api/chess/analysis-sessions/{id}`; `pnpm run generate:client` đồng bộ `apps/web/app/api/generated-api.ts`.
- Full API Jest suite chạy sạch (xem log thực thi trước khi commit).
- i18n: đủ 2 locale chính (en/vi) cho khóa `chess.analysisRoom.*`/`chess.analysis.createRoom`/`chess.analysis.errors.*`/`pages.chessAnalysisRoom`, theo đúng quy ước đã có của module `chess.*` (5 locale còn lại pl/de/es/lt/cs vốn chưa có bản dịch cho toàn bộ module `chess.*` từ trước — mọi `t()` mới đều có `defaultValue` tiếng Anh để không hiển thị key thô).

## Follow-up Work (đợt sau, nếu cần)

- Presence (con trỏ chuột/ai đang xem) trong phòng.
- Chat text tích hợp trong phòng.
- Log tham gia/rời phòng chi tiết theo giây (mẫu `live_training_attendance`).
- Chuyển quyền host giữa những người trong phòng.
- Trang danh sách các phòng cờ đang hoạt động của tenant.
