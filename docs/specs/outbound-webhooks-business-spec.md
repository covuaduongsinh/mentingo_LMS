# Outbound Webhooks Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (xem `docs/research/learnhouse/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt 9 của roadmap bổ sung khả năng gửi webhook ra ngoài khi có sự kiện nghiệp vụ xảy ra (học viên ghi danh, hoàn thành khóa học, cấp chứng chỉ...), để trường cờ tích hợp với công cụ bên ngoài (Zapier, CRM nội bộ, bot Discord/Slack tự viết...) mà không cần polling API liên tục.

Khảo sát trước khi code (2026-07-26) xác nhận hạ tầng sẵn có rất phù hợp: hệ thống outbox event nội bộ (`apps/api/src/outbox/`) đã publish nhiều sự kiện nghiệp vụ qua Nest CQRS `EventBus`, chỉ cần thêm **listener mới** lắng nghe các event đó và đẩy job gửi webhook vào hàng đợi BullMQ sẵn có — không cần xây lại pipeline sự kiện. SSRF guard (`apps/api/src/link-preview/utils/ssrf-guard.ts`, `safe-fetch.ts`) và mã hoá bí mật kiểu envelope (`MASTER_KEY`, dùng trong `env.service.ts`/`integration.service.ts`) cũng đã có sẵn, tái dùng nguyên vẹn logic thay vì viết lại.

**Thu hẹp phạm vi so với hệ thống tham khảo**: hệ thống tham khảo có registry ~40 sự kiện với `data_schema` dùng chung cho cả trang docs lẫn validate, cộng tích hợp Zapier REST Hooks riêng. Đợt này triển khai **6 sự kiện nghiệp vụ cốt lõi** (đủ giá trị cho tích hợp thực tế: ghi danh, hoàn thành khóa học, hoàn thành bài học, nộp bài tập, chấm bài tập, cấp chứng chỉ) thay vì 40, và **không làm** tích hợp Zapier riêng (endpoint webhook chuẩn đã tương thích với Zapier "Webhooks by Zapier" mà không cần code thêm). Xem Non-Goals.

## Who Uses It

- Admin tenant (quyền quản trị tích hợp, dùng lại nhóm quyền `integration.*` hiện có — xem mục Quyền) — tạo/xoá endpoint webhook, chọn sự kiện muốn nhận, xem log gửi gần đây, kiểm tra kết nối (ping test), tái sinh secret khi nghi lộ.

## Feature Functions

### 1. Quản lý endpoint webhook

- Mỗi endpoint có: `url` (bắt buộc, http/https, qua SSRF guard), danh sách `events` đã đăng ký (mảng chuỗi, chọn từ registry cố định — xem mục 2), `active` (bật/tắt tạm thời không cần xoá), `secret` (sinh tự động lúc tạo, mã hoá tại chỗ theo đúng kiểu envelope-encryption hiện có, không bao giờ trả về nguyên văn qua API sau lần tạo — chỉ hiện 1 lần lúc tạo/tái sinh, giống hành vi `IntegrationApiKeyCard` hiện có).
- Danh sách endpoint hiển thị URL, trạng thái active, thời điểm tạo, tỉ lệ gửi thành công gần đây (tính từ log 50 lần gửi gần nhất).
- Xoá endpoint: xoá cứng (kèm log liên quan, không cần giữ lại vì không phải dữ liệu nghiệp vụ chính).
- Tái sinh secret: sinh secret mới, secret cũ hết hiệu lực ngay (không có thời gian chuyển tiếp — đơn giản hoá cho đợt này, ghi rõ trong UI trước khi xác nhận).
- Nút "Gửi thử" (ping test): gửi một payload mẫu cố định (`event: "webhook.ping"`) đến endpoint ngay lập tức (không qua hàng đợi), hiển thị kết quả (status code/lỗi) ngay trên UI để admin xác nhận endpoint hoạt động trước khi tin tưởng vào các sự kiện thật.

### 2. Registry sự kiện cố định

6 sự kiện đợt này, mỗi sự kiện có tên cố định (`snake.case`, ví dụ `course.completed`) và một payload JSON cố định cấu trúc (id đối tượng liên quan + vài trường ngữ cảnh, không lộ dữ liệu nhạy cảm như mật khẩu/token):

| Sự kiện                | Khi nào phát sinh                                               | Payload chính                                                           |
| ---------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `enrollment.created`   | Học viên được ghi danh vào khóa học (tự đăng ký hoặc admin gán) | `userId`, `courseId`, `enrolledAt`                                      |
| `course.completed`     | Học viên hoàn thành 100% khóa học                               | `userId`, `courseId`, `completedAt`                                     |
| `lesson.completed`     | Học viên hoàn thành 1 bài học                                   | `userId`, `lessonId`, `courseId`, `completedAt`                         |
| `assignment.submitted` | Học viên nộp bài tập                                            | `userId`, `assignmentId`, `submissionId`, `submittedAt`                 |
| `assignment.graded`    | Bài tập được chấm điểm (tự động hoặc thủ công)                  | `userId`, `assignmentId`, `submissionId`, `score`, `passed`, `gradedAt` |
| `certificate.issued`   | Chứng chỉ được cấp cho học viên                                 | `userId`, `certificateId`, `courseId`, `issuedAt`                       |

Mỗi payload còn kèm bao bọc chung: `{ event, occurredAt, tenantId, data: {...} }`.

### 3. Gửi webhook (delivery)

- Khi 1 trong 6 sự kiện xảy ra, hệ thống tìm tất cả endpoint `active=true` của tenant đó có đăng ký sự kiện tương ứng, đẩy 1 job gửi cho mỗi endpoint vào hàng đợi BullMQ mới (`WEBHOOK_DELIVERY`).
- Mỗi lần gửi: POST JSON tới `url`, kèm header `X-Webhook-Signature` (HMAC-SHA256 của body, ký bằng secret của endpoint, dạng `sha256=<hex>`) và `X-Webhook-Event` (tên sự kiện) để bên nhận xác thực nguồn gốc.
- Trước khi gửi, `url` được kiểm tra lại qua SSRF guard (tái dùng logic `ssrf-guard.ts`/`safe-fetch.ts`) — chặn cả trường hợp DNS đổi sang IP nội bộ sau khi endpoint đã được tạo hợp lệ trước đó (kiểm tra tại thời điểm gửi, không chỉ lúc tạo).
- Thử lại tối đa 3 lần với backoff kiểu exponential (mẫu `attempts: 3, backoff: { type: "exponential", delay: 1000 }` đã dùng cho hàng đợi ingestion) khi gửi thất bại (lỗi mạng, timeout, hoặc mã trạng thái không phải 2xx). Sau 3 lần thất bại, đánh dấu lần gửi đó là thất bại vĩnh viễn (không tự thử lại nữa, admin có thể xem log để biết).
- Timeout mỗi lần gửi: 10 giây. Giới hạn kích thước response đọc về: không cần đọc body response đầy đủ, chỉ cần status code (không lưu response body vào log để tránh phình dữ liệu/rò rỉ thông tin nhạy cảm từ hệ thống bên nhận).

### 4. Log gửi (delivery log)

- Mỗi lần thử gửi (kể cả các lần retry) ghi 1 dòng: endpoint, sự kiện, thời điểm, mã trạng thái HTTP (hoặc mô tả lỗi nếu không kết nối được), số lần thử đã dùng, thành công/thất bại.
- Trang admin hiển thị 50 log gần nhất theo từng endpoint, không phân trang sâu hơn ở đợt này (đủ để debug, xem toàn bộ lịch sử để sau nếu cần).
- Không cần cơ chế gửi lại thủ công 1 log cụ thể ở đợt này (đã có retry tự động 3 lần) — xem Non-Goals.

### 5. Quyền truy cập

- Dùng lại nhóm quyền tích hợp hiện có (`integration.*`, xem `IntegrationAdminController`/`PERMISSIONS` hiện tại) cho toàn bộ endpoint webhook admin — không giới thiệu quyền `webhook.*` riêng, tránh làm phức tạp thêm phạm vi đợt này (tương tự quyết định "dùng ké quyền" ở Đợt 8).

## End-User Value

Trường cờ kết nối được các sự kiện học tập quan trọng (ghi danh, hoàn thành, chứng chỉ) với công cụ bên ngoài (Zapier, CRM, bot thông báo nội bộ) mà không cần polling API hay chờ tính năng tích hợp riêng cho từng công cụ.

## How It Works

- **Bảng mới `webhook_endpoints`**: `id`, `...timestamps`, `url` (varchar), `eventsSubscribed` (jsonb mảng chuỗi), `active` (boolean, default true), secret mã hoá kiểu envelope hiện có (các cột `secretCiphertext`/`secretIv`/`secretTag`/`secretDekIv`/`secretEncryptedDek`/`secretDekTag`, mẫu `EnvService`), `tenantId` + RLS.
- **Bảng mới `webhook_deliveries`**: `id`, `...timestamps`, `webhookEndpointId` FK cascade, `eventType` (varchar), `statusCode` (integer, nullable), `success` (boolean), `attemptCount` (integer), `errorMessage` (text, nullable), `tenantId` + RLS.
- **Listener mới** (`apps/api/src/webhooks/handlers/`): 6 lớp `@EventsHandler` lắng nghe đúng 6 sự kiện CQRS đã tồn tại tương ứng với bảng ở mục 2 (khảo sát tên event lớp thật trước khi code — nếu 1 trong 6 sự kiện nghiệp vụ **chưa** được publish qua outbox hiện tại, bổ sung `OutboxPublisher.publish(...)` tại đúng nơi phát sinh, theo đúng mẫu các event khác, thay vì tạo pipeline mới).
- **`WebhookDispatchService`**: nhận 1 event đã rehydrate, tìm endpoint phù hợp, đẩy job vào hàng đợi `WEBHOOK_DELIVERY` (thêm vào `QUEUE_NAMES`).
- **`WebhookDeliveryWorker`**: mẫu `IngestionWorker`, xử lý job gửi HTTP POST + ký HMAC + SSRF re-check + ghi `webhook_deliveries`.
- **Repository/Service/Controller mới** `apps/api/src/webhooks/`: CRUD endpoint, ping test (gửi ngay không qua hàng đợi), list log.
- **Migration**: 2 bảng mới trong 1 file `drizzle-kit generate` + 1 file RLS riêng theo mẫu các đợt trước.

## Non-Goals (đợt này — chuyển sang Follow-up Work)

- **Tích hợp Zapier "REST Hooks" riêng**: endpoint webhook chuẩn (POST JSON + HMAC header) đã tương thích với "Webhooks by Zapier" có sẵn trên Zapier, không cần code thêm ở phía mentingo.
- **Registry đầy đủ ~40 sự kiện**: chỉ 6 sự kiện cốt lõi giá trị cao nhất cho tích hợp thực tế; mở rộng thêm sự kiện sau này chỉ cần thêm 1 `@EventsHandler` mới, không đổi kiến trúc.
- **Gửi lại thủ công 1 lần gửi cụ thể từ log**: đã có retry tự động 3 lần; thêm nút "gửi lại" thủ công để sau nếu có nhu cầu thực tế.
- **Thời gian chuyển tiếp khi tái sinh secret** (secret cũ vẫn hoạt động song song một thời gian): đơn giản hoá — secret mới có hiệu lực ngay, secret cũ vô hiệu ngay.
- **Trang docs công khai liệt kê registry sự kiện** (kiểu API reference tự sinh từ `data_schema`): bảng ở mục 2 trong spec này là tài liệu tham khảo cho đợt này; trang docs công khai để sau nếu cần.
- **Quyền `webhook.*` riêng**: giữ nguyên dùng ké quyền `integration.*` hiện có.

## Key Technical Context

- `apps/api/src/storage/schema/index.ts` — bảng `webhookEndpoints`, `webhookDeliveries` mới.
- `apps/api/src/webhooks/` — module mới (repository/service/controller/schemas, `handlers/` cho 6 `@EventsHandler`, `webhook-delivery.worker.ts`).
- `apps/api/src/queue/queue.types.ts` — thêm `WEBHOOK_DELIVERY` vào `QUEUE_NAMES`.
- Tái dùng nguyên vẹn: `apps/api/src/link-preview/utils/ssrf-guard.ts` (kiểm tra IP nội bộ), envelope-encryption pattern từ `apps/api/src/env/services/env.service.ts` (mã hoá secret).
- Frontend: `apps/web/app/modules/Dashboard/Settings/` — trang/section mới quản lý webhook endpoint, mẫu cấu trúc `IntegrationApiKeyCard.tsx` nhưng dạng danh sách (nhiều endpoint) thay vì 1 secret đơn.

## Test Evidence

- Migration `0179_add_webhooks.sql` + `0180_enable_webhooks_rls.sql` áp dụng thành công vào DB dev.
- `apps/api`/`apps/web` `tsc --noEmit` sạch, `eslint --max-warnings=0` sạch (Node 22).
- Test mới `apps/api/src/webhooks/__tests__/webhooks.service.spec.ts` (9 test, Jest Node 22): tạo endpoint trả secret 1 lần, ping thành công/thất bại không throw, `NotFoundException` khi endpoint không tồn tại, dispatch tạo đúng số job theo số endpoint đăng ký, không tạo job khi không có endpoint nào đăng ký, ghi log thành công/thất bại + throw để BullMQ tự retry, chữ ký HMAC-SHA256 đúng định dạng header.
- Cập nhật test hiện có `assignments.service.spec.ts` (submitTask giờ publish thêm `AssignmentSubmittedEvent`, tổng 2 outbox event khi tự động chấm đạt GRADED thay vì 1).
- Full Jest suite `apps/api` chạy sạch sau khi cập nhật (xem log thực thi trước khi commit).
- Regenerate `apps/api/src/swagger/api-schema.json` xác nhận đủ 5 route `webhooks` mới; `pnpm run generate:client` đồng bộ `apps/web/app/api/generated-api.ts`.
- i18n: đủ 7 locale (en/vi/pl/de/es/lt/cs) cho khóa `webhooks.*`, validate `JSON.parse` sạch trên cả 7 file.

## Follow-up Work (đợt sau, nếu cần)

- Mở rộng registry sự kiện (thêm sự kiện mới chỉ cần 1 `@EventsHandler`).
- Nút gửi lại thủ công 1 lần gửi cụ thể từ delivery log.
- Thời gian chuyển tiếp khi tái sinh secret (secret cũ + mới cùng hoạt động một khoảng thời gian).
- Trang docs công khai tự sinh từ registry sự kiện.
- Quyền `webhook.read`/`webhook.manage` riêng, tách khỏi quyền tích hợp chung.
