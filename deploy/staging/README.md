# Deploy Staging — Mentingo LMS (Cờ Vua Học Đường) trên 1 Hetzner VPS

Bộ file này triển khai **toàn bộ** stack (web + API + Postgres + Redis + MinIO) lên **một VPS duy nhất** bằng Docker + Caddy, cho môi trường **staging/demo**. Build image **thẳng trên VPS** (không cần AWS ECR/GitHub Actions).

> Bản production đầy đủ (Hetzner + AWS ECR + CI/CD) xem [../../docs/deployment.md](../../docs/deployment.md). Đây là bản tinh gọn cho staging.

## Kiến trúc

```
Internet ──HTTPS──> Caddy (host, systemd)   staging.<domain>  (1 origin)
                      ├── /api/*  → :3000   app (NestJS: websocket, cron, workers)
                      └── /*      → :3080   frontend (nginx phục vụ SPA)
docker compose: app, frontend, db (pgvector), redis, minio (+ create-minio-bucket)
```

Một origin duy nhất → cookie auth same-origin, **không phải cấu hình CORS/SameSite phức tạp**.

## Yêu cầu VPS

- Ubuntu 22.04, **≥ 4 vCPU / 8 GB RAM** (API image có Chromium + LibreOffice + ffmpeg, nặng RAM; nên thêm 2–4 GB swap để tránh OOM khi build).
- Mở firewall inbound: **22** (SSH, giới hạn IP bạn), **80**, **443**.
- Cài Docker + Caddy: dùng script `install_packages.sh` ở [../../docs/deployment.md](../../docs/deployment.md) mục 4.1.

## Các bước (lần đầu)

### 1. Lấy code lên VPS

```bash
sudo mkdir -p /opt/mentingo && sudo chown "$USER" /opt/mentingo
git clone <repo-url> /opt/mentingo
cd /opt/mentingo
```

### 2. Tạo 2 file env

```bash
cp deploy/staging/.env.staging.api.example deploy/staging/.env.staging.api
cp deploy/staging/.env.staging.ui.example  deploy/staging/.env.staging.ui
# Sinh secret:
openssl rand -base64 32   # dùng cho MASTER_KEY
openssl rand -base64 32   # JWT_SECRET
openssl rand -base64 32   # JWT_REFRESH_SECRET
```

Sửa trong `.env.staging.api`: `CORS_ORIGIN`, `MASTER_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, SMTP (nếu cần), `S3_*`.
Sửa trong `.env.staging.ui`: `VITE_API_URL`, `VITE_APP_URL` (khớp domain).

> ⚠️ **CORS_ORIGIN** phải là origin thật (vd `https://staging.covuahocduong.com`). Seed dùng nó để tạo tenant → **đặt đúng là login khớp origin**. **Đừng** set `DEV_TENANT_ORIGINS` ở staging.

### 3. Chạy toàn bộ (build + up + migrate + seed)

```bash
chmod +x deploy/staging/deploy.sh
./deploy/staging/deploy.sh all
```

Hoặc từng bước: `deploy.sh build` → `up` → `migrate` → `seed`.

### 4. Cấu hình DNS + Caddy

- Tạo **A record** `staging.<domain>` → IP VPS, đợi propagate.
- Copy [Caddyfile](Caddyfile) → `/etc/caddy/Caddyfile` (đổi domain), rồi `sudo systemctl reload caddy`. Caddy tự cấp HTTPS.

### 5. Bước thủ công sau deploy

- Đăng nhập admin (`admin+<subdomain>@example.com` / `password`) → **Settings → Branding** → upload logo `apps/web/public/brand/logo-horizontal-navy.svg` (logo lưu dạng S3 key, không seed tự động).
- Màu navy `#2B3990` + tên "Cờ Vua Học Đường" **đã seed sẵn**, không cần chỉnh tay.

## Cập nhật code về sau

```bash
cd /opt/mentingo && git pull
./deploy/staging/deploy.sh build && ./deploy/staging/deploy.sh up
./deploy/staging/deploy.sh migrate   # nếu có migration mới
```

> Đổi bất kỳ `VITE_*` → **phải `build` lại** image web (build-time).

## Kiểm thử nhanh

```bash
./deploy/staging/deploy.sh ps                         # tất cả healthy/up
curl -I https://staging.<domain>/                     # 200 + cert hợp lệ
curl  https://staging.<domain>/api/chess/engine/status # 200, engine builtin ready
./deploy/staging/deploy.sh logs                       # không có lỗi boot (MASTER_KEY/DB/Redis)
```

Rồi mở web: đăng nhập → UI tiếng Việt + branding → `/chess/play` đánh vài nước với máy → `/chess/practice` load bank.

## Lưu ý & giới hạn đã biết

| Vấn đề                   | Chi tiết                                                                                                                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node 20 trong image**  | Dockerfile dùng `node:20-alpine` (repo khai báo Node 22). Đây là image đã proven cho container; chỉ nâng nếu build lỗi.                                                                                                                                                            |
| **Chess engine builtin** | Image API không cài Arasan → dùng minimax builtin (MIT, yếu hơn, đủ demo). Muốn mạnh: cài Arasan vào image + set `ARASAN_PATH`.                                                                                                                                                    |
| **RLS không enforce**    | Chạy runtime bằng user `postgres` (superuser, BYPASSRLS) → RLS bị bỏ qua. Chấp nhận cho demo 1 tenant. Bật RLS thật: xem dưới.                                                                                                                                                     |
| **File/MinIO**           | File phục vụ qua **presigned URL** ký theo `S3_ENDPOINT` nội bộ (`http://minio:9000`) → browser tải trực tiếp không được. Nếu cần test media/upload nhiều: mở `ports` minio trong compose, bật block `@files` trong Caddyfile, đặt endpoint công khai. Demo cờ không phụ thuộc S3. |
| **RAM khi build**        | Build 2 image + Chromium/LibreOffice ngốn RAM; thêm swap nếu OOM.                                                                                                                                                                                                                  |

### (Tùy chọn) Bật RLS đầy đủ như production

Trong `.env.staging.api` bỏ comment và đặt:

```env
SEED_MANAGE_DB_ROLE=true
MIGRATOR_DATABASE_URL="postgres://postgres:guidebook@db:5432/guidebook"
LMS_DATABASE_URL="postgres://lms_app_user:replace_with_strong_password@db:5432/guidebook"
```

`seed` sẽ tạo role `lms_app_user` (NOSUPERUSER, NOBYPASSRLS) với password `replace_with_strong_password` — đổi password khớp trong `LMS_DATABASE_URL` (hoặc `ALTER ROLE lms_app_user PASSWORD '...'` rồi cập nhật URL). Runtime dùng `LMS_DATABASE_URL`, migrate/seed dùng `MIGRATOR_DATABASE_URL`.
