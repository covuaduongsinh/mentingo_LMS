# Chess Learn Interactive Engine — Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org Learn, xem `docs/research/lila/09-learn-deep-teardown.md` và `docs/research/lila/00-cleanroom-policy.md`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó. Nội dung bài học (FEN, goal text tiếng Việt, targets, kịch bản) do mentingo tự soạn; không sao chép curriculum tham khảo.

**Liên quan:** nền L7 — `docs/specs/chess-learn-business-spec.md` (exact_line, coordinate trainer, practice goals). Spec này **mở rộng** Learn interactive; không thay Practice/Study.

**Triển khai theo đợt:** LEARN-1 → LEARN-6 (xem `docs/research/lila/05-roadmap.md` mục “Learn expansion”).

---

## Business Overview

Học sinh mới cần học luật cờ **bằng thao tác trên bàn**, với phản hồi tức thì và tiến độ đo được cho giáo viên. L7 đã cho exact-line (gửi nước, server so đáp án) trên ~10 stage mỏng. Interactive engine bổ sung:

1. **Nhiều mode chấm** (gom mục tiêu ô, dọn quân, điều kiện bàn cờ, kịch bản có phản hồi ảo).
2. **Điểm + sao 1–3**, lưu **best-only**.
3. **Curriculum sâu hơn**, map theo category, tùy chọn khóa tuần tự.
4. **Tích hợp lớp học / lộ trình** (aggregate %, learning path node).

Chấm điểm **luôn authoritative trên API** (replay `chess.js`). Client chỉ hiển thị; không tin `score` gửi từ trình duyệt.

---

## Who Uses It

| Vai trò                                       | Quyền                                                                          | Hành vi |
| --------------------------------------------- | ------------------------------------------------------------------------------ | ------- |
| Học sinh / trainer có `chess.learn.read`      | Học stages/levels, xem sao/tiến độ của mình, reset progress của mình (LEARN-6) |         |
| Giáo viên / admin có quyền classroom progress | Xem % Learn của học sinh trong lớp (LEARN-5)                                   |         |
| Soạn nội dung                                 | **Không** qua UI ở các đợt LEARN-1…6 — dev cập nhật constants tĩnh             |         |

Không thêm `chess.learn.manage` cho đến epic CMS.

---

## Feature Functions

### A. Curriculum tĩnh (mở rộng L7)

- Nguồn: `packages/shared` (hoặc module API-only nếu cần tách grading secrets) — **web không import mảng có đáp án**.
- Cấu trúc: `categories[] → stages[] → levels[]`.
- Stage: `id`, `categoryId`, `label`, `description`, `intro`, `complete`, `order`.
- Level: `id`, `order`, `mode`, `fen`, `playColor` (optional, default from fen), `goal`, `hint`, `optimalMoves`, `shapes[]`, mode-specific payload (xem B).
- Category keys đề xuất (mentingo-owned): `pieces`, `fundamentals`, `intermediate`, `advanced`.

### B. Level modes

#### B1. `exact_line` (đã có L7)

- Payload: `solutions: string[][]` (mỗi solution = chuỗi UCI).
- Thắng: transcript khớp một solution (helper so khớp sequence đã có).
- Multi-move UX: client cho đi nhiều nước rồi submit, hoặc submit từng nước và server trả partial (khuyến nghị: **submit full transcript** khi user bấm “Kiểm tra” hoặc khi đạt `optimalMoves` / khi board stabilises — LEARN-2 chốt: submit khi hết solution length tối thiểu hoặc user bấm kiểm tra; với 1-move giữ UX hiện tại auto-submit on move).

#### B2. `collect_targets`

- Payload: `targets: square[]` (e.g. `e7`, `c5`).
- Rules:
  - Targets chặn đường như quân địch cho mục đích pathing (implement server: khi replay, coi target còn lại là occupied bởi blocker ảo cùng màu đối phương, role pawn; khi move **đến** target: xóa target, không “ăn” quân thật).
  - Thắng khi `targets` rỗng sau chuỗi nước hợp lệ.
  - Fail nếu nước illegal theo luật cờ (trừ flag riêng).
- Điểm: `POINTS_PER_TARGET * targetsInitial + efficiencyBonus(moves, optimalMoves)`.

#### B3. `clear_side`

- Payload: `clearColor: 'b' | 'w'`, optional `detectHanging: boolean`, optional `pointsByCapture: 'flat' | 'piece_value'`.
- Thắng: không còn quân `clearColor` (trừ khi spec level nói khác).
- Nếu `detectHanging`: sau nước người học, nếu đối phương **tĩnh** có nước ăn quân người học **không được bảo vệ** → fail (server tìm capture unprotected bằng chess.js legal moves).
- Điểm: theo số capture × flat hoặc piece values (P=10,N=30,B=30,R=50,Q=90 — thang mentingo, ghi trong constants) + efficiency bonus.

#### B4. `predicate`

- Payload: `success: Rule`, optional `failure: Rule`.
- Rule DSL (JSON, whitelist only — **không** eval JS):

```text
Rule =
  | { op: "piece_on"; piece: FenChar; square: Square }
  | { op: "piece_not_on"; piece: FenChar; square: Square }
  | { op: "empty_squares"; squares: Square[] }      // không quân trên các ô
  | { op: "board_empty_of"; color: "w"|"b" }
  | { op: "in_check"; color?: "w"|"b" }
  | { op: "checkmate" }
  | { op: "stalemate" }
  | { op: "last_move_uci"; uci: string }
  | { op: "last_move_castle"; side: "K"|"Q" }
  | { op: "and"; rules: Rule[] }
  | { op: "or"; rules: Rule[] }
  | { op: "not"; rule: Rule }
```

- Sau mỗi nước (hoặc cuối transcript): nếu `failure` true → fail; nếu `success` true → complete.
- Exact_line có thể nội bộ compile sang predicate + last moves; không bắt buộc.

#### B5. `scripted`

- Payload: `steps: { actor: "player"|"opponent"; uci: string; shapes?: Shape[] }[]`.
- Client: chỉ chấp nhận nước player khớp bước hiện tại; sau đó auto-apply opponent step.
- Server: verify full transcript xen kẽ đúng `steps` (normalize UCI).
- Thắng: hết steps; fail: lệch UCI player.
- Điểm: `POINTS_PER_SCRIPT_STEP * playerSteps + efficiencyBonus`.

#### B6. Flags dùng chung (optional trên mọi mode)

| Flag               | Hành vi                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `shapes`           | Vẽ mũi tên/ô lúc load (client).                                                                                      |
| `explainPromotion` | UI gợi ý phong cấp.                                                                                                  |
| `offerIllegalMove` | LEARN-3+: cho phép nước illegal để dạy; server nhận flag attempt `illegalAttempt` — chỉ khi level bật. Mặc định off. |
| `nextButton`       | Không auto-navigate; user bấm Tiếp.                                                                                  |

### C. Scoring & stars (LEARN-1+)

Constants (mentingo-owned, có thể chỉnh trong shared constants):

- `POINTS_PER_TARGET = 50`
- `POINTS_PER_CAPTURE_FLAT = 50`
- `POINTS_PER_SCRIPT_STEP = 50`
- Efficiency bonus: `500` nếu `moves <= optimal`; `300` nếu `moves <= optimal + max(1, floor(optimal/8))`; else `100`.
- `exact_line` 1-move: base `500` + efficiency luôn 500 nếu correct → stars 3; multi-move dùng optimalMoves.
- Stars level: `3` nếu score >= maxScore; `2` nếu score >= maxScore - 200; else `1` khi complete; `0` nếu chưa complete.
- **Best-only:** cập nhật khi `newScore > bestScore` (hoặc first complete).
- `completed = bestStars >= 1`.

Server **bỏ qua** mọi `score`/`stars` client gửi; tự tính.

### D. API (mở rộng module `chess-learn`)

Giữ prefix hiện có; tên method tránh trùng swagger (bài học L7: `submitLearnAttempt`).

| Method | Path (khái niệm)                | Body / response                                                                                                                                                                                |
| ------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | stages                          | categories? + stages + levels summary (`id`, completed, bestStars) — **không** solutions                                                                                                       |
| GET    | stages/:stageId/levels/:levelId | Public level: mode, fen, goal, hint, shapes, targets (public), optimalMoves, flags — **không** solutions / script full answers nếu có thể che; với scripted/exact_line answers chỉ trên server |
| POST   | …/attempt                       | `{ movesUci: string[] }` → `{ correct, score, stars, bestScore, bestStars, failureReason? }`                                                                                                   |
| POST   | reset (LEARN-6)                 | Xóa progress user hiện tại trong tenant                                                                                                                                                        |
| GET    | classroom completion (LEARN-5)  | Aggregate % theo userIds hoặc classroomId                                                                                                                                                      |

### E. Persistence

Bảng `chess_learn_progress` (đã có): thêm

- `bestScore` int not null default 0
- `bestStars` smallint not null default 0 -- 0..3
- `bestMovesUsed` int null
- `attemptCount` int not null default 0
- `updatedAt` timestamptz

Unique `(tenantId, userId, stageId, levelId)` giữ nguyên. RLS theo mẫu migration hiện có.

### F. Frontend UX

- `/chess/learn`: group by category; stage card shows `completedLevels/total` + stars aggregate.
- `/chess/learn/:stageId/:levelId`: board multi-move; target markers; shapes overlay; feedback; stars on success.
- Stage intro/complete: optional panes (LEARN-4).
- Sequential lock (LEARN-4): nếu bật, stage N+1 locked until stage N all levels `completed`; default **off** (config constant or org setting later).

### G. Coordinate trainer high score (LEARN-6)

- Bảng hoặc reuse progress-like: `(userId, mode, orientation) → bestScore, bestAt`.
- API POST score + GET me; UI hiển thị best.

### H. Learning path (LEARN-5 optional)

- Node type tham chiếu `chess_learn_stage` + stageId; completion = stage fully completed.

---

## End-User Value

- Học sinh: học luật qua mini-game trên bàn, thấy sao/tiến độ, làm lại để 3 sao.
- Giáo viên: % nhập môn theo học sinh (LEARN-5), không cần chấm tay.
- Nhà trường: nội dung VN, MIT stack, không phụ thuộc AGPL.

---

## How It Works (happy path)

1. Học sinh mở Nhập môn → thấy 4 category.
2. Chọn stage “Xe” → intro → level 1 collect_targets (gom sao trên đường xe).
3. Kéo xe tới từng ô → client cập nhật markers → submit/auto-complete → server replay → stars.
4. Làm nốt stage → màn complete → stage “Tượng”.
5. Giáo viên mở tiến độ lớp → cột Learn 40%.

---

## Key Technical Context

- Stack: NestJS module `chess-learn`, Drizzle `chess_learn_progress`, Remix pages Learn, `ChessBoard` + `BoardShapesOverlay`, `chess.js` server+client.
- **Answer leak:** never import grading payloads into web; public DTO strip solutions.
- **Method naming:** avoid duplicate OpenAPI operation names across controllers.
- **Tenant:** mọi query progress filter tenantId.
- **Permissions:** `chess.learn.read` for all learn endpoints; classroom aggregate needs existing classroom progress permission (reuse `chess.class.progress` or classroom equivalent — chốt khi implement LEARN-5 theo module classroom hiện có).
- Engine pure functions unit-tested: target clear, hanging detect, rule eval, score/stars.

---

## Test Evidence (per phase)

- LEARN-1: best score upsert; stars boundaries; UI shows stars; tsc green.
- LEARN-2: multi-move exact_line; shapes render; predicate check/mate/piece_on; no solutions in generated client types for public level if possible.
- LEARN-3: collect_targets replay; clear_side; scripted transcript; hanging fail.
- LEARN-4: curriculum counts; sequential lock on/off; e2e smoke complete level.
- LEARN-5: aggregate % matches completed levels / total published levels.
- LEARN-6: coordinate best score; reset progress.

---

## Follow-up Work (explicitly out of LEARN-1…6)

- CMS soạn Learn cho giáo viên (DB content, versioning, preview).
- Guest / anonymous progress.
- Pixel-perfect lichess UI, 3D board, copy assets.
- Full illegal-move teaching suite beyond one flag.
- Sounds library (optional polish).
- i18n full curriculum non-Vietnamese (structure ready via labels).

---

## Implementation phases checklist

| Đợt     | Scope                                                             |
| ------- | ----------------------------------------------------------------- |
| LEARN-0 | Docs (teardown + spec này + roadmap) — done (PR #49)              |
| LEARN-1 | DB score/stars + exact_line scoring + UI stars — migration `0213` |
| LEARN-2 | Multi-move runner, shapes, predicate mode                         |
| LEARN-3 | collect_targets, clear_side, scripted + scoring constants         |
| LEARN-4 | Curriculum expansion, categories, sequential lock                 |
| LEARN-5 | Classroom % + optional learning_path node                         |
| LEARN-6 | Coordinate high score, reset, polish                              |

Mỗi đợt: cập nhật spec này / L7 spec nếu lệch thực tế; commit; PR; merge; sang đợt sau.
