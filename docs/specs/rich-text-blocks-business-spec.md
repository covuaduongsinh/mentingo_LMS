# Rich Text Blocks & Slash Commands Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0. Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó. Toàn bộ tên bảng/biến/component, cấu trúc dữ liệu, và cách hiện thực dưới đây là thiết kế riêng của mentingo, dùng stack sẵn có (TipTap 2, NestJS/TypeBox, Remix) và quy ước đặt tên hiện tại của repo — không tra cứu lại hệ thống tham khảo trong lúc viết spec này hay khi lập trình từ spec này.

## Business Overview

Trình soạn nội dung (rich text editor) của mentingo hiện chỉ hỗ trợ văn bản định dạng cơ bản, bảng, danh sách công việc, và các khối nhúng tài nguyên media (ảnh/video/PDF/presentation/file tải về). Tác giả khóa học (content creator/trainer/admin) không có cách nào nhanh để chèn các khối trình bày thường gặp trong tài liệu giáo dục hiện đại — hộp lưu ý, thẻ ghi nhớ lật hai mặt, huy hiệu, nút kêu gọi hành động, thẻ xem trước liên kết — và phải thao tác hoàn toàn bằng chuột qua toolbar cố định, không có cách gõ nhanh để chèn khối mà không rời tay khỏi bàn phím.

Tính năng này thêm 5 loại khối nội dung mới, một menu gõ `/` (slash command) để chèn nhanh bất kỳ khối nào (kể cả các khối đã có từ trước), tay cầm kéo-thả để sắp xếp lại khối, và 2 nút định dạng còn thiếu trên toolbar (gạch chân, căn lề). Nội dung soạn ra vẫn được lưu trong cùng một trường `description` dạng HTML/JSON như hiện tại — không đổi cách lưu trữ, không đổi API của lesson/article/news/QA.

## Who Uses It

- Content creator / trainer / admin soạn nội dung bài học (`content` lesson), bài viết (Articles), bản tin (News), mục hỏi-đáp (QA) — bất kỳ nơi nào đang dùng `ContentEditor` (biến thể `variant: "content"` của component `Editor`).
- Học viên và người đọc công khai xem lại nội dung đã soạn qua `Viever` (biến thể viewer tương ứng) — chỉ đọc, không tương tác chỉnh sửa, nhưng khối Flipcard vẫn cho phép click để lật ở chế độ xem.

## Feature Functions

### 1. Menu lệnh gõ `/` (Slash Command Menu)

- Gõ `/` tại một dòng trống (hoặc ngay sau khoảng trắng) trong vùng soạn thảo mở một menu nổi ngay dưới vị trí con trỏ, liệt kê các lệnh chèn khối, nhóm theo 4 nhóm: **Văn bản** (Tiêu đề 1–3, Danh sách chấm, Danh sách số, Danh sách công việc), **Media** (Ảnh, Video, Tài liệu PDF, Presentation, File tải về — các lệnh này mở lại đúng luồng upload/nhúng hiện có của từng loại, không tạo luồng mới), **Khối tương tác/trang trí** (Callout, Flipcard, Badge, Button, Web Preview), **Bảng** (Chèn bảng 3×3 — chỉ hiện khi editor đang ở biến thể `content` có bật bảng).
- Gõ tiếp sau `/` lọc danh sách theo tiêu đề lệnh và từ khóa liên quan (không phân biệt hoa/thường, so khớp chuỗi con — không cần fuzzy-match nâng cao).
- Điều hướng bằng phím **mũi tên lên/xuống** để đổi lựa chọn (có vòng lặp: ở cuối danh sách nhấn xuống quay về đầu), phím **Enter** hoặc click chuột để chọn lệnh và chèn khối tương ứng tại đúng vị trí con trỏ, phím **Escape** đóng menu mà không thay đổi gì.
- Khi không có lệnh nào khớp từ khóa đang gõ, menu hiển thị một dòng "Không tìm thấy" và không có mục nào được chọn (Enter không làm gì).
- Chọn một lệnh sẽ **xóa chuỗi `/từ-khóa` vừa gõ** trước khi chèn khối — người dùng không thấy dấu vết của thao tác gõ lệnh còn sót lại trong nội dung.
- Menu tự đóng khi: đã chọn một lệnh, nhấn Escape, click ra ngoài menu, hoặc con trỏ rời khỏi vị trí kích hoạt (ví dụ người dùng dùng chuột click sang chỗ khác trong lúc menu đang mở).
- Danh sách lệnh và nhóm lệnh nêu trên là **một registry dữ liệu duy nhất dùng chung** — cùng một nguồn dữ liệu này cũng dùng để hiển thị các nút mới trên toolbar (mục 3 dưới đây), tránh khai báo hai lần một danh sách khối trùng nhau ở hai nơi.
- Slash command chỉ hoạt động trong biến thể `content` của editor (nơi đã có sẵn media + bảng); biến thể `base` (dùng ở nơi cần nội dung tối giản hơn) không có `/` để tránh chèn nhầm khối không được hỗ trợ ở đó.

### 2. Năm khối nội dung mới

Mỗi khối dưới đây có **hai chế độ hiển thị tách biệt**: chế độ soạn thảo (cho phép sửa nội dung/thuộc tính, có nút xóa khối) và chế độ chỉ đọc (hiển thị đẹp, không có điều khiển chỉnh sửa). Nội dung khối được lưu ngay trong HTML của trường `description` bằng các thuộc tính `data-*` — không cần bảng dữ liệu mới, không cần endpoint API mới (trừ Web Preview, xem mục 4).

**a) Callout (hộp chú thích)**

- 5 biến thể màu sắc cố định, chọn lúc chèn hoặc đổi sau khi đã chèn: **Thông tin** (xanh dương), **Cảnh báo** (vàng/cam), **Mẹo** (tím), **Thành công** (xanh lá), **Lỗi/Nguy hiểm** (đỏ). Mỗi biến thể có icon riêng phù hợp ngữ nghĩa và một dải màu nền + viền + icon nhất quán với bảng màu Tailwind hiện có của hệ thống (không tự chế màu mới).
- Nội dung bên trong callout là **văn bản định dạng đầy đủ** (có thể chứa đoạn văn, danh sách, in đậm/nghiêng, liên kết) — không phải một ô nhập liệu đơn giản. Người dùng gõ trực tiếp vào bên trong khối như một vùng soạn thảo con.
- Ở chế độ soạn thảo, góc trên có: dropdown đổi biến thể màu, và nút xóa cả khối (giữ nguyên nội dung con — khi xóa, khối biến mất kèm nội dung bên trong; không có cách "bung nội dung ra ngoài" khối).
- Chèn qua slash command hoặc qua toolbar mở dropdown chọn biến thể ngay lúc chèn (mặc định biến thể "Thông tin" nếu chèn nhanh không chọn).

**b) Flipcard (thẻ lật hai mặt)**

- Có hai mặt: **mặt trước** (câu hỏi/thuật ngữ — văn bản thuần, một dòng, không định dạng phức tạp) và **mặt sau** (câu trả lời/định nghĩa — văn bản thuần, cho phép nhiều dòng).
- Ở chế độ soạn thảo: hai ô nhập liệu riêng biệt hiển thị đồng thời (mặt trước phía trên, mặt sau phía dưới, có nhãn rõ ràng "Mặt trước"/"Mặt sau"), không có hiệu ứng lật (để tác giả thấy và sửa cả hai mặt cùng lúc). Có tùy chọn màu nền thẻ (chọn từ bảng màu có sẵn) và kích cỡ (nhỏ/vừa/lớn — ảnh hưởng chiều cao hiển thị).
- Ở chế độ chỉ đọc: chỉ hiển thị mặt trước ban đầu; **click vào thẻ lật sang mặt sau** bằng hiệu ứng xoay 3D mượt (CSS transform, không cần thư viện animation ngoài); click lần nữa lật trở lại mặt trước. Trạng thái lật là state cục bộ của component, không lưu lại, không ảnh hưởng tới trạng thái người dùng khác hay lần tải trang sau.
- Nút xóa khối ở chế độ soạn thảo.

**c) Badge (huy hiệu/nhãn)**

- Một node **inline** (nằm lẫn trong dòng văn bản, không tự xuống dòng), hiển thị như một nhãn nhỏ bo tròn có màu nền + chữ, ví dụ dùng để đánh dấu "Mới", "Quan trọng", "Nâng cao" ngay giữa câu.
- Thuộc tính: **nội dung chữ** (văn bản ngắn, giới hạn hợp lý ví dụ 30 ký tự để không phá layout dòng) và **màu** (chọn từ một bảng màu cố định, tối thiểu 6 lựa chọn: xám/xanh dương/xanh lá/vàng/đỏ/tím).
- Chèn qua slash command mở một ô nhập nhanh (nhập chữ + chọn màu) ngay tại vị trí con trỏ; sau khi chèn có thể click vào badge để sửa lại chữ/màu ở chế độ soạn thảo.
- Ở chế độ chỉ đọc: hiển thị tĩnh, không click được.

**d) Button (nút kêu gọi hành động)**

- Một node **block** (chiếm cả dòng, căn trái theo mặc định) hiển thị như một nút bấm có nhãn và dẫn tới một URL khi click.
- Thuộc tính: **nhãn nút** (văn bản ngắn), **URL đích**, **mở tab mới hay không** (checkbox, mặc định bật — nhất quán với hành vi liên kết thường trong editor hiện tại là `target="_blank"`).
- Tái dùng đúng component `Button` sẵn có của hệ thống (`~/components/ui/button`) để nút trong nội dung bài học trông nhất quán với toàn bộ giao diện, không tự vẽ nút riêng.
- Ở chế độ soạn thảo: click vào nút mở một popover nhỏ để sửa nhãn/URL/tùy chọn tab mới, cộng nút xóa khối. Ở chế độ chỉ đọc: click nút thực sự điều hướng (mở URL).
- URL đích được validate là một chuỗi URL hợp lệ (http/https) trước khi lưu; để trống thì nút hiển thị nhưng không dẫn đi đâu (disabled về mặt thị giác, không phải lỗi chặn lưu bài).

**e) Web Preview (thẻ xem trước liên kết)**

- Người dùng dán/nhập một URL bất kỳ; khối tự động gọi endpoint xem trước (mục 4) để lấy tiêu đề, mô tả, ảnh đại diện, và tên miền của trang đích, rồi hiển thị như một "thẻ card" đẹp (ảnh bên trái/trên, tiêu đề in đậm, mô tả rút gọn 2 dòng, tên miền nhỏ phía dưới) thay vì một đường link trần.
- Trong lúc đang lấy dữ liệu xem trước: hiển thị trạng thái khung xương (skeleton) ngắn. Nếu lấy thất bại (endpoint lỗi, trang không có metadata, timeout): khối **suy biến (fallback) thành một thẻ tối giản** chỉ hiển thị chính URL đó dưới dạng liên kết có thể click — không bao giờ hiển thị lỗi kỹ thuật cho tác giả, và bài viết vẫn lưu được bình thường.
- Dữ liệu xem trước (tiêu đề/mô tả/ảnh/tên miền) được **lưu cứng vào thuộc tính của node** ngay khi lấy về lần đầu (không gọi lại endpoint mỗi lần hiển thị nội dung đã lưu) — trừ khi tác giả chủ động bấm nút "làm mới xem trước" ở chế độ soạn thảo để lấy lại dữ liệu mới nhất.
- Ở chế độ chỉ đọc: click vào bất kỳ đâu trên thẻ mở URL gốc ở tab mới.
- Ở chế độ soạn thảo: có nút "đổi URL" (nhập lại và lấy xem trước mới), nút "làm mới", nút xóa khối.

### 3. Toolbar bổ sung

- Thêm nút **Gạch chân** (underline) vào nhóm định dạng chữ hiện có (cạnh đậm/nghiêng/gạch ngang), dùng extension TipTap chuẩn.
- Thêm nhóm nút **căn lề** (trái/giữa/phải) áp dụng cho đoạn văn/tiêu đề hiện tại, dùng extension TextAlign chuẩn của TipTap, mặc định căn trái khi không set.
- Thêm nút mở nhanh menu chèn khối (icon dấu `+`) làm lối vào thứ hai cho registry lệnh ở mục 1, dành cho người dùng không quen gõ `/` hoặc đang dùng chuột — click mở đúng danh sách lệnh dạng dropdown tại vị trí con trỏ hiện tại (không cần gõ `/`).

### 4. Tay cầm kéo-thả (Drag Handle)

- Khi rê chuột qua bất kỳ khối cấp block nào (đoạn văn, tiêu đề, callout, flipcard, button, web-preview, các khối media hiện có...), một tay cầm nhỏ (6 chấm hoặc biểu tượng tương đương) hiện ra ở lề trái của khối đó.
- Kéo tay cầm và thả vào vị trí khác trong cùng vùng soạn thảo di chuyển toàn bộ khối (và nội dung con của nó, nếu có — ví dụ nội dung bên trong một callout) tới vị trí mới, giữ nguyên định dạng.
- Click vào tay cầm (không kéo) mở một menu ngữ cảnh nhỏ: **Nhân bản khối**, **Xóa khối** — đủ dùng cho thao tác nhanh không cần chọn text bằng tay.
- Đây là một tiện ích áp dụng cho **mọi khối cấp block đã có sẵn**, không riêng 5 khối mới — nhưng phạm vi đợt này chỉ đảm bảo nó hoạt động đúng với các khối văn bản chuẩn và 5 khối mới; các khối media hiện có (ảnh/video/PDF/presentation/file) đã tự có tay cầm kéo riêng của chúng (xem `presentation.tsx` hiện tại) nên không bắt buộc phải thay bằng cơ chế chung này trong đợt 1 — có thể để nguyên.

### 5. Endpoint xem trước liên kết (Link Preview)

Một endpoint backend mới phục vụ riêng cho khối Web Preview (mục 2e), nhưng thiết kế đủ tổng quát để tái dùng cho nhu cầu tương tự sau này.

- **Route:** `GET /api/link-preview?url=<url-đã-encode>`.
- **Ai gọi được:** bất kỳ người dùng đã đăng nhập nào (không cần quyền nội dung cụ thể — tương tự các endpoint tiện ích dùng chung khác của hệ thống chỉ yêu cầu "đã đăng nhập", không yêu cầu quyền quản lý một loại nội dung nhất định, vì bản thân việc xem trước một link không làm lộ hay thay đổi dữ liệu nội bộ nào).
- **Đầu vào hợp lệ:** chỉ chấp nhận URL tuyệt đối với scheme `http` hoặc `https`. Bất kỳ scheme nào khác (`file:`, `ftp:`, v.v.) hoặc URL không parse được → lỗi 400 với thông báo chung "URL không hợp lệ".
- **Chống SSRF (Server-Side Request Forgery) — bắt buộc, hai lớp:**
  1. **Trước khi kết nối:** phân giải DNS của hostname trong URL; nếu bất kỳ địa chỉ IP nào phân giải được thuộc một trong các dải: loopback (`127.0.0.0/8`, `::1`), địa chỉ riêng tư (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`), link-local (`169.254.0.0/16`, `fe80::/10` — bao gồm cả địa chỉ metadata cloud phổ biến `169.254.169.254`), hoặc dải "unspecified"/broadcast → **từ chối ngay, không gọi ra ngoài**, trả lỗi 400 "Không thể xem trước liên kết này".
  2. **Sau khi kết nối thành công:** kiểm tra lại địa chỉ IP thực sự mà kết nối TCP đã dùng (không tin vào kết quả DNS đã tra ở bước 1) khớp với cùng bộ quy tắc chặn ở trên — đóng khe hở tấn công kiểu DNS rebinding (hostname phân giải khác đi giữa lúc kiểm tra và lúc thực sự kết nối). Nếu địa chỉ thực tế nằm trong vùng bị chặn → hủy request ngay, không đọc thêm dữ liệu, trả lỗi như trên.
  3. Không đi theo redirect HTTP tới một origin khác một cách vô điều kiện — mỗi lần redirect phải áp dụng lại đúng hai lớp kiểm tra trên cho URL đích mới; giới hạn tối đa 3 lần redirect rồi từ chối.
- **Giới hạn tài nguyên:** timeout tổng cộng 5 giây cho toàn bộ request (bao gồm mọi redirect); chỉ đọc tối đa 512KB đầu tiên của response body rồi ngắt kết nối (đủ để có `<head>` của hầu hết trang, không tải nguyên trang lớn).
- **Dữ liệu trích xuất:** từ HTML nhận được, đọc theo thứ tự ưu tiên: `<meta property="og:title">` → `<meta name="twitter:title">` → thẻ `<title>` (cho tiêu đề); `<meta property="og:description">` → `<meta name="twitter:description">` → `<meta name="description">` (cho mô tả); `<meta property="og:image">` → `<meta name="twitter:image">` (cho ảnh, phải là URL tuyệt đối — nếu là URL tương đối thì bỏ qua, không tự ráp origin để tránh phức tạp không cần thiết); hostname của URL gốc (cho tên miền hiển thị). Thiếu bất kỳ trường nào thì trả về `null` cho trường đó, không coi là lỗi toàn phần.
- **Chuẩn hóa văn bản:** tiêu đề/mô tả lấy được phải được giải mã HTML entity rồi cắt ngắn về độ dài hợp lý (ví dụ tiêu đề ≤ 200 ký tự, mô tả ≤ 300 ký tự) trước khi trả về — response luôn là JSON thuần túy (không phải HTML), nên không cần escape lại; việc escape chỉ xảy ra ở phía frontend khi hiển thị (React tự escape khi render text bình thường).
- **Cache:** kết quả xem trước (thành công) được cache theo khóa là chính URL đã chuẩn hóa, thời hạn 24 giờ, dùng lớp cache Redis dùng chung sẵn có của hệ thống — cùng một URL được nhiều tác giả dán vào nhiều bài khác nhau chỉ tốn một lần gọi ra ngoài thật sự trong 24 giờ. Kết quả lỗi/không lấy được **không cache** (để lần sau có thể thử lại ngay, tránh việc một lỗi tạm thời — ví dụ trang đích đang bảo trì — bị "đóng băng" thành lỗi cache cả ngày).
- **Response thành công:** `{ "title": string | null, "description": string | null, "imageUrl": string | null, "domain": string }`.
- **Response lỗi:** mã 400 kèm thông báo lỗi chung, không tiết lộ chi tiết kỹ thuật (không lộ rằng đó là do bị chặn SSRF cụ thể — người dùng chỉ thấy "không xem trước được", tránh dùng endpoint này để dò quét mạng nội bộ dựa trên thông báo lỗi khác nhau).

## End-User Value

Tác giả soạn nội dung nhanh hơn nhiều nhờ gõ `/` thay vì tìm nút trên toolbar; nội dung giáo dục trông chuyên nghiệp và đa dạng hơn (hộp lưu ý sư phạm, thẻ ghi nhớ ôn tập kiểu flashcard rất phù hợp với nội dung học thuật/luật cờ/khai cuộc cần ghi nhớ, huy hiệu đánh dấu độ khó, nút kêu gọi hành động dẫn tới bài tập/tài nguyên ngoài, thẻ xem trước đẹp khi trích dẫn nguồn tham khảo) mà không cần biết viết HTML thô hay nhúng iframe tay.

## Key Technical Context

- **Frontend:** `apps/web/app/components/RichText/extensions/` — 5 file mới (`callout.tsx`, `flipcard.tsx`, `badge.tsx`, `buttonLink.tsx`, `webPreview.tsx`), theo đúng pattern đã có ở `presentation.tsx`/`video.tsx`: mỗi file export một cặp `XEmbedEditor`/`XEmbedViewer` tạo từ `Node.create`, dùng `ReactNodeViewRenderer` + `NodeViewWrapper`, đọc/ghi qua thuộc tính `data-node-type` + `data-*` để round-trip HTML chính xác qua `parseHTML`/`renderHTML`, và khai báo command riêng qua `declare module "@tiptap/core"` như các extension hiện tại.
- **Registry dùng chung:** `apps/web/app/components/RichText/extensions/utils/blockRegistry.ts` — một mảng khai báo tất cả lệnh chèn khối (nhãn, mô tả ngắn, icon, từ khóa tìm kiếm, nhóm, hàm chèn) dùng bởi cả slash-command menu và nút "+" trên toolbar.
- **Slash command:** `apps/web/app/components/RichText/extensions/slashCommand.tsx` (extension TipTap dùng gói `@tiptap/suggestion`, license MIT, cùng họ với các gói `@tiptap/*` đã có trong `package.json`) + component menu nổi `apps/web/app/components/RichText/components/SlashCommandMenu.tsx`.
- **Toolbar:** cập nhật `apps/web/app/components/RichText/toolbar/EditorToolbar.tsx` (thêm nút Underline, nhóm căn lề, nút mở nhanh registry) — không đổi chữ ký `EditorToolbarProps` hiện có.
- **Plugin registration:** `apps/web/app/components/RichText/plugins.ts` — đăng ký 5 extension mới + `Underline` + `TextAlign` + extension slash-command vào `getContentEditorPlugins()` (biến thể editor) và 5 extension viewer + `Underline` + `TextAlign` vào `contentViewerPlugins` (biến thể viewer); **không** đổi `baseEditorPlugins`/`baseViewerPlugins` (slash-command và 5 khối mới chỉ dành cho biến thể `content`).
- **Backend:** module mới `apps/api/src/link-preview/` (`link-preview.controller.ts`, `link-preview.service.ts`, `link-preview.module.ts`, `schemas/link-preview.schema.ts`) đăng ký vào `app.module.ts`; dùng `PERMISSIONS.ACCOUNT_READ_SELF` (quyền "đã đăng nhập" hiện có, dùng chung với endpoint `current-user`) làm điều kiện truy cập tối thiểu qua `@RequirePermission`; dùng `getCachedJson`/`setCachedJson` từ `apps/api/src/utils/redis-cache.ts` cho cache 24h; validate query bằng TypeBox qua `@Validate`.
- **Không đổi:** cấu trúc lưu trữ `lessons.description`/`articles`/`news`/`qa` (vẫn HTML/JSON như hiện tại), API contract của các module đó, và `baseEditorPlugins`/`baseViewerPlugins`.

## Non-Goals (đợt này)

- Không làm khối Toán học (LaTeX) và khối code tô màu cú pháp (lowlight) — để lại làm sau nếu cần, không phụ thuộc gì vào đợt này.
- Không làm audio block (thuộc đợt 5, đi cùng mở rộng thư viện tài nguyên).
- Không đổi cách lưu trữ nội dung (không chuyển sang JSON document kiểu ProseMirror thuần, vẫn giữ HTML string như hiện tại).
- Không thêm lược sử phiên bản nội dung (đợt 4).
- Tay cầm kéo-thả không bắt buộc phải thay thế cơ chế kéo riêng đã có sẵn của các khối media cũ.

## Test Evidence

**Frontend:** 26 Vitest test mới — `normalizeCalloutAttrs`/`normalizeFlipcardAttrs`/`normalizeBadgeAttrs`/`normalizeButtonLinkAttrs`/`normalizeWebPreviewAttrs` (mỗi hàm: round-trip giá trị hợp lệ, fallback đúng giá trị mặc định khi thiếu/không hợp lệ, cắt ngắn văn bản badge quá dài); `isValidHttpUrl` (chấp nhận http/https, từ chối `javascript:`/`ftp:`/chuỗi không phải URL); `BLOCK_REGISTRY` (không trùng id, mọi item thuộc nhóm hợp lệ, có labelKey + keyword, mọi entry nhóm `media` đều đánh dấu `requiresAssetLibrary`); `filterBlockRegistry` (rỗng trả về tất cả, khớp theo id/keyword không phân biệt hoa-thường, không khớp trả về rỗng). Toàn bộ suite Vitest hiện có của `apps/web` (47 file, 228 test) chạy lại sạch — không hồi quy.

**Backend:** 20 Jest test mới — `isBlockedIpAddress` (chặn loopback/private/link-local/cloud-metadata/unspecified/broadcast cả IPv4 và IPv6, chấp nhận IP công khai, chặn chuỗi không parse được thành IP); `extractHtmlMeta` (ưu tiên OG > Twitter > thẻ chuẩn, giải mã HTML entity, gom khoảng trắng, bỏ qua ảnh có URL tương đối, cắt ngắn tiêu đề quá dài); `LinkPreviewService` (từ chối scheme không hỗ trợ trước khi gọi mạng, trả cache hit không gọi `fetchHtmlSafely`, trích xuất + cache đúng khi thành công, lỗi bị chặn SSRF/lỗi mạng đều trả 400 chung chung và **không** được cache). Toàn bộ suite Jest hiện có của `apps/api` (52 suite, 315 test, chạy bằng Node 22 — Node 25 lỗi `SlowBuffer` không liên quan tới thay đổi này) chạy lại sạch — không hồi quy.

`tsc --noEmit` và `eslint` sạch trên cả hai package sau khi thêm module mới. Swagger schema (`apps/api/src/swagger/api-schema.json`) và client sinh ra (`apps/web/app/api/generated-api.ts`) đã được regenerate qua đúng quy trình (`nest start` một lần để export schema, rồi `pnpm generate:client`) — diff chỉ thêm route `GET /api/link-preview`, không đổi gì khác.

## Follow-up Work (chưa làm trong đợt này)

- **Tay cầm kéo-thả tổng quát**: 3 trong 5 block mới (Callout, Flipcard, WebPreview) đã có `data-drag-handle` trên vùng bọc ngoài (giữ nguyên cơ chế NodeView draggable sẵn có của TipTap), nhưng chưa có một gutter kéo-thả hiện khi hover dùng chung cho mọi khối văn bản chuẩn (đoạn văn, tiêu đề...) như mô tả tham vọng ban đầu — gói `@tiptap/extension-drag-handle` MIT hiện chỉ có bản tương thích TipTap v3, xung đột với TipTap v2.27.1 đang dùng trong repo.
- **Math LaTeX** và **code block tô màu cú pháp (lowlight)** — đã đánh dấu tùy chọn trong spec, chưa làm để giữ phạm vi đợt 1 gọn.
- **Chưa có E2E Playwright** cho các block mới — mới có Vitest/Jest; nếu cần phủ luồng UI đầy đủ (gõ `/`, chọn lệnh, chèn, lưu, xem lại) thì làm ở đợt sau theo pattern `apps/web/e2e/{data,factories,flows,specs}/`.
