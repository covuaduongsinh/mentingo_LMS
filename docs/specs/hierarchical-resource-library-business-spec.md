# Hierarchical Resource Library Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (xem `docs/research/learnhouse/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt 8 của roadmap "còn thiếu so với LearnHouse" ban đầu gộp 2 việc độc lập: (A) nâng thư viện tài nguyên phẳng hiện có thành cấu trúc thư mục lồng nhau kiểu Drive, và (B) bàn phân tích cờ cộng tác thời gian thực. Khảo sát trước khi code (2026-07-26) xác nhận **cả 2 phần đều khả thi về mặt hạ tầng** (hạ tầng WebSocket + Redis adapter đã có sẵn cho phần B, thư viện `chess.js` đã là dependency chung cho cả API lẫn web), nhưng **gộp chung vào một đợt là rủi ro không cần thiết**: phần A là một thay đổi schema/CRUD tương đối gọn (thêm 1 bảng + 1 cột FK), còn phần B là một tính năng thời gian thực hoàn toàn mới (gateway room, đồng bộ trạng thái, vai trò host/viewer, bảng phiên mới) không liên quan gì về mặt kỹ thuật đến phần A. Đợt này **chỉ triển khai phần A** — thư viện phân cấp. Bàn phân tích cờ cộng tác chuyển sang đợt riêng (xem Follow-up Work), giữ đúng tinh thần "mỗi đợt một khối thay đổi mạch lạc, dễ review, dễ rollback" đã áp dụng xuyên suốt các đợt trước.

## Who Uses It

- Giáo viên/trợ giảng biên soạn nội dung (đã có quyền quản lý khóa học/bài viết/tin tức — dùng lại đúng quyền hiện có, xem mục "Quyền" bên dưới) — tổ chức tài nguyên (ảnh, video, tài liệu) đã tải lên thành thư mục theo chủ đề/khóa học thay vì một danh sách phẳng duy nhất.

## Feature Functions

### 1. Thư mục lồng nhau

- Mỗi thư mục có: tên, thư mục cha (`parentFolderId`, `null` = thư mục gốc của thư viện), màu (chọn từ bảng màu cố định, giống style tag/label các module khác), ảnh bìa tùy chọn (dùng lại chính cơ chế upload tài nguyên hiện có — ảnh bìa cũng là một `resource`), thứ tự hiển thị thủ công (`displayOrder`, kéo-thả sắp xếp trong cùng cấp).
- Không giới hạn độ sâu lồng nhau về mặt kỹ thuật, nhưng UI chỉ cần hỗ trợ điều hướng từng cấp một (vào thư mục → xem thư mục con + tài nguyên trong đó → quay lại) — không cần cây thư mục đầy đủ hiển thị cùng lúc ở đợt này.
- Một thư mục không thể là cha của chính nó hoặc tổ tiên của chính nó (chặn vòng lặp) — kiểm tra khi đổi `parentFolderId`.
- Xóa thư mục: chỉ cho xóa thư mục **rỗng** (không có thư mục con, không có tài nguyên nào trực tiếp trong đó) — tránh mất dữ liệu ẩn; người dùng phải dọn trống trước khi xóa. Không xóa đệ quy ở đợt này.

### 2. Gán tài nguyên vào thư mục

- Mỗi tài nguyên (`resources`) thêm quan hệ **tùy chọn** với một thư mục (`folderId`, `null` = nằm ở gốc thư viện, đúng hành vi hiện tại — không phá vỡ dữ liệu cũ).
- Di chuyển tài nguyên giữa các thư mục (kể cả ra gốc) — thao tác đổi `folderId`, không tạo bản sao.
- Danh sách tài nguyên hiện có (`GET /assets`) thêm tham số lọc theo `folderId` — mặc định (không truyền) vẫn trả về **toàn bộ** tài nguyên như hành vi cũ để không phá vỡ nơi khác đang gọi API này; muốn xem theo thư mục phải truyền rõ `folderId` (kể cả giá trị đặc biệt cho "gốc").
- Tìm kiếm tài nguyên theo tên vẫn hoạt động xuyên suốt toàn bộ thư viện bất kể đang ở thư mục nào (không giới hạn phạm vi tìm kiếm trong 1 thư mục) — giữ nguyên hành vi tìm kiếm hiện có, chỉ bổ sung hiển thị đường dẫn thư mục chứa kết quả.

### 3. Giao diện dạng lưới kiểu Drive

- Trang thư viện hiện có (`resource-library`) thêm chế độ xem lưới thư mục ở đầu danh sách (thẻ thư mục có màu/ảnh bìa/tên), sau đó là danh sách tài nguyên trong thư mục hiện tại — click vào thư mục để vào bên trong, có breadcrumb đường dẫn để quay lại các cấp cha.
- Nút "Thư mục mới" mở form nhập tên + chọn màu (+ ảnh bìa tùy chọn) ngay trong thư mục đang xem (thư mục mới sẽ là con của thư mục hiện tại).
- Kéo-thả tài nguyên vào thẻ thư mục để di chuyển nhanh (tùy chọn nếu đủ thời gian; nếu không kịp, dùng menu "Di chuyển đến..." chọn thư mục đích qua danh sách thay vì kéo-thả — vẫn đạt được mục tiêu nghiệp vụ).

### 4. Quyền truy cập

- Khảo sát xác nhận thư viện tài nguyên hiện tại **chưa có quyền riêng** (`resource_library.*`) — đang dùng ké quyền quản lý khóa học/bài viết/tin tức (`COURSE_UPDATE`, `ARTICLE_MANAGE`, `NEWS_MANAGE`, v.v., xem `RESOURCE_LIBRARY_PERMISSIONS`). Đợt này **giữ nguyên cách này** cho cả endpoint thư mục mới — không giới thiệu quyền `resource_library.*` riêng để tránh làm phức tạp thêm phạm vi đợt (đây là nợ kỹ thuật đã tồn tại từ trước, không phải lỗi mới; ghi chú vào Follow-up Work nếu cần tách quyền riêng sau này).

## End-User Value

Giáo viên tổ chức được thư viện tài nguyên gọn gàng theo chủ đề/khóa học thay vì cuộn qua một danh sách phẳng dài, dễ tìm lại tài nguyên đã tải lên trước đó.

## How It Works

- **Bảng mới `resource_folders`**: `id`, `tenantId` + RLS (mẫu `chess_exercises`/`0163`), `name` (varchar), `parentFolderId` (uuid, tự tham chiếu `resource_folders.id`, `onDelete: set null` — xóa thư mục cha không xóa con, con nổi lên thành gốc nếu cha bị xóa dù đợt này không cho xóa thư mục không rỗng, vẫn cần ràng buộc FK hợp lý), `color` (varchar, một trong bảng màu cố định), `coverResourceId` (uuid, nullable, tham chiếu `resources.id`, `onDelete: set null`), `displayOrder` (integer).
- **Cột mới trên `resources`**: `folderId` (uuid, nullable, tham chiếu `resource_folders.id`, `onDelete: set null` — xóa thư mục không xóa tài nguyên bên trong, chúng nổi lên gốc thư viện, đây là lưới an toàn bổ sung dù nghiệp vụ chỉ cho xóa thư mục rỗng).
- **Chặn vòng lặp cha-con**: khi tạo/sửa thư mục với `parentFolderId` mới, service duyệt ngược chuỗi tổ tiên của `parentFolderId` để đảm bảo không chứa chính `id` thư mục đang sửa — nếu có, từ chối.
- **Repository/Service/Controller mở rộng** `apps/api/src/resource-library/` hiện có (không tạo module mới) — thêm `ResourceFolderRepository`/method mới trong `ResourceLibraryService`, endpoint `GET/POST/PATCH/DELETE /resource-library/folders`, `PATCH /resource-library/assets/:id/move`.
- **Migration**: bảng mới + cột mới trong cùng 1 file migration (theo mẫu `drizzle-kit generate`) + file RLS riêng theo mẫu các đợt trước.

## Non-Goals (đợt này — chuyển sang Follow-up Work)

- **Bàn phân tích cờ cộng tác thời gian thực** (phần B ban đầu của Đợt 8): hoãn hẳn sang đợt riêng — đây là một tính năng thời gian thực độc lập (WebSocket room, đồng bộ FEN/nước đi, vai trò host/viewer, bảng phiên `chess_analysis_sessions` mới), không liên quan kỹ thuật đến thư viện phân cấp; gộp chung sẽ làm PR quá lớn, khó review.
- **Xóa đệ quy thư mục có nội dung**: chỉ cho xóa thư mục rỗng — tránh mất dữ liệu ẩn ngoài ý muốn.
- **Cây thư mục đầy đủ hiển thị cùng lúc**: chỉ điều hướng từng cấp qua breadcrumb, không cần sidebar cây thư mục.
- **Chia sẻ thư mục** (media share link thu hồi được, theo LearnHouse) — đã có presigned URL cho từng tài nguyên, đủ dùng; chia sẻ theo thư mục để sau nếu có nhu cầu.
- **Quyền `resource_library.*` riêng**: giữ nguyên cách dùng ké quyền hiện có; tách riêng để sau nếu cần kiểm soát chi tiết hơn.

## Key Technical Context

- `apps/api/src/storage/schema/index.ts` — bảng `resourceFolders` mới, cột `folderId` trên `resources`.
- `apps/api/src/resource-library/resource-library.repository.ts`, `resource-library.service.ts`, `resource-library.controller.ts`, `schemas/resource-library.schema.ts` (mở rộng, không tạo module mới).
- Frontend: thư mục chứa trang thư viện tài nguyên hiện có (component lưới + breadcrumb + form tạo thư mục mới).

## Test Evidence

- Migration `0177_add_resource_folders.sql` + `0178_enable_resource_folders_rls.sql` áp dụng thành công vào DB dev (`npx drizzle-kit migrate`).
- `apps/api` `tsc --noEmit` sạch, `eslint` sạch (`--max-warnings=0`) trên toàn bộ file thay đổi (Node 22).
- Test mới `apps/api/src/resource-library/__tests__/resource-library.service.folders.spec.ts` (13 test, Jest Node 22): chặn đặt thư mục làm cha của chính nó, chặn đặt thư mục cha nằm trong chuỗi tổ tiên của chính nó (vòng lặp sâu hơn 1 cấp), cho phép đổi cha hợp lệ, cho phép đưa về gốc thư viện, `NotFoundException` khi thư mục/tài nguyên không tồn tại, chặn xóa thư mục không rỗng, cho xóa thư mục rỗng, di chuyển tài nguyên vào thư mục/về gốc.
- `apps/web` `tsc --noEmit` sạch, `eslint` sạch trên toàn bộ file thay đổi.
- Regenerate `apps/api/src/swagger/api-schema.json` (khởi động tạm API bằng Node 22) xác nhận đủ 9 route `resource-library` (5 route cũ + `GET/POST /resource-library/folders`, `PATCH/DELETE /resource-library/folders/{id}`, `PATCH /resource-library/assets/{id}/move`) rồi `pnpm run generate:client` đồng bộ `apps/web/app/api/generated-api.ts`.
- i18n: đủ 7 locale (en/vi/pl/de/es/lt/cs) cho các khóa `resourceLibrary.error.folder*`, `resourceLibrary.toast.folderDeletedSuccessfully`, và `richText.assetLibrary.folder.*`; validate `JSON.parse` sạch trên cả 7 file.

## Follow-up Work (đợt sau, nếu cần)

- **Bàn phân tích cờ cộng tác thời gian thực** (đợt riêng): phòng phân tích nhiều người, đồng bộ qua `WsGateway` chung hiện có (mẫu room `live-training:${id}` → `chess-analysis:${sessionId}`), vai trò host/viewer (mẫu `LIVE_TRAINING_PARTICIPANT_ROLES`), bảng `chess_analysis_sessions` + `chess_analysis_session_participants` (mẫu 2 bảng rút gọn từ `live_training_sessions`/`live_training_session_participants`, bỏ bảng attendance log chi tiết), kiểm tra hợp lệ nước đi cả 2 phía (client bằng `chess.js` đã dùng trong `ChessBoard.tsx`, server cũng nên validate lại bằng `chess.js` vì đã là dependency của `apps/api`), component mới `Chess/AnalysisRoom/` (không sửa `ChessAnalysis.page.tsx` đơn người chơi hiện có), tái dùng `ChessBoard`/`PgnViewer` từ `board/index.ts` với `fen`/`onMove` được điều khiển bởi state đồng bộ qua socket thay vì state cục bộ.
- Xóa đệ quy thư mục (kèm cảnh báo rõ ràng số lượng tài nguyên bị ảnh hưởng).
- Chia sẻ thư mục qua link công khai có thể thu hồi.
- Quyền `resource_library.read`/`resource_library.manage` riêng, tách khỏi quyền khóa học/bài viết/tin tức.
