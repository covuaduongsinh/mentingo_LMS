# Roadmap: còn thiếu so với lila (lichess.org)

> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md), [03-feature-matrix.md](./03-feature-matrix.md) và [04-subsystem-notes.md](./04-subsystem-notes.md) trước. Kế hoạch chi tiết đã duyệt lưu tại `C:\Users\duongsinh\.claude\plans\t-i-mu-n-kh-o-s-t-fluttering-meerkat.md` phía máy dev.

Theo yêu cầu của người dùng, mỗi đợt tự động verify (tsc + eslint sạch, test suite xanh) rồi commit + push + tạo PR + merge vào `main`, tự động chuyển sang đợt tiếp theo, không dừng lại hỏi giữa chừng.

**Điểm xuất phát**: roadmap này bắt đầu ngay sau khi Đợt 1–11 (còn thiếu so với LearnHouse, xem `docs/research/learnhouse/05-roadmap.md`) đã merged hoàn toàn vào `main` (PR #9–#19), bao gồm bàn phân tích cờ cộng tác thời gian thực (PR #19, `chess_analysis_sessions`) — hạ tầng đó được **tái dùng** ở Đợt L1/L4 dưới đây, không làm lại.

| Đợt     | PR               | Nội dung                                                                |
| ------- | ---------------- | ----------------------------------------------------------------------- |
| **L0**  | #20 merged       | Tài liệu khảo sát clean-room `docs/research/lila/` (6 file, không code) |
| **L1**  | #21 merged       | Nền bàn cờ tương tác: shapes, glyph, cây biến, board editor             |
| **L2**  | #22 merged       | Study/Chapter: bài giảng cờ tương tác + nhúng vào khóa học              |
| **L3**  | #23 merged       | Glicko-2 + ngân hàng Puzzle CC0 + luyện tập thích ứng + dashboard       |
| **L4**  | #24 merged       | Chơi trực tuyến người-với-người                                         |
| **L5**  | #25 merged       | Lớp học cờ: tài khoản do giáo viên quản lý                              |
| **L6**  | #26 merged       | Ghép cặp hàng loạt + giải đấu Swiss/Arena/Simul                         |
| **L7**  | #27 merged       | Nhập môn: Learn/Coordinate/Practice                                     |
| **L8**  | #28 merged       | Phân tích điểm mạnh-yếu (Insight/Tutor)                                 |
| **L9**  | #29 merged       | Cộng đồng cờ: mở rộng community forum có sẵn                            |
| **L10** | _(chưa bắt đầu)_ | Tường thuật giải đấu (Broadcast/Relay)                                  |

## Đợt L0 — Tài liệu khảo sát clean-room _(Đã merged, PR #20)_

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

> **Đã merged (PR #24)** — xem `docs/specs/chess-online-match-business-spec.md`. Tóm tắt khác biệt so với kế hoạch gốc bên dưới.

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

> **Đã merged (PR #25)** — xem `docs/specs/chess-class-management-business-spec.md`. Tóm tắt khác biệt so với kế hoạch gốc bên dưới.

Xây trên `groups` sẵn có, không tạo mô hình lớp song song.

- Mở rộng `users`: `managedByUserId`, `realName`, `isManagedAccount`. Bảng mới `chess_class_login_codes` (+ migration RLS riêng, `0189`/`0190`).
- Tạo tài khoản học sinh không cần email (dùng **email giả sinh tự động** để giữ nguyên ràng buộc NOT NULL/unique hiện có của `users.email`, tránh rà soát lại toàn bộ nơi phụ thuộc email thật), tạo hàng loạt từ danh sách tên (bộ ký tự loại bỏ ký tự dễ nhầm — xem [04-subsystem-notes.md](./04-subsystem-notes.md) mục 6). `firstName`/`lastName` hiển thị công khai là **bút danh sinh tự động** (tên quân cờ + số), `realName` mới là tên thật, chỉ giáo viên/admin xem được.
- Mã đăng nhập lớp ngắn hạn (15 phút — xem mục 5 cùng file trên) qua endpoint public riêng `POST /auth/class-login`, mô phỏng đúng mẫu `handleMagicLinkLogin` đã có (khóa dòng, dùng một lần) — không sửa `LocalStrategy`/`validateUser` hiện có.
- Đặt lại mật khẩu, giải phóng tài khoản (trả `create_tokens` token trong response, giáo viên tự gửi — **lùi lại** việc tự động gửi email để tránh kéo `EmailModule` vào module mới).
- Tên thật tách khỏi username/bút danh hiển thị.
- Báo cáo tiến độ lớp: biến thiên rating theo N ngày, tỉ lệ thắng, tiến độ puzzle theo theme (tái dùng `ChessPuzzleService.getDashboard` cho từng thành viên).
- Permission: `chess.class.manage_students`, `chess.class.reset_password`, `chess.class.progress`.

**Lùi lại / chưa làm** (xem "Follow-up Work" trong spec): chuyển lớp hàng loạt, giới hạn quyền tài khoản managed (thuộc phạm vi kid mode ở L9), biểu đồ trực quan cho báo cáo tiến độ, tự động gửi email khi giải phóng tài khoản.

**Phát hiện kỹ thuật quan trọng khi triển khai**: thêm 3 cột vào bảng `users` làm vỡ `tsc` với `TS2589: Type instantiation is excessively deep` ở schema tổng hợp `currentUserResponseSchema` — sửa bằng cách đổi outer `Type.Composite` sang `Type.Intersect` (rẻ hơn cho compiler vì không flatten object type), không đổi field nào. Cách sửa sai đã thử trước (nới `permissions` sang `Type.Array(Type.String())`) làm `tsc` API sạch nhưng vỡ ~15 file phía frontend cần kiểu `PermissionKey[]` chặt — chỉ lộ ra sau khi chạy `generate:client` + `lint-tsc-web`. Xem wiki nội bộ `typebox-composite-ts2589-depth-limit`.

## Đợt L6 — Ghép cặp hàng loạt + Giải đấu nội bộ

> **Đã merged (PR #26)** — xem `docs/specs/chess-tournament-business-spec.md`. Tóm tắt khác biệt so với kế hoạch gốc bên dưới.

Bảng mới: `chess_tournaments`, `chess_tournament_players`, `chess_tournament_pairings` (+ migration RLS riêng, `0191`/`0192`) — **không có** `chess_bulk_pairings` riêng như kế hoạch gốc: ghép cặp hàng loạt tái dùng chung 3 bảng trên với `format = 'bulk_pairing'`, `roundCount = 1`, đơn giản hơn mà không mất khả năng truy vấn thống nhất.

- Ghép cặp hàng loạt (giá trị dạy học cao nhất nhóm này): thủ công hoặc tự động theo rating hiện tại trong hạng mục thời gian đã chọn.
- Swiss: sinh vòng theo thuật toán **đơn giản hóa** (chia đôi theo điểm, ghép nửa trên/nửa dưới, tránh ghép lại nếu còn lựa chọn khác, bye cho điểm thấp nhất chưa từng bye — không phải FIDE Dutch System đầy đủ), tiebreak Buchholz + Sonneborn-Berger tính lại từ đầu mỗi lần cần (pull-based, không lưu trạng thái tăng dần), xuất TRF **rút gọn** (không phải TRF16 đầy đủ), vào muộn tối đa nửa số vòng (tự nhiên nhận 0 điểm vòng bỏ lỡ nhờ cách tính điểm pull-based).
- Arena: ghép cặp theo sự kiện (đăng ký/ván kết thúc) qua endpoint `pair-next`, không phải vòng lặp nền liên tục 24/7 như lila; bảng xếp hạng tính lại mỗi lần xem.
- Simul: 1 HLV vs nhiều học sinh — tái dùng chung cơ chế ghép cặp hàng loạt với một bên cố định là host.
- Điều kiện tham gia: khoảng rating, nhóm/lớp, số ván tối thiểu.
- Permission: `chess.tournament.read/create/manage`.

**Lùi lại / chưa làm** (xem "Follow-up Work" trong spec): thuật toán Thụy Sĩ chuẩn FIDE đầy đủ, Arena ghép cặp nền liên tục 24/7, "streak"/"berserk" của Arena, sửa cặp đấu thủ công sau khi vòng đã sinh, xuất TRF đúng chuẩn FIDE TRF16, cân bằng màu quân theo lịch sử.

**Phát hiện kỹ thuật quan trọng khi triển khai**: mọi luồng ghép cặp (thủ công/tự động/Swiss/Arena/Simul) đều đi qua một hàm dùng chung gọi `ChessMatchService.createDirectMatch` (phương thức public mới, tách từ logic `acceptSeek` của L4) để đảm bảo ván nào cũng được lên lịch job kiểm tra hết giờ giống hệt ván qua sảnh seek. Điểm/tiebreak được tính **pull-based** (đọc thẳng `chess_matches` mỗi lần cần) thay vì để `ChessMatchService.endMatch` gọi ngược vào module mới — nếu làm vậy `chess.module.ts` và `chess-tournament.module.ts` sẽ import lẫn nhau, đúng hình dạng lỗi vòng lặp cấp file đã gặp ở L3 (`nestjs-file-level-circular-require-vs-module-cycle`).

## Đợt L7 — Nhập môn: Learn · Tọa độ · Practice

> **Đã triển khai** — xem `docs/specs/chess-learn-business-spec.md`. Tóm tắt khác biệt so với kế hoạch gốc bên dưới.

- Learn: 10 stage nội dung tự viết tiếng Việt (cấu trúc stage × level), mỗi stage 1-2 level đã kiểm tra tay kỹ (bàn cờ thưa, dễ xác minh) thay vì bộ nội dung lớn — có thể mở rộng thêm level sau. Bảng tiến độ mới `chess_learn_progress` (RLS riêng, `0193`/`0194`).
- Luyện tọa độ: 2 chế độ (tìm ô theo tên / gọi tên ô) × 2 màu — hoàn toàn client-side, chưa lưu điểm cao nhất (xem "Follow-up Work" trong spec).
- Practice: kích hoạt chấm điểm tự động cho trường `practiceGoal` đã có từ L2 (thêm 2 cột có cấu trúc `practiceGoalType`/`practiceGoalTargetValue`), chấm bằng cách phát lại nước đi server-side qua `chess.js`, ghi nhận số nước tối thiểu đã dùng. Bảng mới `chess_practice_attempts`.
- **Chưa làm**: gắn vào `learning_paths` sẵn có, soạn nội dung Learn qua UI cho giáo viên, khóa stage tuần tự — xem "Follow-up Work" trong spec.

**Phát hiện quan trọng khi triển khai**: nội dung Learn (kể cả đáp án `solutionUci`) là dữ liệu tĩnh trong `packages/shared` — package này dùng chung cho cả API lẫn web, nên **không được để frontend import trực tiếp mảng nội dung** (sẽ rò rỉ đáp án vào bundle trình duyệt); response `GET /chess-learn/stages` phải tự trả về danh sách level ID cần thiết để frontend điều hướng, không dựa vào import chung. Cũng gặp lại đúng lỗi trùng tên method controller đã ghi nhận từ L2 (`swagger-typescript-api` đặt tên DTO theo tên method, không theo class) — `submitAttempt` trùng giữa `ChessLearnController` và `ChessController` hiện có, phải đổi tên thành `submitLearnAttempt`.

## Đợt L8 — Phân tích điểm mạnh-yếu (Insight/Tutor)

> **Đã merged (PR #28)** — xem `docs/specs/chess-insight-tutor-business-spec.md`. Tóm tắt khác biệt so với kế hoạch gốc bên dưới.

Bảng mới: `chess_game_insights` (mỗi ply một entry — làm phẳng, không phải một entry mỗi ván; RLS riêng, `0195`/`0196`).

- Chỉ áp dụng cho **ván đấu trực tuyến** (`chess_matches`, L4) — không đụng ngân hàng PGN tĩnh (`chess_games`) hay puzzle (đã có dashboard riêng từ L3).
- Chấm độ chính xác từng nước bằng engine MIT (Arasan/builtin, không Stockfish) qua BullMQ job (`chess-match-insight-analysis`) tự động xếp hàng khi `ChessMatchService.endMatch` kết thúc một ván có ≥2 nước — **một** lệnh gọi engine mỗi nước (không phải hai): điểm sau nước thứ _k_ tái dùng tự nhiên làm điểm trước nước thứ _k+1_.
- Độ chính xác dùng công thức suy giảm mũ **tự thiết kế** `100 × e^(−centipawnLoss/300)` — cố ý khác công thức win%-based mà lichess công bố.
- Truy vấn nhiều chiều: giai đoạn (khai/trung/tàn cuộc, heuristic tự chọn theo ply + vật chất còn lại), loại quân, khai cuộc (sổ khai cuộc rút gọn ~20 mục tự soạn, khớp tiền tố UCI dài nhất).
- Thời gian suy nghĩ mỗi nước **suy ra** từ `chess_match_moves.createdAt` (không thêm cột mới).
- Báo cáo Tutor tự động: yếu/mạnh theo giai đoạn/loại quân/khai cuộc (ngưỡng mẫu tối thiểu + so sánh nội bộ, cùng nguyên tắc dashboard puzzle L3), quản lý thời gian (cờ "cần cải thiện" nếu hay thua vì hết giờ), khả năng gỡ thế xấu, khả năng chuyển ưu thế thành thắng (cả hai suy từ quỹ đạo đánh giá — không lưu thêm cột), so sánh trung bình toàn tenant (đơn giản hóa, không theo khoảng rating).
- Báo cáo chi tiết theo từng ván (post-game review) + endpoint yêu cầu phân tích lại thủ công (giáo viên/admin).
- Permission mới: `chess.insight.read` (xem báo cáo của chính mình), `chess.insight.read_all` (xem báo cáo người khác — trainer/admin, cùng mức `chess.class.progress`).

**Lùi lại / chưa làm** (xem "Follow-up Work" trong spec): so sánh theo khoảng rating (peer group), backfill ván đã kết thúc trước khi tính năng lên production, biểu đồ eval-graph trực quan.

**Phát hiện kỹ thuật quan trọng khi triển khai**: xác minh bằng smoke test thủ công qua Caddy (không chỉ tsc/eslint/jest) — tạo ván thật qua API, chèn tay một ván "fool's mate" đã kết thúc, gọi endpoint phân tích lại, xác nhận job chạy thật và báo cáo tổng hợp đúng số liệu. Trong lúc đó tái xác nhận lỗi Node đã biết: quên `export PATH=".../v22.15.0/installation:$PATH"` ở **một** lệnh Bash riêng lẻ (dù đã export ở lệnh trước) khiến `git push` chạy pre-push hook dưới Node 25 → vỡ ngay với lỗi JWT/`buffer-equal-constant-time` — mỗi lệnh Bash là một shell mới, không có ngoại lệ.

## Đợt L9 — Cộng đồng cờ

> **Đã merged (PR #29)** — xem `docs/specs/chess-community-business-spec.md`. Tóm tắt khác biệt so với kế hoạch gốc bên dưới.

Bảng mới: `community_conversations`, `community_messages`, `community_user_relationships` (gộp follow+block vào một bảng có cột `relationshipType`, thay vì bảng riêng — RLS riêng, `0197`/`0198`).

- **Tin nhắn riêng 1-1**: hội thoại chuẩn hoá theo cặp `userAId < userBId`, đẩy realtime tin nhắn mới qua phòng `user:<id>` sẵn có của `WsGateway` (không tạo gateway riêng — mọi kết nối WS đã tự động join phòng này lúc xác thực).
- **Follow/block**: chặn tự huỷ theo dõi hai chiều; chặn không bị giới hạn kid mode (luôn cho phép tự bảo vệ).
- **Danh bạ HLV**: join `permissionUserRoles`/`permissionRoles` (`slug = 'trainer'`) với `users.publicProfileEnabled = true` — tái dùng Public Profile (PR #15), không thêm bảng/quyền riêng.
- **Kid mode** áp dụng cho đúng 2 tính năng mới (nhắn tin, theo dõi): managed account (L5) chỉ tương tác được với bạn cùng lớp (cùng `groups`) theo cả hai chiều — không mở rộng ra toàn hệ thống (diễn đàn/bình luận giữ nguyên).
- Permission mới: `community.message.send`/`community.social.manage`; đồng thời bổ sung `community.read`/`post.create`/`post.manage_own` còn thiếu cho vai trò `trainer` (lỗ hổng sót từ Đợt 7 — trainer trước đó không có quyền cộng đồng nào).

**Lùi lại / chưa làm** (xem "Follow-up Work" trong spec): CLB tự phục vụ (khác `groups` do admin quản lý — hệ thống thành viên song song đủ lớn để tách đợt riêng), dòng hoạt động bạn bè (activity feed), kid mode cho diễn đàn/bình luận, nhắn tin nhóm/thu hồi/sửa tin/báo đã xem UI, thông báo email khi có tin nhắn mới, ô tìm kiếm toàn bộ người dùng tenant (cố ý thu hẹp còn danh sách gợi ý: bạn cùng lớp/HLV/đang theo dõi/đã từng chat).

**Phát hiện kỹ thuật quan trọng khi triển khai**: 2 bug thật chỉ lộ ra qua smoke test thủ công qua Caddy (test đơn vị mock repository nên không chạy SQL thật) — (1) alias cột raw SQL viết `snake_case` nhưng code TS truy cập `camelCase`, phải quote alias (`AS "otherUserId"`) vì `postgres.js` trả về key đúng y hệt alias đã viết; (2) `sql\`${col} = ANY(${jsArray})\``với drizzle-orm's`sql`tag không chuyển mảng JS thành Postgres array literal đúng cách, phải dùng`inArray()` (helper có sẵn của drizzle-orm) thay cho raw SQL khi cần so khớp một mảng giá trị.

## Đợt L10 — Tường thuật giải đấu (Broadcast)

- Kéo PGN từ nguồn ngoài theo chu kỳ, phát ván trực tiếp.
- Nhiều vòng, nhiều bàn, bảng xếp hạng đội, trễ phát sóng chống gian lận.

## Loại khỏi phạm vi (đã cân nhắc, quyết định không làm)

Danh sách đầy đủ + lý do từng mục nằm ở [03-feature-matrix.md](./03-feature-matrix.md) mục L. Tóm tắt: TV toàn cầu/streamer (không phù hợp mô hình trường), Bot API/Board API/jsBot (đối tượng lập trình viên), fishnet/Stockfish/chessground (vi phạm chính sách MIT-only), Irwin/Kaladin/playban/shutup/hệ mod-report-appeal ~70 action (quá nặng cho quy mô 1 tenant, đã có `activity_logs` + RBAC), Opening explorer + tablebase (cần hạ tầng dataset riêng), FIDE sync + xác minh danh hiệu (không áp dụng cấp trường/CLB cơ sở), DGT board/voice control/nvui (ngách hẹp), CMS tĩnh + video curated (đã có `articles`/`news`/`qa`), patron/donate (mô hình doanh thu khác Stripe bán khóa học hiện có), ublog (trùng `articles`+`news`+Public Profile), Chess960 + 7 biến thể (ngoài chương trình cờ vua học đường Việt Nam), cờ thư/correspondence (độ phức tạp cao, giá trị thấp hơn ván nhanh trong buổi học trực tiếp).

## Cách dùng roadmap này

Mỗi đợt bắt đầu bằng việc viết `docs/specs/<feature>-business-spec.md` mô tả hành vi nghiệp vụ **thật đầy đủ, tỉ mỉ đến từng khía cạnh** (mẫu: `docs/specs/assignment-engine-business-spec.md`, `docs/specs/collaborative-chess-analysis-board-business-spec.md`), sau đó mới viết code. Người triển khai đợt sau không cần đọc lại lila — toàn bộ ngữ cảnh thiết kế cần thiết đã nằm trong 5 file của `docs/research/lila/` và trong business spec của chính đợt đó. Đây là ranh giới clean-room bắt buộc theo [00-cleanroom-policy.md](./00-cleanroom-policy.md) mục 7: khảo sát (đọc lila, viết đặc tả) và lập trình (đọc đặc tả, viết code mentingo) là hai giai đoạn tách biệt.
