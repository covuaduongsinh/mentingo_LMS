# LearnHouse — Kiến trúc hệ thống (tài liệu tham khảo, không chứa code nguồn)

> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md) trước. Tài liệu này mô tả kiến trúc bằng lời để hiểu thiết kế, không phải hướng dẫn copy code.

## Tổng quan repo

LearnHouse là monorepo, phiên bản `1.3.2` (API/web/collab), CLI `1.5.1`, gồm 4 ứng dụng:

| App           | Vai trò                           | Ngôn ngữ/Framework                         |
| ------------- | --------------------------------- | ------------------------------------------ |
| `apps/api`    | Backend REST                      | Python, FastAPI, SQLModel (SQLAlchemy)     |
| `apps/web`    | Frontend                          | Next.js 15 (App Router)                    |
| `apps/collab` | Server đồng bộ soạn thảo realtime | Node.js, Hocuspocus (giao thức Yjs)        |
| `apps/cli`    | Công cụ dựng môi trường self-host | Node.js, sinh Docker Compose theo template |

So với mentingo (pnpm + Turborepo, NestJS + Remix trong cùng một loại monorepo JS/TS), LearnHouse là **polyglot** — backend Python tách biệt hoàn toàn khỏi frontend Node.js, giao tiếp qua REST.

## Backend

**Framework:** FastAPI. Điểm vào `apps/api/app.py`, định tuyến trung tâm tại `src/router.py` (393 dòng) — một file tổng hợp include tất cả router con theo prefix, tương tự vai trò của `app.module.ts` trong NestJS nhưng dạng thủ công (không có hệ thống module/DI như Nest).

**Kiến trúc phân lớp:** router (nhận HTTP, validate) → service (nghiệp vụ) → db (SQLModel model + truy vấn). Không có tầng "repository" tách biệt rõ như mentingo — logic truy vấn thường nằm ngay trong service hoặc trong chính file model.

**ORM:** SQLModel (kết hợp Pydantic + SQLAlchemy) trên PostgreSQL, có bật extension **pgvector** cho embedding. Quy ước ID: mỗi bảng có `id` integer tăng dần làm khóa chính nội bộ **cộng thêm** một `*_uuid` string công khai (ví dụ `course_uuid`, `activity_uuid`) dùng trong URL và API — tách biệt ID lộ ra ngoài khỏi ID nội bộ. Một điểm cần lưu ý: `creation_date`/`update_date` lưu dưới dạng **chuỗi ISO**, không phải kiểu datetime gốc của DB — một lựa chọn kỹ thuật không lý tưởng, mentingo dùng `timestamp` gốc qua mixin `timestamps` trong `schema/utils.ts` là cách làm tốt hơn.

**Auth:** JWT, có access + refresh token, rotation kèm cơ chế phát hiện replay (dùng lại refresh token đã bị thu hồi = dấu hiệu bị đánh cắp) và một "grace window" ngắn để tránh false-positive khi nhiều request refresh gần như đồng thời (race do nhiều tab/request song song). Redis dùng làm blocklist logout. Có OAuth Google, và SSO qua WorkOS/OIDC (thuộc EE).

**Lưu trữ file:** hỗ trợ cả filesystem cục bộ và S3/R2-compatible, phục vụ qua một endpoint trung gian có HTTP Range support thay vì trả thẳng URL — nghĩa là storage key ngẫu nhiên không bao giờ lộ ra client, mọi truy cập đều qua kiểm tra quyền trước khi stream.

**Background jobs:** không dùng hệ thống queue chuyên dụng kiểu BullMQ; các tác vụ nền (sinh caption video, xử lý AI) chạy qua async task của FastAPI hoặc job đơn giản. mentingo với BullMQ + Redis + outbox pattern là kiến trúc bền vững hơn cho tải sản xuất.

**Chế độ triển khai:** `src/core/deployment_mode.py` định nghĩa 3 chế độ — `oss` (mã nguồn mở, không giới hạn), `ee` (Enterprise, license key), `saas` (nền tảng LearnHouse chính thức, có giới hạn theo gói). Mọi kiểm tra tính năng đều đi qua hàm này để tự động "mở khóa" khi không phải bản SaaS.

## Frontend

**Framework:** Next.js 15, App Router (`apps/web/app/...`), khác mentingo dùng Remix ở chế độ SPA (`ssr: false`) với route tree viết tay trong `routes.ts`.

**Middleware:** `apps/web/proxy.ts` (22.7 KB) — xử lý resolve tenant từ subdomain/custom domain ngay ở tầng edge, trước khi vào route handler.

**State management:** kết hợp React Context + hook riêng cho từng domain, không có một thư viện state tập trung kiểu Zustand.

**Editor:** TipTap 3 (ProseMirror) — cùng họ công nghệ với TipTap 2 mà mentingo đang dùng, nên các mẫu thiết kế node-extension có thể tham khảo trực tiếp (chỉ tham khảo cách tổ chức, không copy code — xem chính sách clean-room).

**Cộng tác realtime:** Yjs CRDT, đồng bộ qua server Hocuspocus riêng (`apps/collab`). Nội dung Board (bảng trắng) lưu thẳng dạng binary Yjs (`ydoc_state: LargeBinary`) trong Postgres.

**i18n:** có, nhưng phạm vi ngôn ngữ hẹp hơn nhiều so với 7 ngôn ngữ của mentingo (bao gồm tiếng Việt).

**Bảo mật:** cấu hình security header tập trung trong `next.config.js`.

## Nhận xét kiến trúc tổng thể

LearnHouse là một hệ thống "mở rộng dần" — nhiều tính năng (Board, Podcast, Playground, Community) được thêm như các module gần như độc lập, mỗi cái có router/service/db riêng, ít phụ thuộc chéo. Điều này giúp dễ port từng mảnh riêng lẻ (đúng với hướng "port theo hệ con" mà roadmap đề ra), nhưng cũng khiến một số quy ước không nhất quán giữa các module (ví dụ cách đặt tên timestamp, cách xử lý polymorphic resource).

mentingo có nền tảng hạ tầng (RLS multi-tenant, outbox, BullMQ, permission matrix, generated API client giữ đồng bộ contract) vững chắc hơn LearnHouse ở nhiều điểm — khi port tính năng, nên **giữ nguyên hạ tầng mentingo và chỉ vay mượn phần thiết kế nghiệp vụ** (data model, business rules) của LearnHouse, không vay mượn cách tổ chức hạ tầng của nó.
