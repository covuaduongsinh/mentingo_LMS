# Roadmap: đưa các hệ con từ LearnHouse vào mentingo_LMS

> Mọi đợt dưới đây tuân thủ [00-cleanroom-policy.md](./00-cleanroom-policy.md). Mỗi đợt là một PR độc lập, bắt đầu bằng một `docs/specs/<feature>-business-spec.md` **đầy đủ và tỉ mỉ** (mô tả từng hành vi nghiệp vụ, từng trường dữ liệu, từng trạng thái, từng quy tắc, từng luồng người dùng — đủ để người viết code không bao giờ cần mở lại LearnHouse), chạy `pnpm generate:client` sau khi contract API ổn định, và thêm i18n cho cả 7 ngôn ngữ. Chi tiết từng dòng thiếu hụt: xem [03-feature-matrix.md](./03-feature-matrix.md).

## Đã hoàn thành

| Đợt       | Nội dung                                                                                                                   | PR  |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | --- |
| 1         | Assignment engine — lesson type thứ 7, 5 loại task, 5 thang điểm, chấm tự động/AI/thủ công, thu hồi chứng chỉ khi chấm lại | #4  |
| Quick win | Trang xác thực chứng chỉ công khai `/certificates/verify/:uuid` + mã QR, vá IDOR share-token                               | #5  |
| 2a        | Analytics sâu cấp khóa học: funnel hoàn thành bài học, dropoff theo chương, tốc độ hoàn thành, top learners                | #6  |
| 2b        | SEO Tier 1: robots.txt/sitemap.xml động, render OG cho bot trên trang khóa học                                             | #7  |
| —         | Sửa lỗi thiếu nút sửa trong ngân hàng bài tập cờ vua admin                                                                 | #8  |

## Đợt 1 — Editor: slash-command + block trang trí _(đang triển khai)_

Khoảng trống lớn nhất còn lại trong nhóm editor (mục A của ma trận). Thêm 5 node extension mới cho TipTap (callout, flipcard, badge, button, web-preview) theo đúng pattern hiện có (`video.tsx`/`presentation.tsx`: `Node.create` + `ReactNodeViewRenderer` + cặp Editor/Viewer), một menu gõ `/` dùng chung registry với toolbar, và nâng cấp toolbar (underline, căn lề, drag handle). Web-preview cần một endpoint mới `GET /api/link-preview` có SSRF guard (chặn IP nội bộ + kiểm tra lại IP sau khi kết nối để chống DNS rebinding), tái dùng `escapeHtml`/`stripHtml` đã có ở `apps/api/src/seo/`. Không đụng schema DB. Xem `docs/specs/rich-text-blocks-business-spec.md`.

## Đợt 2 — Hoàn thiện Assignment engine

Đóng các khoảng trống mục B: 2 loại task mới (quiz trắc nghiệm có điểm từng phần, form điền chỗ trống), hint + file tham chiếu trên từng task, autosave bài làm, chặn dán khi bật, nâng cấp trang chấm (lọc/tìm/sắp xếp/phím tắt chấm nhanh/từ chối bài nộp/cho làm lại), tab phân tích riêng cho bài tập, nhắc hạn nộp qua email, và bộ E2E Playwright phủ luồng bài tập (LearnHouse coi đây là vùng rủi ro cao nhất).

## Đợt 3 — Bảo mật tài khoản

Đóng mục C: khóa tài khoản tạm thời sau N lần đăng nhập sai (không tiết lộ trạng thái khóa trong thông báo lỗi, tránh vừa lộ email tồn tại vừa mở đường DoS nhắm 1 tài khoản), captcha Turnstile ở đăng nhập/đăng ký (tùy chọn theo env, tắt mặc định khi chưa cấu hình), đo độ mạnh mật khẩu khi đăng ký.

## Đợt 4 — Lịch sử phiên bản nội dung bài học

Đóng dòng "Lịch sử phiên bản nội dung" của mục A: snapshot nội dung lesson mỗi lần lưu (giữ tối đa 20 bản), xem/khôi phục, phát hiện xung đột khi 2 người cùng sửa. Phạm vi chỉ `lessons.description` — articles/news để đợt sau nếu có nhu cầu.

## Đợt 5 — Analytics sâu phần 2 + audio block

Đóng phần còn lại của mục E: mở rộng `apps/api/src/analytics/` (đã có từ PR #6) với cohort retention, bản đồ nhiệt giờ học cao điểm, DAU trend, mới-vs-quay-lại, phân bố điểm, tỉ lệ cấp chứng chỉ, điểm gắn kết học viên — toàn bộ tính từ dữ liệu Postgres sẵn có, không thêm event pipeline hay kho phân tích riêng. Kèm audio block cho editor (mục A) vì cùng đụng tới thư viện media.

## Đợt 6 — AI đợt 2: sinh nội dung + hạn mức

Đóng mục G: sinh quiz bằng AI, sinh bài tập bằng AI, hỏi-AI trên bất kỳ bài học nào (khác với AI Mentor vốn là một lesson type có mục tiêu chấm điểm riêng), nhật ký lượt sinh AI + hạn mức theo tenant (đặt chỗ trước khi gọi model, trừ, hoàn lại khi lỗi). Phụ thuộc: nên làm sau khi Assignment engine (đợt 2) đã ổn định vì "sinh bài tập bằng AI" cần assignment engine tồn tại.

## Đợt 7 — Cộng đồng + hồ sơ công khai

Đóng mục D: cộng đồng độc lập (có thể liên kết tùy chọn với 1 khóa học) chứa thảo luận (nhãn cố định, emoji, upvote, ghim, khóa) chứa bình luận + reaction, kiểm duyệt theo cấu hình (từ khóa chặn, slow mode, giới hạn bài/ngày, yêu cầu email xác minh, tự khóa sau N ngày), và hồ sơ công khai `/u/:username`. Đặt sau feature flag mới trong `packages/shared/src/constants/features.ts` (theo mẫu `qa`/`news` đã có).

## Đợt 8 — Thư viện phân cấp + bàn phân tích cờ cộng tác

Đóng mục F: nâng `apps/api/src/resource-library/` từ danh sách phẳng thành cây thư mục tự tham chiếu (`parentFolderId`), và một bàn phân tích cờ nhiều người dùng chung — **không** làm whiteboard tổng quát kiểu LearnHouse (CRDT Yjs cho mọi loại nội dung), mà thu hẹp thành giá trị riêng cho trường cờ: tái dùng `apps/web/app/modules/Chess/board/ChessBoard.tsx` đã có, đồng bộ trạng thái (FEN + danh sách nước đi) qua Socket.IO gateway + Redis adapter sẵn có (`apps/api/src/websocket/`) thay vì dựng thêm hạ tầng CRDT/Hocuspocus riêng.

## Đợt 9 — Tự động hóa: webhook đi ra ngoài

Đóng mục H: webhook đi ra ngoài dựng trên `apps/api/src/outbox/` sẵn có — HMAC ký payload, secret mã hóa khi lưu, log giao hàng có số lần thử, và một registry sự kiện có lược đồ dữ liệu dùng chung cho cả tài liệu hiển thị lẫn validate lúc gửi thực tế (thiết kế đáng học nhất từ LearnHouse — xem [04-subsystem-notes.md](./04-subsystem-notes.md) mục 4). SSRF guard tái dùng từ đợt 1 (link-preview).

## Đợt 10 — Vận hành & tuân thủ

Đóng mục I, làm dần khi mentingo phục vụ nhiều tenant/khách hàng hơn, không khẩn cấp cho giai đoạn hiện tại: GDPR export/anonymize, custom domain tự phục vụ (luồng xác thực TXT/CNAME + trạng thái SSL, thay vì đặt `tenants.host` thủ công), menu builder, landing page builder, custom script injection theo tenant, vai trò đồng tác giả trên khóa học (thay vì chỉ một `authorId`), khóa bài học theo nhóm ở 3 mức.

## Loại khỏi phạm vi (đã cân nhắc, quyết định không làm)

- **Code playground 30 ngôn ngữ (Judge0)** — không liên quan mô hình đào tạo cờ vua, chi phí vận hành Judge0 không hợp lý cho nhu cầu hiện tại.
- **Podcast + RSS công khai** — chờ nhu cầu thực tế xuất hiện.
- **Playground/MagicBlock (khối HTML do AI sinh)** — giá trị thấp cho trường cờ.
- **Mô hình Store/Offers/Stripe Connect marketplace và packs/plans kiểu SaaS của LearnHouse** — Stripe mua đứt từng khóa + promotion codes hiện có của mentingo đã đủ đáp ứng; mentingo không vận hành như nền tảng multi-vendor.
- **Kho phân tích chuyên dụng (Tinybird/ClickHouse)** — dùng Postgres/Drizzle trực tiếp, chấp nhận đánh đổi hiệu năng ở quy mô nhỏ/vừa.
- **AI hỗ trợ di trú nội dung từ LMS khác** — chưa cấp thiết.
- **Bất kỳ thứ gì trong `apps/web/ee/` hoặc `apps/api/ee/` của LearnHouse** — Enterprise License, không được phép tham khảo dưới bất kỳ hình thức nào (xem [00-cleanroom-policy.md](./00-cleanroom-policy.md)).

## Cách dùng roadmap này

Mỗi đợt bắt đầu bằng việc viết `docs/specs/<feature>-business-spec.md` mô tả hành vi nghiệp vụ **thật đầy đủ, tỉ mỉ đến từng khía cạnh** (mẫu: `docs/specs/ai-mentor-lessons-business-spec.md`, `docs/specs/assignment-engine-business-spec.md`), sau đó mới viết code. Người triển khai đợt sau không cần đọc lại LearnHouse — toàn bộ ngữ cảnh thiết kế cần thiết đã nằm trong 5 file của `docs/research/learnhouse/` và trong business spec của chính đợt đó. Đây là ranh giới clean-room bắt buộc theo [00-cleanroom-policy.md](./00-cleanroom-policy.md) mục 6: khảo sát (đọc LearnHouse, viết đặc tả) và lập trình (đọc đặc tả, viết code mentingo) là hai giai đoạn tách biệt.
