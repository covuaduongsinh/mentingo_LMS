# Chess Tournament & Bulk Pairing Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, xem `docs/research/lila/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó. Thuật toán ghép cặp Thụy Sĩ, công thức tiebreak (Buchholz, Sonneborn-Berger) và định dạng TRF là chuẩn công khai của FIDE, không phải sáng tạo riêng của lila.

## Business Overview

Đợt L6 của roadmap "còn thiếu so với lila" (`docs/research/lila/05-roadmap.md`), nối tiếp L5 (lớp học cờ do giáo viên quản lý, PR #25). Đến hết L5, giáo viên quản lý được tài khoản học sinh nhưng học sinh chỉ tự ghép cặp qua sảnh (L4). Đợt này bổ sung khả năng **giáo viên chủ động ghép cặp cho cả lớp cùng lúc** (giá trị dạy học cao nhất) và ba hình thức giải đấu nội bộ: **Thụy Sĩ (Swiss)**, **Arena**, và **đánh đồng loạt (Simul)**.

## Who Uses It

- Giáo viên/HLV có quyền `chess.tournament.create`/`chess.tournament.manage` — ghép cặp hàng loạt, tạo/điều hành giải đấu, tạo simul.
- Học sinh có quyền `chess.tournament.read` — đăng ký tham gia giải, xem bảng xếp hạng, chơi ván được ghép.

## Feature Functions

### 1. Ghép cặp hàng loạt (bulk pairing)

- `POST /chess-tournament/bulk-pairing` — giáo viên chọn một `groupId` và danh sách cặp đấu (thủ công `{whiteUserId, blackUserId}[]`, hoặc `auto: true` để hệ thống tự ghép theo rating hiện tại trong hạng mục thời gian được chọn — sắp theo rating rồi ghép cặp liên tiếp: 1-2, 3-4, 5-6...), cùng thể loại thời gian và có tính rating hay không.
- Hệ thống tạo ngay một `chess_matches` cho mỗi cặp (tái dùng nguyên cơ chế tạo ván của L4 — đồng hồ, validate nước đi, kết thúc ván, cập nhật Glicko-2 — không viết lại), trả về danh sách trận vừa tạo. Không cần giai đoạn "mời/chấp nhận" như sảnh seek — giáo viên ấn ghép là vào ván ngay.
- Đây là "giải đấu" một vòng, không tiebreak, được lưu dưới dạng một `chess_tournaments` với `format = 'bulk_pairing'` để tái dùng chung hạ tầng lưu trữ/truy vấn với Swiss/Arena/Simul, không phải vì nó thực sự là một giải đấu nhiều vòng.

### 2. Giải Thụy Sĩ (Swiss)

- `POST /chess-tournament` (`format: 'swiss'`) — giáo viên tạo giải: tên, thể loại thời gian, số vòng, có tính rating, điều kiện tham gia (`groupId` bắt buộc thuộc nhóm, khoảng rating min/max, số ván tối thiểu đã chơi).
- `POST /chess-tournament/:id/join` — học sinh đủ điều kiện tự đăng ký (hoặc giáo viên thêm thủ công).
- `POST /chess-tournament/:id/start` — giáo viên bắt đầu: khóa danh sách đăng ký, sinh vòng 1.
- `POST /chess-tournament/:id/next-round` — sinh vòng tiếp theo dựa trên kết quả các ván vòng trước (tự đồng bộ kết quả trước khi sinh vòng mới — xem mục "pull-based" trong Key Technical Context). **Thuật toán ghép cặp**: sắp người chơi theo điểm hiện tại (giảm dần); chia đôi danh sách theo điểm, ghép nửa trên với nửa dưới theo thứ tự tương ứng (biến thể đơn giản hóa của thuật toán Thụy Sĩ chuẩn FIDE — xem "Follow-up Work"); tránh ghép lại đúng cặp đã đấu nếu còn lựa chọn khác trong nửa còn lại; số lẻ người chơi → người điểm thấp nhất chưa từng được "bye" nhận **bye** (thắng tự động, không cộng rating). Màu quân: nửa trên luôn cầm trắng — đơn giản hóa, chưa cân bằng theo lịch sử màu đã chơi (xem "Follow-up Work").
- Vào muộn: cho phép tham gia đến hết nửa số vòng đầu (ví dụ giải 7 vòng, vào muộn được đến hết vòng 3) — vào muộn tự nhiên nhận 0 điểm cho các vòng đã bỏ lỡ vì điểm luôn được **tính lại từ đầu** dựa trên số cặp đấu thực tế đã tham gia (xem mục pull-based), không cần cơ chế bù trừ riêng.
- **Tiebreak**: Buchholz (tổng điểm hiện tại của tất cả đối thủ đã gặp) và Sonneborn-Berger (tổng của: điểm đối thủ × 1 nếu thắng, × 0.5 nếu hòa, × 0 nếu thua) — tính lại mỗi lần xem bảng xếp hạng từ toàn bộ lịch sử cặp đấu, không lưu trạng thái tăng dần.
- `GET /chess-tournament/:id/export/trf` — xuất một định dạng văn bản **rút gọn, lấy cảm hứng từ** TRF(x) của FIDE (không phải bản đầy đủ TRF16: mỗi dòng người chơi gồm số thứ tự, tên, rating, điểm, và lịch sử cặp đấu/kết quả từng vòng) — đủ để tham khảo thủ công hoặc xử lý tiếp bằng script ngoài, **không đảm bảo phần mềm ghép cặp chuyên dụng (Swiss-Manager, BBP Pairings...) đọc trực tiếp được** — xem "Follow-up Work".
- **Chưa làm ở đợt này**: sửa cặp đấu thủ công sau khi hệ thống đã sinh vòng — xem "Follow-up Work".

### 3. Giải Arena

- `POST /chess-tournament` (`format: 'arena'`) — tên, thể loại thời gian, thời lượng (phút), có tính rating, điều kiện tham gia.
- Người chơi vào giải bất kỳ lúc nào trong thời lượng giải; hệ thống ghép cặp liên tục: khi một người sẵn sàng (vừa đăng ký hoặc vừa xong ván trước), tìm người khác đang sẵn sàng gần rating nhất chưa gặp gần đây nhất để ghép — kích hoạt qua endpoint `POST /chess-tournament/:id/arena/pair-next` (gọi mỗi khi có người sẵn sàng: lúc đăng ký và lúc một ván trong giải kết thúc; **không phải vòng lặp nền chạy liên tục 24/7** như lila — xem "Follow-up Work").
- Điểm: thắng +2, hòa +1, thua +0 (đơn giản hóa — bỏ qua "streak"/"berserk" của lila).
- `GET /chess-tournament/:id/standings` — bảng xếp hạng thời gian thực (điểm, số ván), giáo viên/học sinh xem trong lúc giải đang diễn ra.
- Giải tự đóng khi hết thời lượng (`endsAt` tính từ lúc `start`); sau đó không ghép cặp mới, ván đang dở vẫn được chơi tiếp bình thường.

### 4. Đánh đồng loạt (Simul)

- `POST /chess-tournament` (`format: 'simul'`) — HLV là "host" duy nhất, chọn `groupId`/danh sách học sinh mời tham gia (giới hạn tối đa, ví dụ 20).
- `POST /chess-tournament/:id/join` — học sinh xác nhận tham gia trước giờ bắt đầu.
- `POST /chess-tournament/:id/start` — tạo **cùng lúc một ván riêng giữa host và mỗi người tham gia** (tái dùng bulk pairing ở mục 1, với `whiteUserId`/`blackUserId` cố định một bên là host tùy màu quân host chọn cho toàn bộ simul — thông lệ simul: host đi trước tất cả các bàn).
- Host thấy danh sách toàn bộ ván đang diễn ra của mình (tái dùng `GET /chess/matches/:id` cho từng ván, giao diện xếp nhiều bàn cạnh nhau).
- Simul kết thúc khi mọi ván đã kết thúc; kết quả tổng kết: host thắng/hòa/thua bao nhiêu bàn.

## End-User Value

Giáo viên có thể tổ chức cả buổi học cờ có cấu trúc: ghép cặp cả lớp đấu tập trong vài giây thay vì để học sinh tự tìm đối thủ qua sảnh, tổ chức giải nội bộ theo hệ Thụy Sĩ đúng chuẩn thi đấu (học sinh làm quen với giải đấu thật trước khi thi đấu chính thức bên ngoài), giải Arena tạo không khí thi đua nhanh trong một khung giờ cố định, và Simul cho HLV cơ hội đấu giao lưu với nhiều học sinh cùng lúc — hình thức rất phổ biến ở CLB cờ ngoài đời.

## How It Works

Giáo viên vào trang quản lý giải đấu của một lớp, chọn hình thức: ghép cặp nhanh (chọn cặp thủ công hoặc để hệ thống tự ghép theo rating, ấn nút là vào ván ngay), tạo giải Thụy Sĩ (đặt số vòng, học sinh đăng ký, giáo viên ấn "vòng tiếp theo" sau khi các ván vòng trước xong), tạo giải Arena (đặt thời lượng, học sinh vào bất kỳ lúc nào trong khung giờ), hoặc tạo buổi đánh đồng loạt (mời danh sách học sinh, ấn bắt đầu là toàn bộ bàn được tạo cùng lúc). Trong mọi trường hợp, ván đấu thực tế dùng đúng bàn cờ/đồng hồ/luồng WebSocket đã có từ L4 — phần mới chỉ là lớp "ghép cặp" quyết định ai đấu ai và khi nào.

## Key Technical Context

- Bảng mới: `chessTournaments` (name, format: bulk_pairing/swiss/arena/simul, groupId, timeControlId, rated, roundCount nullable, durationMinutes nullable, hostUserId nullable — dùng cho simul, status: registration/active/finished, startsAt, endsAt nullable, minRating/maxRating nullable, minGamesPlayed nullable), `chessTournamentPlayers` (tournamentId, userId, joinedAt, withdrawnAt nullable — **không lưu score/tiebreak**, tính lại từ `chessTournamentPairings` mỗi lần cần), `chessTournamentPairings` (tournamentId, round, whiteUserId, blackUserId nullable — null nghĩa là bye, matchId nullable — null trước khi ván thật được tạo hoặc khi là bye, result nullable — đồng bộ từ `chess_matches` qua bước pull ở trên). Migration theo mẫu "1 migration tạo bảng + 1 migration RLS riêng".
- **Tạo ván dùng lại nguyên `ChessMatchService`/bảng `chess_matches` của L4** — module mới `chess-tournament` gọi một hàm dùng chung để tạo hàng loạt ván cùng lúc từ danh sách cặp, không viết lại logic đồng hồ/validate nước đi/kết thúc ván.
- **Cập nhật điểm giải đấu là pull-based, không phải push-hook**: `ChessMatchService.endMatch` (L4) **không sửa gì** — không thêm callback/token injection nào gọi ngược vào module mới, vì `chess-tournament` đã cần import `ChessModule` một chiều để tạo ván (mục 1), nên nếu `ChessModule` cũng phải import ngược lại `chess-tournament` để gọi hook, hai file `*.module.ts` sẽ `require()` lẫn nhau — đúng hình dạng lỗi vòng lặp cấp file đã gặp ở L3. Thay vào đó, `ChessTournamentService` tự đồng bộ kết quả theo kiểu **pull**: mỗi khi cần xem bảng xếp hạng, sinh vòng tiếp theo, hoặc xuất TRF, chạy trước một bước `syncPairingResults(tournamentId)` — truy vấn thẳng bảng `chess_matches` (bảng schema thuần, không phải service) cho các `chessTournamentPairings.matchId` chưa có `result`, ván nào đã `status = 'finished'` thì ghi `result` vào dòng pairing tương ứng. Điểm/tiebreak của từng người chơi được **tính lại từ đầu mỗi lần cần** (không lưu trạng thái tăng dần), dựa trên toàn bộ `chessTournamentPairings.result` đã đồng bộ — đơn giản, luôn đúng, không có nguy cơ lệch do hook không được gọi.
- **Thuật toán Thụy Sĩ**: biến thể đơn giản hóa (chia đôi theo điểm, ghép nửa trên với nửa dưới), không phải cài đặt đầy đủ chuẩn FIDE Dutch System (quá phức tạp cho quy mô lớp học/CLB — xem "Follow-up Work"). Tiebreak Buchholz/Sonneborn-Berger tính đúng công thức chuẩn công khai.
- **Xuất TRF**: định dạng văn bản rút gọn, đủ trường cơ bản (số thứ tự, tên, điểm, lịch sử cặp đấu từng vòng) để phần mềm ghép cặp ngoài đọc được — không xuất đủ TRF16 đầy đủ.
- Permission mới: `chess.tournament.read`, `chess.tournament.create`, `chess.tournament.manage`.

## Test Evidence

- Unit test service: ghép cặp tự động theo rating đúng thứ tự, sinh vòng Thụy Sĩ đúng (chia điểm, tránh ghép lại, xử lý số lẻ bằng bye), tính Buchholz/Sonneborn-Berger đúng trên một bộ kết quả mẫu tính tay trước, ghép cặp Arena không ghép lại người vừa gặp gần nhất khi còn lựa chọn khác, tạo simul đúng số ván bằng số người tham gia với đúng một bên cố định là host, cập nhật điểm giải đấu đúng khi ván thuộc giải kết thúc (thắng/hòa/thua), bỏ qua cập nhật nếu ván không thuộc giải nào.
- `pnpm lint-tsc-api`/`lint-tsc-web` sạch, `pnpm test:api`/`test:web` xanh.

## Follow-up Work (explicitly not done in this pass)

- **Thuật toán Thụy Sĩ chuẩn FIDE đầy đủ** (Dutch System với mọi ràng buộc: cân bằng màu tuyệt đối, giới hạn chênh lệch điểm ghép cặp, xử lý mọi trường hợp biên) — bản rút gọn hiện tại đủ dùng cho lớp học/CLB quy mô nhỏ (dưới ~40 người), không đạt chuẩn thi đấu FIDE chính thức; cân nhắc tích hợp thư viện ghép cặp Thụy Sĩ chuyên dụng nếu sau này cần tổ chức giải FIDE-rated thật.
- **Arena ghép cặp nền liên tục 24/7**: đợt này ghép cặp được kích hoạt bởi sự kiện (đăng ký/ván kết thúc), không phải một tiến trình nền quét liên tục như lila — đủ dùng cho khung giờ giải ngắn có giáo viên giám sát; cân nhắc thêm cron quét định kỳ nếu cần.
- **Giải Arena có "streak"/"berserk"** (nhân điểm theo chuỗi thắng, đổi nửa thời gian lấy điểm gấp đôi) — đơn giản hóa thành thắng/hòa/thua cố định điểm.
- **Vào muộn Swiss tính bù trực tiếp vào tiebreak một cách chính xác theo mọi biến thể FIDE** — đợt này chỉ cho vào muộn nhận 0 điểm vòng đã bỏ lỡ, không mô phỏng đầy đủ quy tắc "acceleration"/"forfeit tiebreak" phức tạp hơn.
- **Cân bằng màu quân theo lịch sử** trong ghép cặp Thụy Sĩ — đợt này nửa trên luôn cầm trắng, không theo dõi/cân bằng lịch sử màu từng người đã chơi.
- **Sửa cặp đấu thủ công** sau khi một vòng đã được sinh — giáo viên chỉ có thể xem, chưa đổi được; nếu ghép sai cần huỷ và tạo lại giải.
- **Xuất TRF đúng chuẩn FIDE TRF16** để nạp thẳng vào phần mềm ghép cặp chuyên dụng — bản xuất hiện tại chỉ là văn bản rút gọn tham khảo.
