# Roadmap: đưa các hệ con từ LearnHouse vào mentingo_LMS

> Mọi đợt dưới đây tuân thủ [00-cleanroom-policy.md](./00-cleanroom-policy.md). Mỗi đợt là một PR độc lập, có `docs/specs/<feature>-business-spec.md` riêng (Definition of Done theo `AGENTS.md`), chạy `pnpm generate:client` sau khi contract API ổn định, và thêm i18n cho cả 7 ngôn ngữ.

## Đợt 1 — Assignment engine (đã có prototype trong repo này)

Khoảng trống lớn nhất, giá trị nghiệp vụ cao nhất. Thêm lesson type thứ 7 (`assignment`), 4 bảng mới có RLS, module `apps/api/src/assignments/`, UI soạn/làm/chấm bài. Tái dùng AI judge, `uciMoveSequencesEqual`, upload S3/TUS, outbox đã có sẵn trong mentingo. Xem `docs/specs/assignment-engine-business-spec.md`.

Với trường cờ, mở ra: bài về nhà nộp PGN có chú giải, bộ bài tập chiến thuật chấm tự động qua so khớp UCI, HLV chấm tay kèm nhận xét.

## Quick wins (không phụ thuộc nhau, làm xen kẽ giữa các đợt lớn)

- **Trang xác thực chứng chỉ công khai** `/certificates/verify/:uuid` (không cần đăng nhập) + mã QR trên bản PDF puppeteer đã có.
- **Block trang trí cho TipTap**: callout, flipcard, badge, button, web-preview card. Thêm node extension vào `apps/web/app/components/RichText/extensions/` theo mẫu `video.tsx`/`presentation.tsx` đã có, đăng ký trong `plugins.ts` + `toolbar/EditorToolbar.tsx`.
- **Slash-command trong editor** (menu gõ `/` để chèn block nhanh) — dùng lại chính registry block ở trên.
- **3 lớp bảo mật tài khoản**: chặn đăng ký bằng email dùng-một-lần (disposable email), khóa tài khoản tạm thời sau N lần đăng nhập sai, captcha ở trang đăng ký công khai.

## Đợt 2 — Analytics sâu + SEO công khai

Giá trị marketing/tuyển sinh trực tiếp, không phụ thuộc đợt 1.

- Bộ truy vấn Drizzle mới trong `apps/api/src/analytics/`: funnel hoàn thành theo bài học, tỷ lệ rơi rụng theo chương, cohort retention theo tuần/tháng nhập học, tốc độ hoàn thành trung bình, giờ học cao điểm, tỷ lệ xem trang khóa học → đăng ký, danh sách học viên tích cực nhất. Không cần thêm ClickHouse/Tinybird — truy vấn trực tiếp trên Postgres hiện có, chấp nhận đánh đổi hiệu năng ở quy mô nhỏ/vừa.
- SEO: bật SSR/prerender cho các route công khai (trang chủ khóa học, trang giới thiệu) — `apps/web/server.js` đã tồn tại nhưng dev/build hiện chạy SPA thuần (`ssr: false` trong `apps/web/vite.config.ts`). Thêm JSON-LD schema.org `Course`, sitemap.xml động, robots.txt, Open Graph image cho chia sẻ mạng xã hội.

## Đợt 3 — Cộng đồng + hồ sơ công khai

Phụ thuộc: không phụ thuộc đợt trước, nhưng nên làm sau khi có feature flag pattern ổn định.

- Bảng community / discussion / comment / vote / reaction, ghim/khóa bài, kiểm duyệt theo danh sách từ khóa cấu hình được.
- Đặt sau feature flag mới trong `packages/shared/src/constants/features.ts` (theo mẫu `qa`/`news` đã có), cho phép bật/tắt theo tenant.
- Trang hồ sơ công khai `/u/:username`.

## Đợt 4 — Lịch sử phiên bản + soạn thảo cộng tác

- Bảng snapshot nội dung bài học (JSONB + số hiệu phiên bản + người tạo + thời điểm), UI xem lịch sử và khôi phục.
- Cộng tác realtime dùng Yjs, truyền qua **Socket.IO gateway đã có** (`apps/api/src/websocket/` + Redis adapter) thay vì dựng server Hocuspocus riêng như LearnHouse — tận dụng hạ tầng realtime sẵn có thay vì thêm một service mới.

## Đợt 5 — Thư viện phân cấp + bàn phân tích cộng tác

Phụ thuộc: hạ tầng Yjs từ đợt 4 (cho phần bàn phân tích cộng tác).

- Nâng `apps/api/src/resource-library/` thành cây thư mục tự tham chiếu (`parentFolderId`), chứa được nhiều loại tài nguyên (course/board/media) qua bảng nối đa hình.
- Bàn phân tích cờ cộng tác nhiều người dùng chung hạ tầng Yjs — tái dùng `apps/web/app/modules/Chess/board/ChessBoard.tsx` đã có, chỉ thêm lớp đồng bộ trạng thái.

## Đợt 6 — Tự động hóa + AI nâng cao

Phụ thuộc: nên làm sau đợt 1 (Assignment engine) vì "sinh bài tập bằng AI" cần Assignment engine đã tồn tại.

- Webhook đi ra ngoài dựng trên `apps/api/src/outbox/` sẵn có: HMAC ký payload, secret mã hóa khi lưu, log giao hàng có số lần thử, và schema sự kiện dùng chung cho tài liệu + validate lúc gửi (thiết kế đáng học nhất từ LearnHouse — xem [04-subsystem-notes.md](./04-subsystem-notes.md) mục 4).
- Sinh quiz bằng AI, sinh bài tập bằng AI (dùng Luma đã có), auto-caption video bằng AI.
- Nhật ký lượt sinh AI + đo hạn mức theo tenant — cần thiết khi số tính năng AI sinh nội dung tăng, để kiểm soát chi phí vận hành theo từng trường/tenant dùng mentingo.

## Đợt 7 — Vận hành & tuân thủ

Làm khi mentingo phục vụ nhiều tenant/khách hàng hơn, không khẩn cấp cho giai đoạn hiện tại.

- GDPR export / anonymize dữ liệu người dùng theo yêu cầu.
- Custom domain tự phục vụ: luồng xác thực TXT/CNAME, trạng thái SSL, thay vì đặt `tenants.host` thủ công.
- Landing page builder, menu builder, custom script injection cho từng tenant.
- Vai trò đồng tác giả (contributor/maintainer) trên khóa học, thay vì chỉ một `authorId`.

## Loại khỏi phạm vi (đã cân nhắc, quyết định không làm)

- **Code playground 30 ngôn ngữ (Judge0)** — không liên quan mô hình đào tạo cờ vua, chi phí vận hành Judge0 không hợp lý cho nhu cầu hiện tại.
- **Podcast + RSS công khai** — chờ nhu cầu thực tế xuất hiện.
- **Mô hình thanh toán offer→usergroup của LearnHouse** — Stripe + promotion codes hiện có của mentingo đã đủ đáp ứng.
- **Bất kỳ thứ gì trong `apps/web/ee/` hoặc `apps/api/ee/` của LearnHouse** — Enterprise License, không được phép tham khảo dưới bất kỳ hình thức nào (xem [00-cleanroom-policy.md](./00-cleanroom-policy.md)).

## Cách dùng roadmap này

Mỗi đợt bắt đầu bằng việc viết `docs/specs/<feature>-business-spec.md` mô tả hành vi nghiệp vụ (mẫu: `docs/specs/ai-mentor-lessons-business-spec.md`, `docs/specs/chess-exercise-bank-business-spec.md`), sau đó mới viết code. Người triển khai đợt sau không cần đọc lại LearnHouse — toàn bộ ngữ cảnh thiết kế cần thiết đã nằm trong 5 file của `docs/research/learnhouse/` và trong business spec của chính đợt đó.
