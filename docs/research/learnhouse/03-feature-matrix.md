# Ma trận tính năng: LearnHouse so với mentingo_LMS

> Nguồn: khảo sát read-only `D:\code\learnhouse` và `d:\code\mentingo_LMS` (2026-07-25), kiểm chứng lại bằng grep trực tiếp trên schema/thư mục mentingo trước khi chốt từng dòng.

Ký hiệu trạng thái mentingo: **❌** chưa có · **◐** có một phần · **✅** đã có (bằng hoặc mạnh hơn LearnHouse

Phán quyết: **Port** (nên xây dựng lại theo tinh thần LearnHouse) · **Thích ứng** (đã có, chỉ cần mở rộng) · **Bỏ qua** (không phù hợp mô hình mentingo hoặc chưa có nhu cầu thực).

## Nhóm khóa học / nội dung

| Tính năng LearnHouse                                            | mentingo | Phán quyết              | Ghi chú                                                                                                                                                                             |
| --------------------------------------------------------------- | -------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bài tập / nộp bài / chấm điểm                                   | ❌       | **Port — ưu tiên 1**    | 0 kết quả grep `assignment\|submission` trên `apps/api/src/storage/schema/index.ts`. Xem [02-data-model.md](./02-data-model.md) và `docs/specs/assignment-engine-business-spec.md`. |
| Lịch sử phiên bản nội dung bài học                              | ❌       | Port — đợt 4            | Không có snapshot/restore cho `lessons.description`.                                                                                                                                |
| Soạn thảo cộng tác realtime (Yjs)                               | ❌       | Port — đợt 4            | mentingo có Socket.IO + Redis adapter sẵn (`apps/api/src/websocket/`) — hạ tầng transport đã có, chỉ thiếu tầng CRDT.                                                               |
| Slash-command trong editor                                      | ❌       | Port — quick win        | `apps/web/app/components/RichText/` chỉ có toolbar, không có menu gõ `/`.                                                                                                           |
| Block trang trí (callout, flipcard, badge, button, web-preview) | ❌       | Port — quick win        | Rẻ: thêm TipTap node extension theo mẫu `video.tsx`/`presentation.tsx` đã có.                                                                                                       |
| Thư mục phân cấp + nội dung đa hình                             | ◐        | Port — đợt 5            | `resource-library/` hiện phẳng, không cây, không chứa course/podcast/board.                                                                                                         |
| Khóa nội dung theo nhóm ở mức bài học                           | ◐        | Thích ứng               | mentingo có `is_freemium` ở mức chương; chưa gate theo group ở mức bài đơn lẻ.                                                                                                      |
| Vai trò đồng tác giả (contributor/maintainer)                   | ◐        | Thích ứng — đợt 7       | mentingo chỉ có `authorId` đơn trên course.                                                                                                                                         |
| Export/import khóa học                                          | ✅       | —                       | mentingo có master-course sync xuyên tenant — vượt trội hơn LearnHouse (LearnHouse chỉ export/import zip đơn lẻ).                                                                   |
| SCORM                                                           | ✅       | —                       | mentingo có SCORM ở bản OSS; LearnHouse để SCORM trong EE (không mở, không được tham khảo).                                                                                         |
| AI hỗ trợ di trú nội dung (dump file → gợi ý cấu trúc khóa)     | ❌       | Bỏ qua (chưa cấp thiết) | Có thể cân nhắc lại khi mentingo cần nhập dữ liệu hàng loạt từ nguồn ngoài.                                                                                                         |

## Nhóm quiz / đánh giá

| Tính năng LearnHouse                     | mentingo | Phán quyết          | Ghi chú                                                                                                                                                                                             |
| ---------------------------------------- | -------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code playground 30 ngôn ngữ (Judge0)     | ❌       | **Bỏ qua**          | Không liên quan mô hình đào tạo cờ vua; chi phí vận hành Judge0 không hợp lý cho nhu cầu hiện tại.                                                                                                  |
| Chấm bài tự luận có tolerance/match-mode | ◐        | Thích ứng qua đợt 1 | mentingo đã có `brief_response`/`detailed_response` + AI judge (mạnh hơn LearnHouse — LearnHouse chỉ so khớp chuỗi, mentingo có AI chấm ngữ nghĩa qua `apps/api/src/ai/services/judge.service.ts`). |
| Quiz câu hỏi cờ vua (FEN/UCI)            | ✅       | —                   | Không có ở LearnHouse. Điểm mạnh riêng của mentingo.                                                                                                                                                |

## Nhóm AI

| Tính năng LearnHouse                          | mentingo | Phán quyết                                       | Ghi chú                                                                       |
| --------------------------------------------- | -------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Sinh quiz bằng AI                             | ❌       | Port — đợt 6                                     |                                                                               |
| Sinh bài tập bằng AI                          | ❌       | Port — đợt 6 (sau khi Assignment engine tồn tại) |                                                                               |
| Sinh ảnh minh họa bằng AI                     | ❌       | Bỏ qua (chưa cấp thiết)                          |                                                                               |
| Auto-caption video bằng AI                    | ❌       | Port — đợt 6                                     |                                                                               |
| Nhật ký lượt sinh AI + đo hạn mức theo tenant | ❌       | Port — đợt 6                                     | Cần khi mở nhiều tính năng AI sinh nội dung để kiểm soát chi phí theo tenant. |
| AI mentor (chat + voice, chấm bằng AI judge)  | ✅       | —                                                | Không có ở LearnHouse OSS. Điểm mạnh riêng lớn nhất của mentingo.             |
| RAG trên nội dung khóa học                    | ✅       | —                                                | Cả hai đều có (pgvector), mức độ tương đương.                                 |

## Nhóm cộng đồng / xã hội

| Tính năng LearnHouse                             | mentingo | Phán quyết                | Ghi chú                                                                                  |
| ------------------------------------------------ | -------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| Community/Discussion độc lập + vote + kiểm duyệt | ◐        | Port — đợt 3              | mentingo chỉ có chat trong khóa + Q&A rời rạc, không có không gian cộng đồng đứng riêng. |
| Hồ sơ người dùng công khai                       | ❌       | Port — đợt 3              |                                                                                          |
| Board (bảng trắng cộng tác)                      | ❌       | Port — đợt 5              | Giá trị riêng cho trường cờ: bàn phân tích chung nhiều người xem.                        |
| Playground (HTML tương tác do AI sinh)           | ❌       | Bỏ qua (chưa cấp thiết)   |                                                                                          |
| Podcast + RSS công khai                          | ❌       | Bỏ qua (chờ nhu cầu thực) |                                                                                          |

## Nhóm chứng chỉ / tin cậy

| Tính năng LearnHouse               | mentingo | Phán quyết            | Ghi chú                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Trang xác thực chứng chỉ công khai | ◐        | Thích ứng — quick win | **Sửa lại (2026-07-25):** mentingo đã có sẵn `GET /api/certificates/share` (`@Public()`) — server-render HTML kèm OG/Twitter meta, ảnh PNG cache S3, LinkedIn, dịch 7 ngôn ngữ. Chỉ thiếu mã QR và khung "xác minh" (trang hiện đang `noindex,noarchive`). Xem `docs/specs/statistics-and-certificate-fixes-business-spec.md`. |
| Mã QR trên chứng chỉ               | ❌       | Port — quick win      | Cùng đợt với trang verify.                                                                                                                                                                                                                                                                                                     |
| Cấp chứng chỉ theo learning path   | ✅       | —                     | mentingo có, LearnHouse không có khái niệm learning path.                                                                                                                                                                                                                                                                      |

## Nhóm marketing / khám phá

| Tính năng LearnHouse                                             | mentingo | Phán quyết   | Ghi chú                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SEO metadata / OG / Twitter Card / JSON-LD                       | ❌       | Port — đợt 2 | mentingo là Remix SPA (`ssr: false`), không có metadata động.                                                                                                                                                |
| Sitemap / robots.txt                                             | ❌       | Port — đợt 2 |                                                                                                                                                                                                              |
| Analytics sâu (funnel, dropoff, cohort retention, peak hours...) | ◐        | Port — đợt 2 | mentingo có `statistics/`, `analytics/` cơ bản; thiếu 48 loại truy vấn hành vi mà LearnHouse có qua Tinybird/ClickHouse (mentingo sẽ triển khai bằng truy vấn Drizzle trực tiếp, không cần thêm ClickHouse). |
| Tìm kiếm hợp nhất đa loại tài nguyên                             | ✅       | —            | mentingo có tsvector `search_documents`.                                                                                                                                                                     |

## Nhóm tự động hóa / tích hợp

| Tính năng LearnHouse                  | mentingo | Phán quyết   | Ghi chú                                                                                               |
| ------------------------------------- | -------- | ------------ | ----------------------------------------------------------------------------------------------------- |
| Webhook đi ra ngoài (custom + Zapier) | ❌       | Port — đợt 6 | mentingo chỉ nhận webhook vào (Stripe/LiveKit/Bunny); outbox nội bộ đã có, nền tảng tốt để dựng thêm. |
| API token với ma trận quyền           | ✅       | —            | mentingo có `integration_api_keys` + permission matrix.                                               |

## Nhóm vận hành / tuân thủ

| Tính năng LearnHouse                                          | mentingo | Phán quyết       | Ghi chú                                                                                                      |
| ------------------------------------------------------------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Captcha, chặn email tạm, khóa tài khoản sau N lần sai         | ❌       | Port — quick win | mentingo có throttler + MFA nhưng thiếu 3 lớp phòng thủ này.                                                 |
| GDPR export / anonymize người dùng                            | ❌       | Port — đợt 7     |                                                                                                              |
| Custom domain tự phục vụ (xác thực TXT/CNAME, trạng thái SSL) | ◐        | Port — đợt 7     | `tenants.host` hiện đặt thủ công.                                                                            |
| Landing page builder / menu builder / custom script injection | ◐        | Port — đợt 7     | Branding hiện có màu/logo, thiếu 3 cái này.                                                                  |
| RBAC / permission matrix                                      | ✅       | —                | mentingo mạnh hơn: ~90 permission key + rule set nhiều lớp.                                                  |
| Multi-tenancy                                                 | ✅       | —                | mentingo dùng Postgres RLS — cô lập dữ liệu ở tầng DB, mạnh hơn kiểm tra ở tầng ứng dụng của LearnHouse OSS. |
| Auth (OAuth, SSO, magic link, MFA)                            | ✅       | —                | mentingo có đủ và thêm MFA bắt buộc theo role.                                                               |
| Audit log                                                     | ✅       | —                | `activity_logs` đã có.                                                                                       |
| Thanh toán                                                    | ✅       | —                | Stripe + promotion codes; mô hình offer→usergroup của LearnHouse (thuộc EE) không cần thiết.                 |

## Tổng kết ưu tiên (đối chiếu roadmap)

1. **Assignment engine** — khoảng trống lớn nhất, giá trị nghiệp vụ cao nhất, đã có prototype trong repo này.
2. **Quick wins** (verify chứng chỉ + QR, block trang trí editor, slash-command, 3 lớp bảo mật tài khoản) — công sức thấp, có thể xen kẽ.
3. **Analytics + SEO** — giá trị marketing trực tiếp cho tuyển sinh.
4. **Cộng đồng + hồ sơ công khai** — xây gắn kết cộng đồng học cờ.
5. **Version history + cộng tác realtime** — hạ tầng dùng chung cho đợt 5 (Board).
6. **Thư viện phân cấp + Board** — tận dụng hạ tầng Yjs từ đợt 4.
7. **Tự động hóa + AI nâng cao** — dựng trên outbox đã có.
8. **Vận hành & tuân thủ** — hoàn thiện khi hệ thống có nhiều tenant/khách hàng hơn.

Chi tiết từng đợt: xem [05-roadmap.md](./05-roadmap.md).
