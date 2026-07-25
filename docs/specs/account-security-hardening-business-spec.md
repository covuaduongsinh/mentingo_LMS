# Account Security Hardening Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (xem `docs/research/learnhouse/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt 3 của roadmap "còn thiếu so với LearnHouse" (`docs/research/learnhouse/05-roadmap.md`) yêu cầu 3 hạng mục bảo mật tài khoản: khóa đăng nhập sau N lần sai, captcha ở trang công khai, và đo độ mạnh mật khẩu. Khảo sát trước khi code (2026-07-26) xác nhận **đo độ mạnh mật khẩu đã tồn tại đầy đủ** ở cả hai tầng: `passwordSchema`/`validatePasswordStrength` (5 quy tắc: độ dài tối thiểu, chữ hoa, chữ thường, số, ký tự đặc biệt) validate ở cả backend (`apps/api/src/auth/schemas/password.schema.ts`) lẫn frontend (`apps/web/app/modules/Dashboard/Settings/schema/password.schema.ts`), và một thanh đo trực quan 5 vạch màu (`PasswordStrengthBars.tsx`) đã hiển thị trên trang đăng ký. **Không cần làm gì thêm cho hạng mục này** — đợt này chỉ còn 2 việc: khóa đăng nhập tạm thời, và captcha Cloudflare Turnstile.

## Who Uses It

- Người dùng cuối đăng nhập/đăng ký công khai — trải nghiệm captcha khi đăng ký/đăng nhập, và bị tạm khóa nếu nhập sai mật khẩu nhiều lần liên tiếp.
- Admin tenant — cấu hình ngưỡng khóa (số lần sai tối đa, thời gian khóa) qua Settings hiện có; bật Turnstile bằng cách set biến môi trường (không có UI bật/tắt — theo đúng mẫu "config tùy chọn tự tắt khi thiếu env" như Google/Slack/Microsoft OAuth).
- Vận hành (DevOps) — set `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` khi triển khai; nếu không set, tính năng captcha tắt hoàn toàn và hành vi đăng nhập/đăng ký giữ nguyên như trước (không có breaking change bắt buộc).

## Feature Functions

### 1. Khóa đăng nhập tạm thời sau N lần sai

- Mỗi tài khoản (`users`) có 2 trường mới: **số lần đăng nhập sai liên tiếp** (`failedLoginAttempts`, mặc định 0) và **thời điểm mở khóa** (`lockedUntil`, mặc định null).
- Đăng nhập sai (email tồn tại nhưng sai mật khẩu, **hoặc** email không tồn tại — cùng một nhánh xử lý để không lộ email nào tồn tại) làm tăng `failedLoginAttempts` thêm 1. **Chỉ tăng khi có thể xác định được user theo email** — nếu email không khớp bất kỳ tài khoản nào, không có gì để tăng (không tạo "bóng ma" đếm lần sai cho email không tồn tại).
- Khi `failedLoginAttempts` đạt tới ngưỡng cấu hình (`maxFailedLoginAttempts`, mặc định **5**), tài khoản bị khóa: `lockedUntil` được set thành thời điểm hiện tại + độ dài khóa cấu hình (`lockoutMinutes`, mặc định **15 phút**). Khóa **không tăng dần theo cấp số** ở phiên bản đầu này (một mức cố định) — giữ đơn giản, đủ dùng cho quy mô một trường học; tăng dần theo lần khóa là việc để làm sau nếu cần.
- Trong lúc bị khóa (`lockedUntil` còn ở tương lai), **mọi lần thử đăng nhập — kể cả đúng mật khẩu — đều bị từ chối** với **cùng một thông báo lỗi chung** như sai mật khẩu (`auth.error.invalidEmailOrPassword`). Đây là quyết định bảo mật cố ý: không tiết lộ rằng tài khoản đang bị khóa, để tránh việc cơ chế khóa bị lợi dụng thành kênh dò email tồn tại, và tránh kẻ tấn công biết chính xác khi nào tài khoản mở khóa lại để canh giờ tấn công tiếp.
- Đăng nhập **thành công** (đúng mật khẩu, tài khoản không bị khóa) reset `failedLoginAttempts` về 0 và `lockedUntil` về null.
- Sau khi `lockedUntil` trôi qua, lần đăng nhập tiếp theo được xử lý bình thường (không cần thao tác gì thủ công) — nếu đúng mật khẩu thì đăng nhập được và bộ đếm reset; nếu vẫn sai thì bộ đếm tăng tiếp từ đầu (không phải từ số cũ, vì đã "hết hạn khóa" được coi là một khởi đầu mới về mặt đếm).
- Hai ngưỡng (`maxFailedLoginAttempts`, `lockoutMinutes`) là cấu hình toàn tenant, thêm vào `globalSettingsJSONSchema` hiện có (JSONB — không cần migration cho phần cấu hình, chỉ cần migration cho 2 cột mới trên `users`).

### 2. Captcha Cloudflare Turnstile

- Áp dụng cho 2 endpoint công khai nhạy cảm nhất: `POST /auth/register` và `POST /auth/login` — cùng nhóm endpoint mà rate-limit hiện tại (`AUTH_PATHS_LIMIT_5_PER_MINUTE`/`AUTH_PATHS_LIMIT_10_PER_MINUTE`) đã coi là nhạy cảm.
- **Tự động tắt khi chưa cấu hình**: nếu server không có `TURNSTILE_SECRET_KEY`, toàn bộ endpoint hoạt động **y hệt như hiện tại** — không có bước xác minh captcha nào chèn vào, không có trường nào bắt buộc thêm. Đây là điểm quan trọng nhất để không phá vỡ môi trường dev/test hiện có (theo đúng mẫu Google/Slack/Microsoft OAuth: `hasRequiredEnvsConfig` quyết định tính năng có "tồn tại" hay không).
- Khi đã cấu hình: request phải kèm một `turnstileToken` (chuỗi do widget Cloudflare Turnstile phía frontend sinh ra sau khi người dùng vượt qua thử thách — thường là im lặng, không cần tương tác thủ công). Server xác minh token này với Cloudflare (gọi API `siteverify` của Cloudflare) trước khi xử lý phần còn lại của request; xác minh thất bại → từ chối request với lỗi rõ ràng "xác minh chống spam thất bại, vui lòng thử lại" (khác với lỗi sai mật khẩu — captcha thất bại không phải là thông tin nhạy cảm cần che giấu).
- Site key (public, an toàn để lộ ra frontend — đúng bản chất thiết kế của Cloudflare Turnstile) được phơi qua một endpoint mới `GET /api/env/frontend/turnstile`, `@Public()`, không cần permission — theo đúng mẫu `GET /api/env/frontend/sso` và `GET /api/env/stripe/publishable-key` đã có. Trả về `{ siteKey: string | null }`; `null` nghĩa là tính năng tắt, frontend không render widget.
- Frontend: trang đăng ký (`Register.page.tsx`) và đăng nhập (`Login.page.tsx`) gọi hook mới `useTurnstileSiteKey()`; nếu `siteKey` là `null` thì **không** render widget và không gửi `turnstileToken` — form hoạt động y hệt trước khi có tính năng này. Nếu có `siteKey`, render widget Cloudflare Turnstile (invisible/managed mode) ngay trước nút submit, và đính kèm token nhận được vào body request.

## End-User Value

Chặn tấn công dò mật khẩu tự động (brute-force) hiệu quả hơn rate-limit đơn thuần theo IP (một kẻ tấn công dùng nhiều IP vẫn bị chặn ở tầng tài khoản), và chặn bot đăng ký/đăng nhập hàng loạt mà không làm phiền người dùng thật (Turnstile ở chế độ managed thường không yêu cầu tương tác).

## How It Works

- **Migration**: thêm `failed_login_attempts` (integer, default 0) và `locked_until` (timestamptz, nullable) vào bảng `users` — migration schema chuẩn qua `drizzle-kit generate`, không phải custom migration (đây là thay đổi schema thật, không phải data migration).
- **`AuthService.validateUser`** (`auth.service.ts`): trước khi so khớp mật khẩu, kiểm tra `lockedUntil` — nếu còn ở tương lai, trả về "không hợp lệ" ngay (không chạm tới `bcrypt.compare`, tránh lộ thời gian xử lý khác biệt có thể dùng để suy luận). Sau khi so khớp mật khẩu: sai → tăng `failedLoginAttempts`, nếu chạm ngưỡng thì set `lockedUntil`; đúng → reset cả hai về 0/null.
- **Cấu hình ngưỡng**: `maxFailedLoginAttempts`, `lockoutMinutes` thêm vào `globalSettingsJSONSchema` (`apps/api/src/settings/schemas/settings.schema.ts`) + `DEFAULT_GLOBAL_SETTINGS` (`apps/api/src/settings/constants/settings.constants.ts`), giá trị mặc định 5 và 15.
- **Turnstile config tùy chọn**: `apps/api/src/common/configuration/turnstile.ts` (theo mẫu `google.ts`) validate `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` qua TypeBox; `hasTurnstileConfig` mới trong `optional-config-loader.ts` quyết định module này có được đăng ký hay không.
- **Guard xác minh**: `TurnstileGuard` mới (`apps/api/src/auth/guards/turnstile.guard.ts`) — nếu không có `TURNSTILE_SECRET_KEY` cấu hình, guard luôn cho qua (no-op, giữ hành vi cũ 100%); nếu có, đọc `turnstileToken` từ body, gọi Cloudflare `siteverify`, chặn nếu thất bại. Áp dụng qua `@UseGuards(TurnstileGuard)` trên 2 route `register`/`login`.
- **Endpoint site key**: `EnvController.getTurnstileSiteKey()` mới, theo đúng mẫu `getStripePublishableKey`.
- **Frontend**: `useTurnstileSiteKey()` hook mới (theo mẫu `useSSOEnabled`), component `TurnstileWidget` nhỏ bọc script Cloudflare (tải script `https://challenges.cloudflare.com/turnstile/v0/api.js` động, chỉ khi có site key — không tải script ngoài khi tính năng tắt).

## Non-Goals (đợt này)

- **Không** làm captcha cho `forgot-password`/`magic-link/create` — hai endpoint đó đã có rate-limit 5 req/phút và giá trị bảo vệ thêm từ captcha thấp hơn (không lộ thông tin nhạy cảm nếu bị dò).
- **Không** tăng dần thời gian khóa theo số lần bị khóa liên tiếp (exponential backoff) — một mức cố định, đơn giản, đủ dùng cho quy mô hiện tại.
- **Không** làm UI admin để bật/tắt Turnstile qua Settings — theo đúng mẫu OAuth hiện có, bật/tắt hoàn toàn qua biến môi trường lúc triển khai.
- **Không** đổi hành vi khi thiếu cấu hình Turnstile — đây là yêu cầu cứng, không phải tùy chọn, để không phá môi trường dev/test/CI hiện có.
- Không đụng tới đo độ mạnh mật khẩu — đã đầy đủ từ trước, xác nhận qua khảo sát.

## Key Technical Context

- Migration mới: `apps/api/src/storage/migrations/0170_add_login_lockout_fields.sql` (đặt tên rõ nghĩa, theo đúng mẫu `0161_add_require_password_change_field.sql`).
- `apps/api/src/auth/auth.service.ts` — `validateUser`, `login`.
- `apps/api/src/settings/schemas/settings.schema.ts`, `apps/api/src/settings/constants/settings.constants.ts`.
- `apps/api/src/common/configuration/turnstile.ts`, `apps/api/src/common/configuration/optional-config-loader.ts`.
- `apps/api/src/auth/guards/turnstile.guard.ts`, `apps/api/src/auth/auth.controller.ts` (route `register`, `login`).
- `apps/api/src/env/env.controller.ts`, `apps/api/src/env/services/env.service.ts`, `apps/api/src/env/env.schema.ts`.
- `apps/web/app/api/queries/useTurnstileSiteKey.ts` (mới), `apps/web/app/components/TurnstileWidget.tsx` (mới).
- `apps/web/app/modules/Auth/Register.page.tsx`, `apps/web/app/modules/Auth/Login.page.tsx`.

## Test Evidence

- `apps/api/src/auth/__tests__/auth.service.lockout.spec.ts` (6 test, Jest, Node 22): đăng nhập đúng không có lần sai trước → không reset gì thừa; sai mật khẩu → tăng bộ đếm + lỗi chung; chạm ngưỡng 3 lần sai (test dùng ngưỡng nhỏ để dễ kiểm) → set `lockedUntil`; đang bị khóa → từ chối với cùng thông báo, không chạm `bcrypt.compare`; đăng nhập đúng sau khi có lần sai trước đó → reset `failedLoginAttempts`/`lockedUntil`; email không tồn tại → lỗi chung, không có gì để tăng.
- `apps/api/src/auth/guards/__tests__/turnstile.guard.spec.ts` (5 test, Jest, Node 22): không cấu hình → cho qua, không gọi Cloudflare; có cấu hình nhưng thiếu token → từ chối; Cloudflare báo `success: false` → từ chối; Cloudflare báo `success: true` → cho qua; lỗi mạng khi gọi Cloudflare → từ chối (fail closed).
- `pnpm exec tsc --noEmit` sạch cho cả `apps/api` và `apps/web` (Node 22).
- `pnpm exec eslint` sạch cho toàn bộ file mới/sửa của đợt 3 (backend + frontend).
- Toàn bộ Jest suite (`apps/api`) và Vitest suite (`apps/web`) chạy lại sau khi thêm test mới — không có hồi quy.
- Kiểm tra thủ công qua đọc code (không có UI Turnstile thật để test tay do cần site key/secret key thật từ Cloudflare): không set `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` → `hasTurnstileConfig=false` → `TurnstileGuard.canActivate` trả `true` ngay dòng đầu, `EnvService.getTurnstileSiteKey()` trả `null`, frontend không render widget và không gửi `turnstileToken` — xác nhận hồi quy quan trọng nhất (đăng ký/đăng nhập không đổi hành vi) được giữ nguyên.

## Follow-up Work (đợt sau, nếu cần)

- Exponential backoff cho thời gian khóa.
- Captcha cho forgot-password/magic-link nếu có dấu hiệu bị lạm dụng thực tế.
- UI admin bật/tắt Turnstile qua Settings thay vì chỉ qua biến môi trường.
