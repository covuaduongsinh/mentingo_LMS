# HANDOVER — covuahocduong.com (Chess on Mentingo)

**Ngày:** 2026-07-24  
**Nền tảng:** monorepo Mentingo LMS + module cờ vua (MIT-only)  
**Domain mục tiêu:** `covuahocduong.com`

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

1. **Nội dung sản phẩm**

   - Soạn 1–2 khóa demo HS + GV (video/text + quiz cờ + embed PGN).
   - Mở rộng bank (luật, sư phạm, tactics…) và learning paths theo khối lớp.

2. **Engine / UX**

   - Production: luôn cài Arasan + `ARASAN_PATH` trong deploy (Docker mount binary).
   - Lưu ván chơi (`chess_play_sessions`), clock, resign/draw UI.
   - Gắn “thắng máy level N” vào curriculum completion (optional).

3. **Kỹ thuật monorepo**

   - Chạy API dev → export swagger → `pnpm generate:client` → thay `chess-api.ts` bằng generated methods nếu muốn chuẩn AGENTS.md 100%.
   - E2E Playwright: quiz cờ, practice, play engine.
   - Branding tenant “Cờ Vua Học Đường” (logo, domain, i18n vi đầy đủ).

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
packages/shared/src/constants/chess.ts
packages/shared/src/constants/permissions.ts   # CHESS_*
apps/api/src/chess/                            # module chính
apps/api/src/chess/engine/                     # Arasan + builtin
apps/api/.env                                  # ARASAN_PATH
apps/web/app/modules/Chess/
apps/web/app/api/chess-api.ts
docs/specs/chess-*-business-spec.md
docs/specs/chess-engine-arasan-business-spec.md
```

Hết phần handover kỹ thuật session này.
