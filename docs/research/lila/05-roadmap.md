# Roadmap: còn thiếu so với lila (lichess.org)

> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md), [03-feature-matrix.md](./03-feature-matrix.md) và [04-subsystem-notes.md](./04-subsystem-notes.md) trước. Kế hoạch chi tiết đã duyệt lưu tại `C:\Users\duongsinh\.claude\plans\t-i-mu-n-kh-o-s-t-fluttering-meerkat.md` phía máy dev.

Theo yêu cầu của người dùng, mỗi đợt tự động verify (tsc + eslint sạch, test suite xanh) rồi commit + push + tạo PR + merge vào `main`, tự động chuyển sang đợt tiếp theo, không dừng lại hỏi giữa chừng.

**Điểm xuất phát**: roadmap này bắt đầu ngay sau khi Đợt 1–11 (còn thiếu so với LearnHouse, xem `docs/research/learnhouse/05-roadmap.md`) đã merged hoàn toàn vào `main` (PR #9–#19), bao gồm bàn phân tích cờ cộng tác thời gian thực (PR #19, `chess_analysis_sessions`) — hạ tầng đó được **tái dùng** ở Đợt L1/L4 dưới đây, không làm lại.

| Đợt     | PR                  | Nội dung                                                                |
| ------- | ------------------- | ----------------------------------------------------------------------- |
| **L0**  | _(đang triển khai)_ | Tài liệu khảo sát clean-room `docs/research/lila/` (6 file, không code) |
| **L1**  |                     | Nền bàn cờ tương tác: shapes, glyph, cây biến, board editor             |
| **L2**  |                     | Study/Chapter: bài giảng cờ tương tác + nhúng vào khóa học              |
| **L3**  |                     | Glicko-2 + ngân hàng Puzzle CC0 + luyện tập thích ứng + dashboard       |
| **L4**  |                     | Chơi trực tuyến người-với-người                                         |
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

Bảng mới: `chess_studies`, `chess_study_chapters`, `chess_study_members`, `chess_study_likes` (+ migration RLS riêng, mẫu `chess_exercises`/`0163`).

- Study nhiều chương, mỗi chương một cây nước đi có bình luận/shapes/glyph (dùng lại engine cây biến từ L1).
- **Chế độ chương**: thường · **gamebook** (hỏi–đáp có gợi ý) · **conceal** (che nước từ ply X) · **practice goal** (mục tiêu parse từ metadata ván: chiếu hết/hòa/đạt ưu thế trong N nước).
- Phân quyền: chủ sở hữu / cộng tác viên (ghi) / thành viên (đọc); hiển thị công khai · không niêm yết · riêng tư.
- Import/export PGN theo chương, clone study, gắn chủ đề (tái dùng `CHESS_TOPICS`).
- **Nhúng vào khóa học**: lesson type mới hoặc TipTap block → giáo viên đưa bài giảng cờ vào chương trình học sẵn có.
- Permission mới: `chess.study.read`, `chess.study.create`, `chess.study.manage`, `chess.study.manage_own`.

## Đợt L3 — Glicko-2 + Ngân hàng Puzzle thích ứng

Bảng mới: `chess_puzzles`, `chess_puzzle_rounds`, `chess_puzzle_sessions`, `chess_ratings`, `chess_rating_history`.

- **Cài đặt Glicko-2** (rating, RD, volatility) từ đặc tả toán học public-domain — không nhìn code lila. Áp dụng đầu tiên cho puzzle.
- **Import chọn lọc dataset CC0**: BullMQ job tải & lọc theo rating 600–1800 + theme giảng dạy → ~50k–200k thế.
- **Taxonomy motif**: mở rộng `packages/shared/src/constants/chess.ts` với trục `CHESS_MOTIFS` mới (~60 motif chiến thuật, nhãn tiếng Việt), giữ nguyên `CHESS_TOPICS` làm trục chương trình học.
- **Chọn puzzle thích ứng**: theo rating ± delta độ khó (5 mức), theo theme hoặc khai cuộc.
- **Replay puzzle đã sai** + đánh dấu "đã sửa được".
- **Dashboard tiến bộ**: hiệu suất theo theme, tự động chỉ điểm yếu/mạnh (xem [04-subsystem-notes.md](./04-subsystem-notes.md) mục 3).
- Puzzle hằng ngày + chuỗi ngày liên tiếp (tái dùng `user_statistics.activityHistory`).
- Permission: `chess.puzzle.read`, `chess.puzzle.manage`.

## Đợt L4 — Chơi trực tuyến người-với-người

Bảng mới: `chess_matches`, `chess_match_moves`, `chess_challenges`, `chess_seeks`.

> ⚠️ Bảng `chess_games` hiện tại là ngân hàng PGN dạy học, không phải ván đấu — ván đấu online dùng `chess_matches`.

- Mở rộng `WsGateway` (không tạo gateway riêng, theo đúng mẫu PR #19 — xem [04-subsystem-notes.md](./04-subsystem-notes.md) mục 8): đi nước, đồng hồ server-authoritative, đầu hàng, xin hòa, xin hoãn, thêm giờ, tái đấu.
- Thách đấu 1-1 + sảnh seek mở.
- Xem trực tiếp + chat ván (mẫu `course_chat`).
- Ván tính rating → cập nhật Glicko-2 (mở rộng L3 sang thể loại thời gian: nhanh/chớp/tiêu chuẩn).
- Chống gian lận cơ bản: chặn truy cập engine trong ván tính rating.
- Permission: `chess.match.play`, `chess.match.watch`.

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
