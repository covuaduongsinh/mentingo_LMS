# Interactive Chess Board Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, xem `docs/research/lila/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt L1 của roadmap "còn thiếu so với lila" (`docs/research/lila/05-roadmap.md`). Bàn cờ hiện tại của mentingo (`ChessBoard.tsx`) chỉ hỗ trợ đi nước hợp lệ theo `chess.js` và xem một danh sách nước tuyến tính (`PgnViewer.tsx`) — không có cách nào để: vẽ chú thích trực quan lên bàn cờ khi giảng bài, đánh dấu chất lượng một nước đi, khám phá nhiều phương án cùng lúc tại một vị trí, hay tự dựng một thế cờ tùy ý để giao bài tập/phân tích. Đợt này bổ sung 4 khả năng nền tảng — vẽ chú thích (shapes), ký hiệu đánh giá nước đi (glyph), cây biến (variation tree), và bàn cờ dựng thế tự do (board editor) — làm hạ tầng dùng chung cho các đợt sau (Study/Chapter ở L2, dashboard puzzle ở L3, phân tích điểm mạnh-yếu ở L8).

Đợt này **hoàn toàn ở phía client** (`apps/web`), không thêm bảng/migration/permission mới, không đụng `apps/api`. Không dùng chessground (GPL-3.0) — mở rộng trực tiếp component `ChessBoard.tsx` (tự viết, MIT-safe) và `chess.js` (MIT) đã có sẵn.

## Who Uses It

- Giáo viên/HLV cờ (quyền `chess.exercise.read` hoặc `chess.game.read`, đã dùng để gate `chess/analysis` và `chess/play`) — vẽ chú thích khi giảng, khám phá biến, dựng thế cờ cho bài tập.
- Học sinh — xem chú thích/glyph/biến do giáo viên để lại khi xem lại một ván/bài phân tích; tự thử biến khi phân tích.

## Feature Functions

### 1. Vẽ chú thích trên bàn cờ (shapes)

- Giữ chuột phải trên một ô, kéo sang ô khác, thả chuột → vẽ một **mũi tên** từ ô đầu tới ô cuối.
- Giữ chuột phải rồi thả ngay tại cùng một ô (không kéo sang ô khác) → tô một **vòng tròn** đánh dấu ô đó.
- Vẽ lại đúng một hình đã tồn tại (cùng loại, cùng tọa độ, cùng màu) → xóa hình đó (toggle).
- 4 màu chọn qua phím bổ trợ giữ khi kéo chuột phải: không giữ phím = xanh lá (mặc định), giữ Shift = đỏ, giữ Ctrl/Cmd = xanh dương, giữ Alt = vàng. Đây là quy ước màu phổ biến của nhiều phần mềm cờ vua (không phải cách diễn đạt riêng của lila), tự cài đặt độc lập.
- Chuột trái (đi nước) hoạt động độc lập với chuột phải (vẽ) — vẽ chú thích không làm mất quân đã chọn để đi, và ngược lại.
- Component chấp nhận `shapes`/`onShapesChange` như một cặp props được kiểm soát (controlled), theo đúng triết lý `fen`/`onMove` đã có của `ChessBoard` — nếu trang gọi không truyền 2 prop này, tính năng vẽ tự tắt, không ảnh hưởng các nơi đang dùng `ChessBoard`/`PgnViewer` hiện tại.

### 2. Ký hiệu đánh giá nước đi (glyph/NAG)

- 6 ký hiệu chuẩn quốc tế: hay (`!`), dở (`?`), rất hay (`!!`), rất dở (`??`), đáng chú ý (`!?`), đáng ngờ (`?!`).
- Gắn glyph vào **một nút cụ thể của cây biến** (mục 3), không gắn vào FEN (vì cùng một FEN có thể đạt tới từ nhiều đường đi khác nhau).
- Hiển thị ký hiệu ngay cạnh nước đi tương ứng trong danh sách cây biến.

### 3. Cây biến (variation tree)

- Thay thế mô hình "danh sách nước tuyến tính" bằng một cây: tại bất kỳ nước nào, người dùng có thể đi một nước khác với nước đã ghi trước đó → tạo một **biến (variation)** mới rẽ nhánh tại đúng điểm đó, không ghi đè biến cũ.
- Nếu nước vừa đi trùng với một biến đã tồn tại tại đúng vị trí đó → di chuyển tới nút đã có, không tạo nút trùng lặp.
- **Nâng biến thành chính (promote to mainline)**: chọn một biến, biến đó và toàn bộ tổ tiên của nó trở thành "đường chính" (hiển thị không thụt lề), biến vừa bị thay thế trở thành biến phụ.
- **Xóa biến**: xóa một nút và toàn bộ nhánh con của nó.
- Gắn bình luận văn bản tự do vào từng nút (tùy chọn).
- Điều hướng: bấm vào bất kỳ nút nào trong cây để nhảy bàn cờ tới đúng vị trí đó; nút hiện tại được đánh dấu.
- Giới hạn hợp lý: không giới hạn cứng số biến/độ sâu ở đợt này (dữ liệu chỉ tồn tại trong phiên trình duyệt, chưa lưu server).

### 4. Bàn cờ dựng thế tự do (board editor)

- Trang mới `/chess/editor`: bảng quân hai màu (palette) để chọn 1 trong 6 loại quân × 2 màu, sau đó bấm vào một ô trên bàn để đặt quân đó; bấm một ô đã có quân mà không chọn quân từ palette → xóa quân tại ô đó.
- Điều khiển: bên đi tiếp theo (trắng/đen), quyền nhập thành còn lại của từng bên (4 cờ độc lập: trắng cánh vua/hậu, đen cánh vua/hậu), ô có thể bắt tốt qua đường (tùy chọn, hoặc "không có").
- Nút "Vị trí chuẩn" (reset về thế bắt đầu), "Xóa bàn" (bàn trống hoàn toàn).
- Nhập một chuỗi FEN vào ô văn bản → tự động điền lại toàn bộ bàn/điều khiển theo đúng FEN đó.
- Sinh chuỗi FEN từ trạng thái hiện tại, hiển thị để sao chép, kèm nút "Mở trong trang Phân tích" điều hướng sang `/chess/analysis?fen=<fen đã mã hóa>`.
- Validate FEN trước khi cho phép sao chép/mở — vị trí không hợp lệ (ví dụ thiếu vua, quá 8 tốt một hàng) hiển thị thông báo lỗi, không cho tiếp tục.

### 5. Điều hướng & tiện ích khác

- Phím tắt: mũi tên trái/phải di chuyển tới nút trước/sau trên đường hiện tại của cây biến; phím `Home`/`End` về đầu/cuối đường hiện tại.
- Nút lật bàn cờ (đổi `orientation` giữa trắng/đen) — áp dụng cho cả trang phân tích và trang dựng thế.
- Nút sao chép FEN hiện tại và sao chép PGN (xuất từ cây biến) vào clipboard.

## End-User Value

Giáo viên có thể vẽ chú thích trực quan và khám phá nhiều phương án khi giảng bài phân tích thay vì chỉ mô tả bằng lời; học sinh xem lại đúng những gì giáo viên đã chỉ ra. Giáo viên tự dựng bất kỳ thế cờ nào (kể cả thế cờ tàn cuộc/bài tập tùy biến không xuất phát từ một ván thật) để đưa vào phân tích hoặc (ở đợt sau) vào ngân hàng bài tập.

## How It Works

### Cấu trúc file mới (client-only, không đổi schema/API)

- `apps/web/app/modules/Chess/board/shapes.ts` — kiểu `BoardShape` (`arrow` | `circle`), hàm thuần `resolveShapeColorFromModifiers`, `toggleShape`.
- `apps/web/app/modules/Chess/board/BoardShapesOverlay.tsx` — lớp phủ SVG vẽ mũi tên/vòng tròn theo tọa độ ô, đặt trên lưới bàn cờ hiện có.
- `apps/web/app/modules/Chess/board/glyphs.ts` — danh sách 6 ký hiệu + khóa i18n nhãn.
- `apps/web/app/modules/Chess/board/moveTree.ts` — kiểu `MoveTree`/`MoveNode` + hàm thuần: `createMoveTree(rootFen)`, `addMove(tree, path, move)`, `promoteToMainline(tree, nodeId)`, `deleteNode(tree, nodeId)`, `setComment`, `setGlyph`, `nodesOnPath(tree, path)`.
- `apps/web/app/modules/Chess/board/useMoveTree.ts` — hook bọc `moveTree.ts` bằng React state, quản lý đường đi hiện tại (path tới nút đang xem).
- `apps/web/app/modules/Chess/board/MoveTreeView.tsx` — render cây: đường chính không thụt lề, biến thụt lề lồng nhau; mỗi nút hiển thị số nước + SAN + glyph (nếu có); bấm để điều hướng; nút nâng biến/xóa biến trên từng nút không phải đường chính.
- `apps/web/app/modules/Chess/Editor/ChessEditor.page.tsx` + `BoardEditorGrid.tsx` + `editorFen.ts` (hàm thuần `editorStateFromFen`, `fenFromEditorState`, `STANDARD_EDITOR_STATE`) — trang dựng thế mới.

### Thay đổi trên file có sẵn

- `ChessBoard.tsx`: thêm props tùy chọn `shapes?: BoardShape[]`, `onShapesChange?: (shapes: BoardShape[]) => void`; xử lý `onContextMenu`/`onMouseDown`/`onMouseUp` cho chuột phải khi 2 prop này được truyền — không đổi hành vi khi không truyền (tương thích ngược hoàn toàn với `PgnViewer`, `ChessPlay`, ngân hàng bài tập/ván đang dùng component này).
- `ChessAnalysis.page.tsx`: thay `Input readOnly` liệt kê nước đi bằng `MoveTreeView` (qua `useMoveTree`); thêm `BoardShapesOverlay`; đọc query param `fen` lúc mount (`useSearchParams`) để nhận vị trí từ trang Editor.
- `routes.ts`: thêm `route("chess/editor", "modules/Chess/Editor/ChessEditor.page.tsx")` cùng nhóm với `chess/analysis`.
- `routeAccessConfig.ts`: `"chess/editor": { anyOf: [PERMISSIONS.CHESS_EXERCISE_READ, PERMISSIONS.CHESS_GAME_READ] }` — cùng mức gate với `chess/analysis`/`chess/play` (đợt này không tạo permission mới).
- `navigationConfig.ts`: thêm mục điều hướng "Board editor" (`iconName: "Edit"`) cạnh mục "Analysis" hiện có.
- i18n: thêm khóa mới vào namespace `chess.*` **chỉ ở `en` và `vi`** — theo đúng quy ước đã áp dụng cho toàn bộ module `chess` từ trước (5 ngôn ngữ còn lại dùng `defaultValue` tiếng Anh qua `t(..., { defaultValue: "..." })`, không cần file locale riêng).

### Quyết định kỹ thuật đáng chú ý

- **Không tái sử dụng API `put`/`remove` tăng dần của `chess.js`** để dựng thế trong editor — các thao tác đó validate hợp lệ ngay lập tức (ví dụ không cho 2 vua cùng màu tồn tại tạm thời), gây khó chịu khi đang dựng dở một thế cờ. Thay vào đó, editor giữ trạng thái riêng (8×8 ô + lượt đi + 4 cờ nhập thành + ô bắt tốt qua đường), tự lắp chuỗi FEN bằng hàm thuần, chỉ gọi `validateFen` (export từ `chess.js`) để kiểm tra hợp lệ **trước khi** cho sao chép/mở sang trang khác.
- **Cây biến không lưu server ở đợt này** — toàn bộ trạng thái sống trong state React của trang đang mở (tương tự cách `ChessAnalysis.page.tsx` hiện đã giữ `moveList` chỉ trong state). Việc lưu cây biến vào DB thuộc phạm vi Đợt L2 (Study/Chapter).
- **`ChessBoard.tsx` giữ nguyên triết lý "controlled component"** đã có (không có state FEN nội bộ) — `shapes` cũng theo đúng triết lý đó để nhất quán với cách PR #19 (bàn phân tích cộng tác) đã tái sử dụng thành công component này.

## Test Evidence

- Unit test (Vitest): `apps/web/app/modules/Chess/board/__tests__/moveTree.test.ts` (thêm nước tạo biến mới/tái sử dụng nút đã có, nâng biến thành chính, xóa biến), `shapes.test.ts` (toggle vẽ/xóa hình, resolve màu theo phím bổ trợ), `apps/web/app/modules/Chess/Editor/__tests__/editorFen.test.ts` (lắp FEN từ trạng thái editor, đọc FEN ngược lại, phát hiện vị trí không hợp lệ).
- `pnpm lint-tsc-web` sạch, `pnpm test:web` xanh (chạy trong pre-push hook).

## Follow-up Work (explicitly not done in this pass)

- Không thêm Playwright E2E spec mới cho đợt này — đợt L1 hoàn toàn client-side và đã có unit test Vitest phủ toàn bộ logic thuần (cây biến, FEN editor, màu shape); phần tương tác UI (kéo chuột phải, click nút cây biến) khó kiểm bằng Playwright hiệu quả hơn unit test component, và việc dựng môi trường e2e đầy đủ (Docker/Caddy/tenant subdomain) không cần thiết cho một tính năng không đụng API. Cân nhắc bổ sung khi Đợt L2 (Study) đưa cây biến này vào một luồng có lưu trữ server thật.
- Bàn cờ WASM Stockfish trong trình duyệt (`ceval` của lila) — không port, vi phạm chính sách MIT-only (xem `docs/research/lila/00-cleanroom-policy.md`).
- Biến thể bàn cờ khác chuẩn (Chess960...) trong editor — ngoài phạm vi, xem `docs/research/lila/03-feature-matrix.md` mục A.
