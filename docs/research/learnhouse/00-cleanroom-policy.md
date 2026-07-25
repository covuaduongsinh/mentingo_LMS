# Chính sách Clean-Room khi tham khảo LearnHouse

## Vì sao cần chính sách này

Repo `D:\code\learnhouse` (dùng làm tài liệu tham khảo khi nghiên cứu tính năng cho mentingo) được cấp phép **AGPL-3.0** ([LICENSE](../../../../learnhouse/LICENSE) — xác nhận: 661 dòng, văn bản GNU AGPL v3 nguyên gốc, không có Commons Clause hay điều khoản nới lỏng nào). README của LearnHouse xác nhận: _"AGPL-3.0 — Enterprise features are available under a separate Enterprise License."_

mentingo_LMS là **MIT** và vận hành như một dịch vụ SaaS nhiều tenant (`lms.covuahocduong.com` và các tenant khác). Đây chính là kịch bản AGPL §13 nhắm tới: **"Remote Network Interaction"** — nếu một bản sửa đổi của phần mềm AGPL chạy trên server và người dùng tương tác với nó qua mạng, chủ sở hữu server phải cung cấp source code đầy đủ của bản sửa đổi đó cho những người dùng ấy, kể cả khi không có "phân phối" (distribution) truyền thống nào xảy ra.

Nói cách khác: nếu mentingo_LMS **copy dù chỉ một hàm, một khối SQL migration, hay một đoạn component React từ LearnHouse**, thì toàn bộ mã nguồn của lms.covuahocduong.com — bao gồm module cờ vua, dữ liệu bài tập độc quyền, và mọi thứ khác trong cùng codebase — về mặt pháp lý phải được công khai cho bất kỳ ai truy cập trang web. Điều này mâu thuẫn trực tiếp với mô hình kinh doanh hiện tại.

Ghi chú phụ: `apps/cli/package.json` của LearnHouse khai `"license": "GPL-3.0"` (không khớp AGPL gốc — có thể là lỗi metadata, không đổi kết luận). Thư mục `docs/` của LearnHouse là MIT (chỉ áp dụng cho trang tài liệu, không áp dụng cho `apps/api`, `apps/web`, `apps/collab`, `apps/cli`).

## Vùng cấm tuyệt đối: Enterprise Edition

`apps/web/ee/` trong LearnHouse (SCORM runtime, resolve multi-tenancy) nằm dưới **Enterprise License riêng** — không phải AGPL, không phải mã nguồn mở theo bất kỳ nghĩa nào. `apps/api/ee/` bị xóa khỏi bản build public (`Dockerfile` dòng 98-99 xóa khi `LEARNHOUSE_PUBLIC=true`) và không có trong checkout đang khảo sát.

**Quy tắc: không đọc, không tham khảo, không lấy ý tưởng từ bất kỳ file nào trong `apps/web/ee/` hoặc `apps/api/ee/`.** mentingo đã có SCORM và multi-tenancy (qua Postgres RLS) tốt hơn nên không có nhu cầu thực tế phải chạm vào các thư mục này.

## Quy tắc làm việc (áp dụng cho mọi người tham gia, mọi đợt phát triển)

1. **Không copy-paste** code, comment, docstring, hay chuỗi thông báo lỗi/UI từ LearnHouse vào bất kỳ file nào của mentingo.
2. **Không sao chép cấu trúc bảng/migration SQL** dù chỉ để "tham khảo cú pháp" — Drizzle Kit sinh migration từ schema TypeScript của mentingo, không có lý do gì để nhìn SQL của LearnHouse.
3. **Không đặt tên bảng/cột/enum giống hệt** khi mentingo có quy ước khác đủ tốt để dùng. Tên chung của ngành phần mềm (`due_date`, `grade`, `status`, `email`) không phải đối tượng bảo hộ và dùng bình thường.
4. **Được phép**: mô tả hành vi nghiệp vụ, luồng dữ liệu, quy tắc xử lý bằng lời văn tiếng Việt trong tài liệu (`docs/research/learnhouse/`, `docs/specs/`). Ý tưởng, khái niệm, và "cái gì hệ thống làm" không được luật bản quyền bảo hộ — chỉ "cách diễn đạt cụ thể" (mã nguồn cụ thể) mới được bảo hộ.
5. **Được phép giữ nguyên**: hình dạng REST endpoint thông thường (`GET/POST/PATCH/DELETE` theo REST convention chuẩn), và các giá trị enum mang tính chuẩn ngành (ví dụ thang điểm `pass_fail`, `percentage` — đây là thuật ngữ giáo dục phổ thông, không phải sáng tạo của LearnHouse).
6. **Ranh giới thực thi**: tài liệu đặc tả (`docs/specs/*.md`) là điểm cắt. Người/agent viết code triển khai tính năng làm việc **từ file đặc tả**, không mở file nguồn LearnHouse song song trong lúc viết code. Việc khảo sát (đọc LearnHouse, viết đặc tả) và việc lập trình (đọc đặc tả, viết code mentingo) là hai giai đoạn tách biệt, có thể do hai phiên làm việc khác nhau thực hiện.
7. **Không đưa file LearnHouse vào repo mentingo** dưới bất kỳ hình thức nào — không copy nguyên file vào `docs/`, không symlink, không submodule.
8. Mỗi file đặc tả tính năng port từ LearnHouse phải ghi chú ở đầu: _"Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0. Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó."_

## Vì sao cách tiếp cận này an toàn

Luật bản quyền (và do đó AGPL, vốn là một giấy phép bản quyền) chỉ bảo hộ **sự diễn đạt** (expression) — tức là mã nguồn cụ thể — chứ không bảo hộ **ý tưởng, thuật toán, hay chức năng** (idea/functionality) đằng sau nó. Đây là nguyên tắc idea–expression dichotomy, nền tảng của kỹ thuật "clean-room reverse engineering" đã được áp dụng hợp pháp trong ngành phần mềm hàng chục năm (ví dụ: Compaq viết lại BIOS IBM PC bằng đặc tả chức năng do đội kỹ sư riêng biệt soạn).

Vì mentingo triển khai lại bằng stack hoàn toàn khác (NestJS/Drizzle/Remix/TipTap thay vì FastAPI/SQLModel/Next.js), việc trùng lặp code ở cấp câu lệnh gần như không thể xảy ra một cách vô tình — miễn là người viết code không nhìn trực tiếp vào LearnHouse trong lúc gõ.
