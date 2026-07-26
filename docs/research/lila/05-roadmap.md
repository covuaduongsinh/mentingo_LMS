# Roadmap: còn thiếu so với lila (lichess.org)

> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md), [03-feature-matrix.md](./03-feature-matrix.md) và [04-subsystem-notes.md](./04-subsystem-notes.md) trước. Kế hoạch chi tiết đã duyệt lưu tại `C:\Users\duongsinh\.claude\plans\t-i-mu-n-kh-o-s-t-fluttering-meerkat.md` phía máy dev.

Theo yêu cầu của người dùng, mỗi đợt tự động verify (tsc + eslint sạch, test suite xanh) rồi commit + push + tạo PR + merge vào `main`, tự động chuyển sang đợt tiếp theo, không dừng lại hỏi giữa chừng.

**Điểm xuất phát**: roadmap này bắt đầu ngay sau khi Đợt 1–11 (còn thiếu so với LearnHouse, xem `docs/research/learnhouse/05-roadmap.md`) đã merged hoàn toàn vào `main` (PR #9–#19), bao gồm bàn phân tích cờ cộng tác thời gian thực (PR #19, `chess_analysis_sessions`) — hạ tầng đó được **tái dùng** ở Đợt L1/L4 dưới đây, không làm lại.

| Đợt     | PR                  | Nội dung                                                                |
| ------- | ------------------- | ----------------------------------------------------------------------- |
| **L0**  | #20 merged          | Tài liệu khảo sát clean-room `docs/research/lila/` (6 file, không code) |
| **L1**  | #21 merged          | Nền bàn cờ tương tác: shapes, glyph, cây biến, board editor             |
| **L2**  | #22 merged          | Study/Chapter: bài giảng cờ tương tác + nhúng vào khóa học              |
| **L3**  | #23 merged          | Glicko-2 + ngân hàng Puzzle CC0 + luyện tập thích ứng + dashboard       |
| **L4**  | _(đang triển khai)_ | Chơi trực tuyến người-với-người                                         |
| **L5**  |                     | Lớp học cờ: tài khoản do giáo viên quản lý                              |
| **L6**  |                     | Ghép cặp hàng loạt + giải đấu Swiss/Arena/Simul                         |
| **L7**  |                     | Nhập môn: Learn/Coordinate/Practice                                     |
| **L8**  |                     | Phân tích điểm mạnh-yếu (Insight/Tutor)                                 |
| **L9**  |                     | Cộng đồng cờ: mở rộng community forum có sẵn                            |
| **L10** |                     | Tường thuật giải đấu (Broadcast/Relay)                                  |

## Đợt L0 — Tài liệu khảo sát clean-room _(đang triển khai)_

Không code. Tạo 6 file `docs/research/lila/` (chính tài liệu này + 00–04) để chốt ranh giới pháp lý và bản đồ tính năng trước khi viết bất kỳ dòng code nào. Cũng cập nhật `HANDOVER.md` đóng mục roadmap LearnHouse cũ và mở mục mới cho roadmap này.

## Đợt L1 — Nền bàn cờ tương tác + Board Editor

Nâng cấp `apps/web/app/modules/Chess/board/` (client-side, không đụng schema DB):

- Vẽ mũi tên & tô ô (shapes) bằng chuột phải, lưu theo từng nước đi.
- Ký hiệu NAG/glyph (`!`, `?`, `!!`, `??`, `!?`, `?!`).
- **Cây biến (variation tree)** thay cho danh sách nước tuyến tính: thêm biến, nâng biến thành chính, xóa biến, bình luận từng nút. Nền cho L2/L3/L8.
- **Board editor**: đặt/xóa quân tự do, chọn lượt đi, quyền nhập thành, ô en passant, sinh & nhập FEN.
- Phím tắt điều hướng, lật bàn, sao chép FEN/PGN.

Không dùng chessground (GPL) — mở rộng `ChessBoard.tsx`/`chess.js` (MIT) sẵn có. Không đụng `chess_analysis_sessions` (PR #19) — đó là phòng cộng tác tạm thời, tách biệt hoàn toàn khỏi các component board client-side ở đợt này.

## Đợt L2 — Study/Chapter: bài giảng cờ tương tác

> **Đã merged (PR #22)** — xem `docs/specs/chess-study-business-spec.md` (đặc tả đầy đủ + "Follow-up Work" cho phần lùi lại). Tóm tắt khác biệt so với kế hoạch gốc bên dưới.

Bảng mới: `chess_studies`, `chess_study_chapters`, `chess_study_members` (+ migration RLS riêng, mẫu `chess_exercises`/`0163` → `0183`/`0184`).

- Study nhiều chương, mỗi chương một cây nước đi có bình luận/glyph, lưu server dạng danh sách kề phẳng (dùng lại engine cây biến từ L1 qua `flattenMoveTree`/`unflattenMoveTree`).
- **Chế độ chương**: thường · **gamebook** (hỏi–đáp, học sinh tự tìm nước đúng trên đường chính) · **conceal** (che nước từ ply X) · **practice goal** (mục tiêu dạng văn bản tự do, hiển thị cho người học — **chưa** tự động chấm điểm theo mục tiêu, để dành cho Đợt L7).
- Phân quyền: chủ sở hữu / thành viên `write` / thành viên `read`; hiển thị công khai · riêng tư (**bỏ** "không niêm yết" — chưa có giá trị nghiệp vụ rõ ràng khi chưa có chia sẻ liên kết công khai không cần đăng nhập).
- Clone study (chỉ cần quyền đọc study gốc), gắn chủ đề (tái dùng `CHESS_TOPICS`).
- Permission mới: `chess.study.read`, `chess.study.create`, `chess.study.manage`, `chess.study.manage_own`.

**Lùi lại sang đợt sau / chưa làm** (xem "Follow-up Work" trong spec để biết lý do chi tiết): nhúng study vào lesson khóa học (lesson type/TipTap block riêng), import/export PGN theo chương, lượt thích (`chess_study_likes`), E2E Playwright.

## Đợt L3 — Glicko-2 + Ngân hàng Puzzle thích ứng

> **Đã merged (PR #23)** — xem `docs/specs/chess-puzzle-rating-business-spec.md` (đặc tả đầy đủ + "Follow-up Work"). Tóm tắt khác biệt so với kế hoạch gốc bên dưới.

Bảng mới: `chess_puzzles`, `chess_puzzle_attempts`, `chess_ratings`, `chess_rating_history` (+ migration RLS riêng, `0185`/`0186`).

- **Cài đặt Glicko-2** (rating, RD, volatility) từ đặc tả toán học public-domain (Mark Glickman) — không nhìn code lila; unit test đối chiếu đúng ví dụ số minh họa chính thức trong tài liệu gốc. Áp dụng cho puzzle (`chess_ratings.category = 'puzzle'`, cột `category` mở rộng được cho thể loại thời gian ở L4).
- **Import CSV có lọc**: job BullMQ (`ChessPuzzleImportWorker`) nhận nội dung CSV theo cấu trúc cột Lichess Puzzle Database (CC0), lọc theo `minRating`/`maxRating`/`motifs`/`maxCount` trước khi insert theo lô — **đơn giản hóa so với kế hoạch gốc**: nhận CSV dạng chuỗi trong body JSON thay vì qua `FileService`/multipart upload; việc thực sự tải một bộ dữ liệu CC0 đầy đủ về production là thao tác vận hành, chưa thực hiện trong đợt này (ngân hàng puzzle production trống cho tới khi import được chạy).
- **Taxonomy motif**: `CHESS_MOTIFS` mới trong `packages/shared/src/constants/chess.ts` (30 motif chiến thuật, nhãn tiếng Việt — ít hơn ~60 dự kiến ban đầu, đủ cho quy mô trường/CLB), giữ nguyên `CHESS_TOPICS` làm trục chương trình học.
- **Chọn puzzle thích ứng**: theo rating ± delta độ khó, UI cho 3 mức (dễ/vừa/khó) thay vì 5 — backend không giới hạn số mức, có thể mở UI sau; nới khoảng tìm kiếm tự động khi ngân hàng chưa đủ puzzle khớp.
- **Replay puzzle đã sai**: liệt kê puzzle sai và chưa giải đúng lại lần nào.
- **Dashboard tiến bộ**: hệ số + lịch sử, hiệu suất theo motif, tự động chỉ điểm yếu (≥3 lượt sai, tỉ lệ đúng dưới trung bình) và điểm mạnh.
- Puzzle hằng ngày (chọn định theo ngày, dùng chung cho cả tenant).
- Permission: `chess.puzzle.read`, `chess.puzzle.manage`.

**Lùi lại / chưa làm**: streak toàn hệ thống (`user_statistics`) chưa tính lượt giải puzzle — chặn bởi một vòng lặp require() cấp file phát hiện giữa `src/chess/` và `src/statistics/` (xem `docs/specs/chess-puzzle-rating-business-spec.md` và trang wiki `nestjs-file-level-circular-require-vs-module-cycle`); Puzzle Storm/Racer (đã loại khỏi phạm vi từ đầu, xem `03-feature-matrix.md`); nhập CC0 thật vào production.

## Đợt L4 — Chơi trực tuyến người-với-người

> **Đã triển khai** — xem `docs/specs/chess-online-match-business-spec.md`. Tóm tắt khác biệt so với kế hoạch gốc bên dưới.

Bảng mới: `chess_seeks` (gộp cả seek mở và thách đấu đích danh, thay vì 2 bảng riêng), `chess_matches`, `chess_match_moves` (+ migration RLS riêng, `0187`/`0188`).

> ⚠️ Bảng `chess_games` hiện tại là ngân hàng PGN dạy học, không phải ván đấu — ván đấu online dùng `chess_matches`, đúng như đã lường trước.

- Mở rộng `WsGateway` hiện có (không tạo gateway riêng, đúng mẫu PR #19): đi nước (validate bằng `chess.js`), đồng hồ server-authoritative (tính lại theo thời gian trôi qua từ `lastMoveAt`, hết giờ phát hiện qua BullMQ delayed job đặt lại sau mỗi nước — không phải polling phía client), đầu hàng, xin hòa/chấp nhận hòa.
- Một bảng `chess_seeks` duy nhất cho cả seek mở (`challengedUserId = null`) và thách đấu đích danh — đơn giản hóa so với kế hoạch gốc (2 bảng `chess_challenges`/`chess_seeks` riêng).
- Xem trực tiếp (join phòng với vai trò viewer, không đi được nước).
- Ván tính rating → cập nhật Glicko-2 hai chiều (tái dùng nguyên `updateRating` từ L3), mở rộng `chess_ratings.category` với `bullet`/`blitz`/`rapid` (suy ra tự động từ thời gian cơ bản của ván).
- Permission: `chess.match.play`, `chess.match.watch`.

**Lùi lại / chưa làm** (xem "Follow-up Work" trong spec): xin hoãn nước (takeback), chat trong ván đấu (mẫu `course_chat` sẵn sàng tái dùng sau), chống gian lận nâng cao (chặn truy cập engine), cờ thư (không giới hạn thời gian chặt).

**Phát hiện kỹ thuật quan trọng khi triển khai**: `ChessMatchService`/mọi file trong `src/chess/` không được import bất kỳ thứ gì từ `src/statistics/` dưới dạng giá trị (bài học từ L3 — vòng lặp require() cấp file, xem `nestjs-file-level-circular-require-vs-module-cycle`). Khi service cần tự phát sự kiện realtime (không phải phản hồi trực tiếp một message WS tới, ví dụ khi job hết giờ kích hoạt), dùng `@Inject(REALTIME_PUBLISHER)` với type `RealtimePublisher` từ `src/websocket/realtime.publisher.ts` — file này không import gì cả nên an toàn tuyệt đối, đã được `course-chat.service.ts` dùng đúng cách này từ trước.

## Đợt L5 — Lớp học cờ: tài khoản do giáo viên quản lý

Xây trên `groups` sẵn có, không tạo mô hình lớp song song.

- Mở rộng `users`: `managedByUserId`, `realName`, `isManagedAccount`. Bảng mới `chess_class_login_codes`.
- Tạo tài khoản học sinh không cần email, tạo hàng loạt từ danh sách tên (bộ ký tự loại bỏ ký tự dễ nhầm — xem [04-subsystem-notes.md](./04-subsystem-notes.md) mục 6).
- Mã đăng nhập lớp ngắn hạn (15 phút — xem mục 5 cùng file trên).
- Đặt lại mật khẩu, lưu trữ, chuyển lớp, giải phóng tài khoản.
- Tên thật tách khỏi username.
- Báo cáo tiến độ lớp: biến thiên rating theo N ngày, tỉ lệ thắng, thời lượng, tiến độ puzzle theo theme.
- Permission: `chess.class.manage_students`, `chess.class.reset_password`, `chess.class.progress`.

## Đợt L6 — Ghép cặp hàng loạt + Giải đấu nội bộ

Bảng mới: `chess_tournaments`, `chess_tournament_players`, `chess_tournament_pairings`, `chess_bulk_pairings`.

- Ghép cặp hàng loạt (giá trị dạy học cao nhất nhóm này).
- Swiss: tiebreak chuẩn, xuất TRF FIDE, vào muộn tối đa nửa số vòng.
- Arena: ghép cặp liên tục, bảng xếp hạng thời gian thực.
- Simul: 1 HLV vs nhiều học sinh.
- Điều kiện tham gia: khoảng rating, nhóm/lớp, số ván tối thiểu.
- Permission: `chess.tournament.read/create/manage`.

## Đợt L7 — Nhập môn: Learn · Tọa độ · Practice

- Learn: chuỗi bài nhập môn theo cấp, nội dung tự viết tiếng Việt, cấu trúc stage × level.
- Luyện tọa độ: 2 chế độ × 2 màu.
- Practice: chuỗi study có mục tiêu (dùng Study từ L2), ghi nhận số nước tối thiểu.
- Gắn vào `learning_paths` sẵn có.

## Đợt L8 — Phân tích điểm mạnh-yếu (Insight/Tutor)

Bảng mới: `chess_game_insights`.

- Chấm độ chính xác ván đấu bằng Arasan qua BullMQ job (không Stockfish).
- Truy vấn nhiều chiều: khai cuộc/giai đoạn/loại quân/thời gian/đánh giá.
- Báo cáo tự động mạnh/yếu cho học sinh & giáo viên.

## Đợt L9 — Cộng đồng cờ

- CLB tự phục vụ (khác `groups` do admin quản lý).
- Tin nhắn riêng 1-1.
- Follow/block, dòng hoạt động bạn bè.
- Danh bạ HLV.
- Kid mode xuyên suốt.
- Mở rộng community forum đã có (PR #15), không viết lại.

## Đợt L10 — Tường thuật giải đấu (Broadcast)

- Kéo PGN từ nguồn ngoài theo chu kỳ, phát ván trực tiếp.
- Nhiều vòng, nhiều bàn, bảng xếp hạng đội, trễ phát sóng chống gian lận.

## Loại khỏi phạm vi (đã cân nhắc, quyết định không làm)

Danh sách đầy đủ + lý do từng mục nằm ở [03-feature-matrix.md](./03-feature-matrix.md) mục L. Tóm tắt: TV toàn cầu/streamer (không phù hợp mô hình trường), Bot API/Board API/jsBot (đối tượng lập trình viên), fishnet/Stockfish/chessground (vi phạm chính sách MIT-only), Irwin/Kaladin/playban/shutup/hệ mod-report-appeal ~70 action (quá nặng cho quy mô 1 tenant, đã có `activity_logs` + RBAC), Opening explorer + tablebase (cần hạ tầng dataset riêng), FIDE sync + xác minh danh hiệu (không áp dụng cấp trường/CLB cơ sở), DGT board/voice control/nvui (ngách hẹp), CMS tĩnh + video curated (đã có `articles`/`news`/`qa`), patron/donate (mô hình doanh thu khác Stripe bán khóa học hiện có), ublog (trùng `articles`+`news`+Public Profile), Chess960 + 7 biến thể (ngoài chương trình cờ vua học đường Việt Nam), cờ thư/correspondence (độ phức tạp cao, giá trị thấp hơn ván nhanh trong buổi học trực tiếp).

## Cách dùng roadmap này

Mỗi đợt bắt đầu bằng việc viết `docs/specs/<feature>-business-spec.md` mô tả hành vi nghiệp vụ **thật đầy đủ, tỉ mỉ đến từng khía cạnh** (mẫu: `docs/specs/assignment-engine-business-spec.md`, `docs/specs/collaborative-chess-analysis-board-business-spec.md`), sau đó mới viết code. Người triển khai đợt sau không cần đọc lại lila — toàn bộ ngữ cảnh thiết kế cần thiết đã nằm trong 5 file của `docs/research/lila/` và trong business spec của chính đợt đó. Đây là ranh giới clean-room bắt buộc theo [00-cleanroom-policy.md](./00-cleanroom-policy.md) mục 7: khảo sát (đọc lila, viết đặc tả) và lập trình (đọc đặc tả, viết code mentingo) là hai giai đoạn tách biệt.
