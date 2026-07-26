# Chính sách Clean-Room khi tham khảo lila (lichess.org)

## Vì sao cần chính sách này

Repo `D:\code\lila` (dùng làm tài liệu tham khảo khi nghiên cứu tính năng cờ vua cho mentingo) được cấp phép **AGPL-3.0-or-later** — xác nhận trực tiếp: `D:\code\lila\LICENSE` chứa nguyên văn GNU Affero General Public License v3, và `D:\code\lila\COPYING.md` ghi rõ _"Lila is free software; you can redistribute and/or modify it under the terms of the GNU Affero General Public License ... either version 3 of the License, or (at your option) any later version."_ Copyright (c) 2012-2026 the lila authors.

**Đây KHÔNG phải MIT** — yêu cầu ban đầu của đợt khảo sát này giả định lila là MIT, giả định đó sai và đã được đính chính trước khi bắt đầu bất kỳ dòng code nào.

mentingo_LMS là **MIT** và vận hành như một dịch vụ SaaS nhiều tenant (`lms.covuahocduong.com` và các tenant khác). Đây chính là kịch bản AGPL §13 nhắm tới: **"Remote Network Interaction"** — nếu một bản sửa đổi của phần mềm AGPL chạy trên server và người dùng tương tác với nó qua mạng, chủ sở hữu server phải cung cấp source code đầy đủ của bản sửa đổi đó cho những người dùng ấy, kể cả khi không có "phân phối" (distribution) truyền thống nào xảy ra.

Nói cách khác: nếu mentingo_LMS **copy dù chỉ một hàm, một khối SQL migration, hay một đoạn component TypeScript/Scala từ lila**, thì toàn bộ mã nguồn của lms.covuahocduong.com — bao gồm module cờ vua, dữ liệu bài tập độc quyền, và mọi thứ khác trong cùng codebase — về mặt pháp lý phải được công khai cho bất kỳ ai truy cập trang web. Điều này mâu thuẫn trực tiếp với mô hình kinh doanh hiện tại.

Đây là **lần thứ hai** repo áp dụng chính sách clean-room này — lần đầu là với LearnHouse (`docs/research/learnhouse/00-cleanroom-policy.md`, cũng AGPL-3.0). Toàn bộ nguyên tắc dưới đây kế thừa nguyên vẹn từ tài liệu đó, chỉ đổi hệ tham chiếu.

## Ghi chú license các thành phần con của lila

Khác với LearnHouse (chỉ có 1 license AGPL cho code + 1 số ngoại lệ font/asset), lila có **nhiều mức license lồng nhau cho asset**, ghi trong `COPYING.md`:

| Thành phần                                                       | License                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| Code (toàn bộ `app/`, `modules/`, `ui/`)                         | AGPL-3.0-or-later                                       |
| `public/piece/mono`, `public/images/learn/pieces`                | **GPLv2+** (nặng hơn AGPL ở một số khía cạnh phân phối) |
| `public/images/board`, `public/images/staunton/piece/CubesAndPi` | AGPLv3+                                                 |
| `public/piece/horsey`, `public/images/emoji/horsey.webp`         | **CC BY-NC-SA 4.0 — cấm dùng thương mại**               |
| Font lichess (`public/font/lichess.*`)                           | Hỗn hợp OFL/MIT/CC BY-3.0/AGPLv3+ tùy file              |
| Noto Sans, Roboto                                                | Apache 2.0                                              |
| Flags (`public/flags/`), Staunton pieces, trophy images          | MIT                                                     |

→ Không một asset nào (hình ảnh quân cờ, bàn cờ, icon) được sao chép trực tiếp vào mentingo dù license nhìn "có vẻ" MIT ở một vài file lẻ — rủi ro nhầm lẫn giữa các mức license quá cao để chấp nhận. mentingo tiếp tục dùng bộ quân/bàn cờ tự vẽ hoặc nguồn MIT/CC0 riêng biệt đã xác minh.

## Không có vùng "Enterprise Edition" tách biệt

Khác với LearnHouse (có `apps/web/ee/`, `apps/api/ee/` theo Enterprise License riêng), lila là dự án phi lợi nhuận **hoàn toàn mã nguồn mở, không có phiên bản Enterprise**. Toàn bộ `modules/` và `ui/` đều dưới AGPL-3.0. Vì vậy không có "vùng cấm tuyệt đối" kiểu thư mục `ee/` ở đây — nhưng điều đó **không làm giảm** mức độ nghiêm ngặt của việc không-copy-code, vì AGPL áp dụng cho toàn bộ codebase như nhau.

## Quy tắc làm việc (áp dụng cho mọi người tham gia, mọi đợt phát triển)

1. **Không copy-paste** code, comment, docstring, hay chuỗi thông báo lỗi/UI từ lila vào bất kỳ file nào của mentingo.
2. **Không sao chép cấu trúc bảng/migration SQL/BSON schema** dù chỉ để "tham khảo cú pháp" — Drizzle Kit sinh migration từ schema TypeScript của mentingo (PostgreSQL), lila dùng MongoDB (BSON handlers) — hai mô hình dữ liệu khác hẳn nên không có lý do kỹ thuật nào để nhìn code lila khi thiết kế schema PostgreSQL.
3. **Không đặt tên bảng/cột/enum giống hệt** khi mentingo có quy ước khác đủ tốt để dùng. Thuật ngữ cờ vua phổ thông (`fen`, `pgn`, `uci`, `rating`, `glicko`, `theme`, `difficulty`, tên các motif chiến thuật như `fork`/`pin`/`skewer`/`zugzwang`) không phải đối tượng bảo hộ và dùng bình thường — đây là từ vựng chuẩn ngành cờ vua quốc tế, không phải sáng tạo của lichess.
4. **Được phép**: mô tả hành vi nghiệp vụ, luồng dữ liệu, quy tắc xử lý bằng lời văn tiếng Việt trong tài liệu (`docs/research/lila/`, `docs/specs/`). Ý tưởng, khái niệm, và "cái gì hệ thống làm" không được luật bản quyền bảo hộ — chỉ "cách diễn đạt cụ thể" (mã nguồn cụ thể) mới được bảo hộ (idea–expression dichotomy).
5. **Được phép giữ nguyên**: hình dạng REST endpoint thông thường (`GET/POST/PATCH/DELETE` theo REST convention chuẩn), thuật ngữ cờ vua phổ thông, và **thuật toán Glicko-2** — công bố công khai bởi Mark Glickman (Boston University) dưới dạng đặc tả toán học tự do (public domain), không phải sáng tác của lichess. Cài đặt lại Glicko-2 từ đặc tả toán học gốc, không nhìn implementation Scala của lila.
6. **Được phép dùng trực tiếp**: dữ liệu puzzle Lichess phát hành theo **CC0** (public domain, khác với code AGPL) — có thể tải và nhập vào DB mentingo mà không vướng nghĩa vụ AGPL, vì CC0 là license riêng cho dataset, tách biệt hoàn toàn khỏi license của codebase lila.
7. **Ranh giới thực thi**: tài liệu đặc tả (`docs/specs/*.md`) là điểm cắt. Người/agent viết code triển khai tính năng làm việc **từ file đặc tả**, không mở file nguồn lila song song trong lúc viết code. Việc khảo sát (đọc lila, viết đặc tả) và việc lập trình (đọc đặc tả, viết code mentingo) là hai giai đoạn tách biệt, có thể do hai phiên làm việc khác nhau thực hiện.
8. **Không đưa file lila vào repo mentingo** dưới bất kỳ hình thức nào — không copy nguyên file vào `docs/`, không symlink, không submodule.
9. Mỗi file đặc tả tính năng port từ lila phải ghi chú ở đầu: _"Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0. Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó."_

## Ràng buộc engine bổ sung (riêng cho lila, không có ở LearnHouse)

lila dùng **Stockfish** (GPL-3.0) làm engine phân tích chính qua hạ tầng `fishnet` (cụm phân tích phân tán). mentingo có chính sách **MIT-only** cho engine (`docs/specs/chess-engine-arasan-business-spec.md`): chỉ dùng **Arasan (MIT)** hoặc builtin minimax tự viết. Mọi đặc tả port tính năng phân tích từ lila (Insight/Tutor ở Đợt L8, đánh giá độ chính xác ván đấu...) phải thiết kế lại quanh Arasan, **tuyệt đối không đề xuất tích hợp Stockfish hay fishnet**. Tương tự, thư viện bàn cờ phía client `chessground` của lila là **GPL-3.0** — mentingo tiếp tục dùng `chess.js` (MIT, đã là dependency) và component `ChessBoard.tsx` tự viết, không dùng chessground.

## Vì sao cách tiếp cận này an toàn

Luật bản quyền (và do đó AGPL, vốn là một giấy phép bản quyền) chỉ bảo hộ **sự diễn đạt** (expression) — tức là mã nguồn cụ thể — chứ không bảo hộ **ý tưởng, thuật toán, hay chức năng** (idea/functionality) đằng sau nó. Đây là nguyên tắc idea–expression dichotomy, nền tảng của kỹ thuật "clean-room reverse engineering" đã được áp dụng hợp pháp trong ngành phần mềm hàng chục năm.

Vì mentingo triển khai lại bằng stack hoàn toàn khác (NestJS/TypeBox/Drizzle/PostgreSQL/Remix thay vì Scala/Play Framework/MongoDB/scalatags), việc trùng lặp code ở cấp câu lệnh gần như không thể xảy ra một cách vô tình — miễn là người viết code không nhìn trực tiếp vào lila trong lúc gõ.
