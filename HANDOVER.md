# HANDOVER — covuahocduong.com (Chess on Mentingo)

**Ngày:** 2026-07-26 (cập nhật)
**Nền tảng:** monorepo Mentingo LMS + module cờ vua (MIT-only)
**Domain mục tiêu:** `covuahocduong.com`
**Trạng thái:** W1–W4 (module cờ) + đợt phát triển LMS-core PR1–PR5 (xem mục 0 dưới) đều đã **merged vào `main`**.

---

## -2. Cập nhật mới nhất (2026-07-26) — Đợt "còn thiếu so với LearnHouse", tự động triển khai liên tục

Sau khi khảo sát lại **toàn bộ** LearnHouse (backend `apps/api` ~30 router/53 bảng, frontend `apps/web`/`apps/collab`/`apps/cli`/`apps/e2e`, trừ `ee/`) và đối chiếu kỹ với mã nguồn mentingo hiện tại, đã cập nhật lại `docs/research/learnhouse/03-feature-matrix.md` + `05-roadmap.md` với danh sách 10 đợt còn lại (kế hoạch chi tiết đã duyệt, lưu tại `C:\Users\duongsinh\.claude\plans\sau-khi-kh-o-s-t-cozy-wave.md` phía máy dev). Theo yêu cầu của user, mỗi đợt tự động verify rồi commit + push + tạo PR + merge vào `main`, không dừng lại hỏi giữa chừng.

| Đợt             | PR               | Nội dung                                                                                                                                                                                                                                                                                                                                              |
| --------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Đợt 1** (#9)  | merged           | 5 block editor mới (`callout,flipcard,badge,buttonLink,webPreview`), menu `/` slash-command + nút "+" toolbar dùng chung registry, gạch chân/căn lề, endpoint `GET /api/link-preview` có SSRF guard 2 lớp + cache Redis. Spec: `docs/specs/rich-text-blocks-business-spec.md`.                                                                        |
| **Đợt 2** (#10) | merged           | Hoàn thiện Assignment engine: wire 3 field đã có schema/API nhưng chưa lên UI (hint, reference file, anti-copy-paste), reject bài nộp, summary chấm điểm, cron nhắc hạn nộp, trang chấm nâng cấp (search/filter/sort/quick-grade). Spec: addendum trong `docs/specs/assignment-engine-business-spec.md`.                                              |
| **Đợt 3** (#11) | merged           | Bảo mật tài khoản: khóa đăng nhập tạm thời sau N lần sai (ngưỡng/thời lượng cấu hình được), captcha Cloudflare Turnstile tùy chọn cho `/auth/register` + `/auth/login` (tự tắt khi thiếu env, không breaking change). Đo độ mạnh mật khẩu đã có sẵn từ trước — không cần làm gì thêm. Spec: `docs/specs/account-security-hardening-business-spec.md`. |
| **Đợt 4** (#12) | merged           | Lịch sử phiên bản nội dung bài học: snapshot title/description mỗi lần lưu bài học loại content (tối đa 20 bản, xóa bản cũ nhất khi vượt), panel xem lịch sử + xem trước read-only + khôi phục, cảnh báo xung đột chỉnh sửa đồng thời (optimistic locking qua `updatedAt`). Spec: `docs/specs/lesson-content-versioning-business-spec.md`.            |
| **Đợt 5**       | _(xem mục dưới)_ | Analytics sâu phần 2 (org-level): DAU trend, mới-vs-quay-lại, cohort retention theo tuần, hoạt động theo ngày trong tuần (thay heatmap giờ — không khả thi), phân bố điểm quiz/bài tập, tỉ lệ cấp chứng chỉ, điểm gắn kết 3 thành phần, xuất XLSX nâng cao. Spec: `docs/specs/deep-analytics-phase2-business-spec.md`.                                |

**Đợt 2 — chi tiết:** khảo sát trước khi code phát hiện `assignment_tasks.hint`, `assignment_tasks.referenceFileS3Key`, `assignments.antiCopyPaste` đã tồn tại đầy đủ trong schema + TypeBox API contract nhưng **chưa từng được đưa lên UI** (authoring form không có ô nhập, learner view không hiển thị) — thu hẹp phạm vi đợt 2 thành "wire lên" 3 field đó thay vì coi là việc mới. Ngoài ra thêm: `PATCH /assignments/task-submissions/:id/reject` (reset submission, không đụng `attemptNumber`), `GET /assignments/:id/summary` (status breakdown/điểm TB/tỉ lệ đạt), cron `AssignmentsCron` (9h sáng hàng ngày, theo đúng pattern `CourseCron`/`CourseDueDateReminderEmailHandler` — outbox event → handler riêng gửi mail + tạo announcement). **Lưu ý kỹ thuật quan trọng**: `packages/email-templates/src/index.ts` là **file auto-generated** bởi `packages/email-templates/plugin.mjs` (chạy lúc `tsup build`) — sửa tay sẽ bị ghi đè ở lần build sau; phải sửa `plugin.mjs` rồi build lại. Tương tự, mọi lần thêm/sửa endpoint API cần **build lại `@repo/shared` và `@repo/email-templates`** (`pnpm --filter=@repo/shared build && pnpm --filter=@repo/email-templates build`) trước khi `tsc` của `apps/api` thấy được type mới, và cần **khởi động tạm API bằng Node 22** rồi `pnpm run generate:client` để đồng bộ `apps/web/app/api/generated-api.ts` sau mỗi lần đổi contract (xem mục rủi ro Node 25 bên dưới — export schema chạy trước `app.listen()` nên vẫn lấy được file dù cổng 3000 bị chiếm).

Task còn deferred ở Đợt 2 (ghi rõ trong spec, không phải thiếu sót): 2 loại task mới (quiz trắc nghiệm điểm từng phần, form điền chỗ trống) và autosave bài làm học viên — cả hai đủ lớn để tách đợt riêng nếu cần.

**Đợt 3 — chi tiết:** thêm 2 cột `failedLoginAttempts`/`lockedUntil` trên `users` (migration `0170_add_login_lockout_fields.sql`); `AuthService.validateUser` kiểm tra khóa trước khi so mật khẩu, tăng bộ đếm khi sai, khóa khi chạm ngưỡng (`maxFailedLoginAttempts`/`lockoutMinutes` mới trong `globalSettingsJSONSchema`, mặc định 5 lần / 15 phút), reset khi đăng nhập thành công — **luôn trả về đúng một thông báo lỗi chung** dù là sai mật khẩu hay đang bị khóa, để không lộ thông tin tài khoản. Turnstile theo đúng mẫu "config tùy chọn tự tắt" của Google/Slack/Microsoft OAuth (`apps/api/src/common/configuration/turnstile.ts` + `hasTurnstileConfig`), `TurnstileGuard` mới áp cho route `register`/`login`, site key phơi qua `GET /api/env/frontend/turnstile` (`@Public()`), frontend có `useTurnstileSiteKey()` + `TurnstileWidget` (tải script Cloudflare động, chỉ khi có site key). Test mới: `auth.service.lockout.spec.ts` (6 test) + `turnstile.guard.spec.ts` (5 test), cả hai chạy Jest với **Node 22** (Node 25 vỡ do `buffer-equal-constant-time`/`jsonwebtoken`, xem mục rủi ro Node bên dưới).

**Đợt 4 — chi tiết:** bảng mới `lesson_content_versions` (migration `0171_add_lesson_content_versions.sql` + `0172_enable_lesson_content_versions_rls.sql`, theo đúng mẫu RLS `chess_exercises`/`0163`) lưu `lessonId`, `language`, `versionNumber` (tăng dần theo `MAX+1` trong cùng bảng), `title`/`description` dạng `text` (không phải jsonb — snapshot giá trị đã localize cho đúng 1 ngôn ngữ tại thời điểm lưu), `createdBy`. Hook vào `AdminLessonService.updateLesson`: **trước khi ghi đè**, nếu lesson là loại `content` và `description` mới khác `description` cũ, snapshot nội dung **cũ** (không phải mới) rồi prune về tối đa 20 bản. Khôi phục (`restoreLessonContentVersion`) tái sử dụng chính `updateLesson` với `forceOverwrite: true` — nên bản thân việc khôi phục cũng tự động được snapshot lại (khôi phục nhầm vẫn hoàn tác được). Xung đột chỉnh sửa đồng thời: `updateLesson` nhận thêm `expectedUpdatedAt`/`forceOverwrite`, so khớp với `lessons.updatedAt` hiện tại trong DB, ném `ConflictException` (409) nếu khác và không force — frontend bắt lỗi 409 và hỏi xác nhận lưu đè qua `window.confirm`. 3 endpoint mới đều dùng lại đúng permission gate (`COURSE_UPDATE`/`COURSE_UPDATE_OWN`) và `validateAccess` sẵn có của `updateLesson` — không thêm permission mới. Test mới: `lessonContentVersions.repository.spec.ts` (5 test, Jest Node 22).

**Đợt 5 — chi tiết:** khảo sát trước khi code phát hiện `user_statistics.activityHistory` (jsonb `{"yyyy-MM-dd": true}`, dùng cho tính năng streak sẵn có) đã đủ dữ liệu để tính DAU trend/mới-vs-quay-lại/hoạt động theo ngày trong tuần **mà không cần pipeline sự kiện mới** — nhưng **không đủ** để làm bản đồ nhiệt theo giờ (chỉ có độ phân giải theo ngày), nên mục đó bị loại khỏi phạm vi và thay bằng "hoạt động theo ngày trong tuần". Truy vấn mới dùng `db.execute(sql\`...\`)`với`jsonb_each_text`/`generate_series`/`date_trunc('week', ...)`(theo đúng pattern raw-SQL sẵn có trong`statistics.repository.ts`) vì Drizzle query builder không hỗ trợ trực tiếp "mở" object jsonb thành hàng. 7 endpoint mới `GET /api/analytics/org/\*` (`AnalyticsRepository`/`AnalyticsService`mở rộng, controller mới`OrgAnalyticsController`— tách khỏi`AnalyticsController`hiện có vì controller đó dùng`AnalyticsSecretGuard`cho endpoint`active-users`công khai, không phù hợp cho các endpoint admin-UI cần permission`STATISTICS_READ`). Xuất XLSX nâng cao dùng `write-excel-file` nhiều sheet (`objects: Object[][]`+`schema: Schema[]`+`sheets: string[]`) ngay trong `AnalyticsService`, không phụ thuộc `ReportModule`. Test mới: `analytics.service.spec.ts` (8 test, Jest Node 22).

**Việc cần làm tiếp:** verify + commit + push + tạo PR + merge Đợt 5, rồi tiếp tục Đợt 6 (AI đợt 2: sinh quiz/bài tập bằng AI, Ask-AI trên bài học, hạn mức AI theo tenant) theo đúng `docs/research/learnhouse/05-roadmap.md`.

---

## 0. Cập nhật mới nhất (2026-07-26) — LMS-core: Assignment / Chứng chỉ / Analytics / SEO (PR1–PR5)

Khảo sát LearnHouse (clean-room, xem `docs/research/learnhouse/`) → lên kế hoạch → triển khai tuần tự 5 PR, mỗi PR tự động verify (tsc + eslint sạch, full test suite) rồi commit/push/tạo PR/merge vào `main` không dừng lại hỏi giữa chừng (theo yêu cầu tự động hóa của user). Cả 5 PR đã merge, không còn PR nào đang mở.

| PR           | Nội dung                                                                                                                                                                                                                                                                                                                                  | Merge commit |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **PR1** (#3) | Sửa bug thống kê (biểu đồ quiz hardcode, cron không ghi `course_students_stats`, gom nhóm tháng bị đè năm) + vá lỗ hổng IDOR chứng chỉ (thêm `share_token`, tra theo token thay UUID)                                                                                                                                                     | `8ca4f2bb`   |
| **PR2** (#4) | Hoàn thiện Assignment engine: sửa được bài đã tạo (trước bấm vào ra màn hình trống), bàn cờ thật thay ô text, upload file nộp bài, trang chấm bài mới, tự thu hồi chứng chỉ khi chấm lại dưới ngưỡng, đồng bộ với hệ thống lesson chung                                                                                                   | `2221a72c`   |
| **PR3** (#5) | QR code chứng chỉ trỏ trang xác minh công khai (hiển thị còn hiệu lực/hết hạn/đã thu hồi) + vá lại đúng lỗ hổng IDOR như PR1 nhưng cho **learning-path certificates** (bị bỏ sót ở PR1)                                                                                                                                                   | `1052db8e`   |
| **PR4** (#6) | 4 báo cáo phân tích sâu theo khóa học (`apps/api/src/analytics/`): phễu hoàn thành bài học, tỷ lệ rơi rụng theo chương (so với chương trước, không phải tổng đăng ký), tốc độ hoàn thành (avg/median + histogram theo khoảng ngày), top 10 học viên theo thời gian học. Hiện ở khối "Deep analytics" trong tab Thống kê của từng khóa học | `14c069ee`   |
| **PR5** (#7) | SEO Tier 1 — không SSR: `robots.txt`/`sitemap.xml` sinh động theo tenant (`apps/api/src/seo/`), trang preview OG/JSON-LD cho bot mạng xã hội khi bot vào `/course/*` (Caddy định tuyến theo User-Agent sang API — "dynamic rendering", không phải SSR thật), thêm `<title>` thật cho `CourseView.page.tsx`                                | `68e7dbd7`   |

**Sửa kèm ngoài kế hoạch (phát hiện khi làm PR5):**

- Thêm nút **Sửa** (trước đây thiếu hoàn toàn) cho `/admin/chess/exercises` (Ngân hàng bài tập cờ vua) — backend đã hỗ trợ `PATCH` đầy đủ từ trước, chỉ là UI chưa từng làm nút Sửa, chỉ có Publish/Xóa. **Chưa merge/PR** — đang ở working tree, chưa commit.
- Vá bug off-by-one trong bảng `drizzle.__drizzle_migrations`: `migrate()` của drizzle-orm chỉ so `MAX(created_at)` toàn bảng, không so hash từng dòng — dòng tracking chèn tay bị lệch `created_at` sang timestamp của migration liền trước khiến API crash lúc boot (`column ... already exists`). Đã sửa `created_at`/`hash` cho 2 dòng bị lệch (id 168, 169) trực tiếp trên DB dev. **Đây là lỗi ở data, không phải code — không cần sửa gì trong repo, nhưng nếu gặp lại crash boot kiểu này ở máy khác, kiểm tra lệch `created_at` theo cách này trước.**

**Ghi chú môi trường quan trọng cho phiên sau:**

- Node **22.15.0** bắt buộc (Node 25 crash JWT) — luôn `export PATH="$HOME/AppData/Roaming/fnm/node-versions/v22.15.0/installation:$PATH"` trước khi chạy pnpm/git hook.
- `drizzle-kit migrate` treo vô hạn trên Git Bash/Windows — áp SQL tay qua `docker exec -i <db> psql`, tự chèn dòng `__drizzle_migrations` (nhớ đúng cả `hash` lẫn `created_at` lấy từ `meta/_journal.json`, xem lỗi off-by-one ở trên).
- Reverse-proxy local dev: `apps/reverse-proxy/Caddyfile`, chạy bằng `caddy run --config Caddyfile` (đã cài sẵn `caddy v2.11.4`). Vào app qua **`https://tenant1.lms.localhost`** (không phải `localhost:5173` trực tiếp — gọi API sẽ lỗi 401 "Missing tenantId" vì thiếu Host khớp tenant trong DB).
- Cẩn thận tích tụ tiến trình: mỗi lần restart `pnpm run dev` (API) qua background bash mà không kill sạch tiến trình cũ, `nest start --watch` cũ vẫn sống ngầm và ăn CPU rất nặng (từng có lúc 6 bản chạy song song làm mọi lệnh `tsc`/`eslint` chậm gấp 10 lần). Trước khi start lại, luôn kiểm tra `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*nest start*' }` và kill hết trước.
- Docker Desktop từng tự tắt giữa phiên (không rõ nguyên nhân, đã gặp 2 lần ở 2 ngày khác nhau) — nếu API báo `ECONNREFUSED 127.0.0.1:6379` (Redis), kiểm tra `docker ps` trước, khởi động lại Docker Desktop nếu cần.

**Việc cần làm tiếp (phiên sau bắt đầu từ đây):**

1. Commit + push + tạo PR + merge tính năng nút Sửa `/admin/chess/exercises` (đã code xong, tsc + eslint sạch, chỉ chưa commit — xem mục "Sửa kèm ngoài kế hoạch" ở trên).
2. Không có PR nào khác đang dở — có thể hỏi user muốn triển khai tiếp hạng mục nào (kế hoạch gốc PR1–PR5 đã xong toàn bộ).
3. Dev server hiện đang chạy nền lúc kết thúc phiên này: API (`:3000`), web (`:5173`), Caddy (`:443`), Docker (Postgres/Redis/MinIO) — nếu phiên sau không thấy chúng nữa (máy đã tắt/reboot) thì cần khởi động lại theo đúng thứ tự: Docker → API → web → Caddy.

---

## 0.1 Cập nhật trước đó (2026-07-25) — hoàn thiện 4 hạng mục còn lại (module cờ)

Bốn hạng mục "việc tiếp theo" đã được triển khai xong, verify (tsc + eslint sạch; pre-push hook: **web 202 passed, API 264 passed**) và merge vào `main`:

- **W1 — Lưu ván chơi với máy:** bảng `chess_play_sessions` (RLS), migrations `0164`/`0165`, endpoint `POST/GET /chess/play-sessions`. UI: đồng hồ cờ client-side (5+0 / 10+0 / 15+10), nút **Resign** có xác nhận, tự động phát hiện checkmate/stalemate/insufficient-material/threefold/fifty-move, panel **lịch sử ván** với xem lại từng nước. (Bỏ nút "claim draw" thủ công vì `chess.js` đã tự động hóa mọi điều kiện hòa.)
- **W2 — Chuẩn hóa API client:** xóa `chess-api.ts` hand-rolled; toàn bộ 15 hook cũ + 2 hook mới (`useChessPlaySessions`, `useCreateChessPlaySession`) chạy qua generated swagger client `ApiClient.api.*`.
- **W3 — Tiếng Việt + branding:** thêm `vi` vào `SUPPORTED_LANGUAGES` (i18n, cờ VN, date-fns, `vi/translation.json` đầy đủ 3237 key, parity 100%, + `vi` trong mọi `Record<SupportedLanguages,...>` của API/web). Màu thương hiệu chess tenant → navy `#2B3990`; logo Dương Sinh trong `apps/web/public/brand/`.
- **W4 — E2E:** `data-testid` cho các trang Chess + bàn cờ; factory/handles/flows/specs cho practice, play-vs-engine, admin exercise bank (theo pattern `categories`).
- **Sửa kèm:** route toàn bộ 9 zustand persist store qua `apps/web/app/lib/stores/safeStorage.ts` (chống lỗi `storage.setItem is not a function` khi jsdom teardown giữa test — không đổi hành vi browser).

**Còn 1 bước thủ công:** upload logo `apps/web/public/brand/logo-horizontal-navy.svg` qua **Settings → Branding** trên admin UI (logo platform lưu dạng S3 key, không seed tự động được).

**Lưu ý dev:** branding navy chỉ áp khi **seed mới** — DB dev hiện có (`guidebook`) vẫn giữ màu cũ cho tới khi đổi qua admin UI hoặc re-seed.

---

## 1. Đã làm (tóm tắt)

### Sản phẩm / domain cờ

- Website học–dạy cờ trên Mentingo: **học sinh + phụ huynh** và **giáo viên/HLV**.
- Taxonomy đa chủ đề (không chỉ tactics): nhập môn, luật, thi đấu, khai/trung/tàn, chiến thuật/lược, story, tâm lý, sư phạm…
- **Ngân hàng bài tập** + **ngân hàng ván cờ** (API, admin UI, seed demo).
- **Practice hub** + **Game library** (học sinh).
- **Quiz cờ** trong khóa học: `chess_find_best`, `chess_move_line` (FEN + UCI), chấm điểm + feedback đúng/sai sau Submit.
- **Bàn cờ SVG Staunton** (in-repo, MIT) — thay Unicode.
- **Engine MIT:** Arasan (UCI) + fallback builtin minimax nếu không có binary.
- Trang **Play engine** (`/chess/play`) và **Analysis** (`/chess/analysis`).

### Kỹ thuật chính

| Khu vực     | Nội dung                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Shared      | `packages/shared/src/constants/chess.ts` — topics, allowlist MIT, engine levels                           |
| Permissions | `chess.exercise.*`, `chess.game.*` (backfill khi API start)                                               |
| API         | `apps/api/src/chess/` — exercises, games, attempts, engine (Arasan UCI)                                   |
| Web         | `apps/web/app/modules/Chess/` — board, admin banks, practice, play, analysis                              |
| Client HTTP | `apps/web/app/api/chess-api.ts` (axios qua `ApiClient.instance`; chưa bắt buộc regenerate swagger client) |
| DB          | Migrations `0162_chess_exercise_game_banks`, `0163_enable_chess_tenant_rls`                               |
| Specs       | `docs/specs/chess-*-business-spec.md`, `chess-engine-arasan-business-spec.md`                             |
| Seed        | `apps/api/src/seed/seed-chess-data.ts`, `seed-chess-only.ts`                                              |

### Bug đã xử lý giữa chừng

- Login 500 khi API down → layout/`useCompanyInformation` không crash public shell.
- Practice empty + toast permission → query `publishedOnly` boolean string; re-login sau backfill permission.
- RLS thiếu trên bảng chess → migration 0163.
- Quiz đi đúng vẫn “missing questions” → Zod strip `chessResponses` → thêm vào schema.
- Quiz không hiện đúng/sai → feedback UI trên `ChessMoveQuestion`.
- Engine 404 → API chưa rebuild/restart; `Cannot POST /api/chess/engine/*`.
- Arasan: dùng **`arasanx-64.exe`** (UCI), không dùng `arasan-64.exe` (GUI).

---

## 2. Cấu hình quan trọng

### Env API

**File:** `apps/api/.env`

```env
ARASAN_PATH="C:\Program Files\Arasan\26.0\arasanx-64.exe"
```

- Binary UCI: `arasanx-64.exe` (cùng folder cài Arasan 26.0).
- Không set `ARASAN_PATH` → fallback engine builtin (MIT, yếu hơn, đủ demo).
- Sau khi sửa env: **restart API** (Node **22**, tránh Node 25 với JWT/SlowBuffer).

### Routes web

| URL                      | Mô tả                     |
| ------------------------ | ------------------------- |
| `/chess/practice`        | Luyện bài từ bank         |
| `/chess/practice/:id`    | Giải 1 bài                |
| `/chess/games`           | Thư viện ván              |
| `/chess/games/:id`       | Xem PGN                   |
| `/chess/play`            | Chơi máy (Arasan/builtin) |
| `/chess/analysis`        | Phân tích thế cờ          |
| `/admin/chess/exercises` | Admin bank bài tập        |
| `/admin/chess/games`     | Admin bank ván            |

### API engine

- `GET /api/chess/engine/status`
- `POST /api/chess/engine/bestmove`
- `POST /api/chess/engine/analyze`

---

## 3. Lệnh hữu ích

```bash
# Node 22 (khuyến nghị)
fnm use 22.15.0

pnpm --filter @repo/shared build
pnpm --filter=api db:migrate
pnpm --filter=api exec tsx ./src/seed/seed-chess-only.ts   # seed bank nếu trống

# Dev
pnpm dev
# hoặc API: nest build + node dist/src/main.js (cwd apps/api, load .env)
```

Login seed thường: `admin+tenant1@example.com` / `password` (tenant `tenant1.lms.localhost`).

---

## 4. Việc tiếp theo (gợi ý ưu tiên)

**Đã xong (2026-07-25):** ✅ Lưu ván chơi + clock + resign/draw UI · ✅ chuẩn hóa API client (bỏ `chess-api.ts`) · ✅ E2E Playwright (practice/play/admin) · ✅ branding “Cờ Vua Học Đường” + i18n vi đầy đủ.

Còn lại:

1. **Nội dung sản phẩm**

   - Soạn 1–2 khóa demo HS + GV (video/text + quiz cờ + embed PGN).
   - Mở rộng bank (luật, sư phạm, tactics…) và learning paths theo khối lớp.

2. **Engine / UX**

   - Production: luôn cài Arasan + `ARASAN_PATH` trong deploy (Docker mount binary).
   - Gắn “thắng máy level N” vào curriculum completion (optional).
   - Chạy E2E chess trực tiếp trong CI (specs đã có, chưa chạy verify trên máy local do tải).

3. **Deploy (chuẩn bị)**

   - Upload logo navy qua admin UI (bước thủ công, xem mục 0).
   - Set `ARASAN_PATH` cho môi trường prod (nếu muốn engine mạnh; không set → builtin MIT).
   - Migrations tự chạy khi API start (`0164`/`0165` đã sẵn) — không cần thao tác tay.
   - Verify domain `covuahocduong.com` trỏ đúng tenant; i18n mặc định = `vi`.

4. **Không làm (policy)**
   - Stockfish / Chessground GPL.
   - Multiplayer realtime kiểu Lichess (chưa trong scope).

---

## 5. Rủi ro cần nhớ

| Rủi ro                         | Ghi chú                                 |
| ------------------------------ | --------------------------------------- |
| Node 25                        | JWT/`SlowBuffer` crash — dùng Node 22   |
| API không restart              | Route engine 404 / code cũ              |
| Sai binary Arasan              | GUI vs UCI (`arasanx-64`)               |
| JWT cũ sau backfill permission | Logout/login lại                        |
| `chess-api` hand-rolled        | Regenerated client khi contract ổn định |

---

## 6. File/entry points nhanh

```
packages/shared/src/constants/chess.ts          # topics, engine levels, play outcomes/end-reasons, time controls
packages/shared/src/constants/permissions.ts    # CHESS_*
packages/shared/src/constants/languages.ts       # + VI
apps/api/src/chess/                              # module chính (+ play-sessions endpoints)
apps/api/src/chess/engine/                       # Arasan + builtin
apps/api/src/storage/migrations/0164_*, 0165_*  # chess_play_sessions + RLS
apps/api/.env                                    # ARASAN_PATH
apps/web/app/modules/Chess/                      # + Play/useChessClock.ts, Play/PlaySessionsPanel.tsx
apps/web/app/api/queries|mutations/useChess*     # đã dùng generated client (chess-api.ts đã xóa)
apps/web/app/lib/stores/safeStorage.ts           # crash-safe zustand persist storage
apps/web/app/locales/vi/translation.json         # locale vi đầy đủ
apps/web/public/brand/                           # logo Dương Sinh
apps/web/e2e/{data,factories,flows,specs}/chess/ # E2E chess
docs/specs/chess-*-business-spec.md
docs/specs/chess-engine-arasan-business-spec.md
```

Hết phần handover kỹ thuật session này.
