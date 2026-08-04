# lila Learn — deep teardown (hành vi, clean-room)

> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md) trước. Tài liệu này mô tả **hành vi nghiệp vụ và nguyên lý thiết kế** của module Learn trên lichess.org (`/learn`), khảo sát read-only từ `D:\code\lila`. **Không** chứa mã nguồn, chuỗi UI, migration, asset, hay cấu trúc file để copy. mentingo viết lại từ [chess-learn-interactive-engine-business-spec.md](../../specs/chess-learn-interactive-engine-business-spec.md) và stack NestJS/Remix/Postgres/chess.js.

**License hệ tham khảo:** AGPL-3.0-or-later (code); asset learn pieces/images có thể GPLv2+ / AGPL / CC BY-NC-SA — **không** đưa asset lila vào mentingo.

**Trạng thái mentingo lúc viết:** Đợt L7 đã ship nền Learn tối giản (`docs/specs/chess-learn-business-spec.md`, PR #27). Tài liệu này làm cơ sở các đợt **LEARN-1…LEARN-6** (nâng cấp interactive engine + curriculum).

---

## 1. Mục tiêu sản phẩm (hành vi quan sát được)

Learn là **chuỗi bài tương tác nhập môn luật cờ** cho người chưa biết chơi hoặc mới biết sơ. Người học:

1. Xem bản đồ các **chủ đề (stage)** gom theo **nhóm (category)**.
2. Vào một stage → đọc intro → làm lần lượt các **level** trên bàn cờ thật (kéo quân).
3. Mỗi level có **mục tiêu cụ thể** (gom mục tiêu ô, ăn quân, chiếu, nhập thành…).
4. Hệ thống phản hồi **ngay** (đúng / sai / hoàn thành), cộng **điểm**, gán **hạng sao 1–3**.
5. Tiến độ **lưu best-score theo từng level**; có thể làm lại để cải điểm.
6. Người đã đăng nhập: tiến độ server; khách: tiến độ máy local (không đồng bộ).

Giá trị sư phạm cốt lõi: **học bằng tay trên bàn**, không chỉ đọc luật; mỗi khái niệm được **tách nhỏ** thành nhiều level tăng dần.

---

## 2. Kiến trúc tổng quan (nguyên lý, không copy stack)

| Lớp                    | Vai trò quan sát được                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Curriculum tĩnh**    | Toàn bộ stage/level hardcode phía client app Learn; server **không** soạn/CMS nội dung.                         |
| **Engine chơi client** | Bàn cờ, nước đi, mục tiêu ô, kịch bản phản hồi, assert thắng/thua, tính điểm tạm.                               |
| **Progress server**    | Rất mỏng: map user → stage key → mảng điểm theo chỉ số level; upsert best; reset; % hoàn thành cho báo cáo lớp. |
| **UX shell**           | Map home, side map, intro overlay, complete overlay, hash routing trong trang Learn.                            |

**Hệ quả thiết kế cho mentingo (LMS):**

- Server-authoritative grading phù hợp multi-tenant / báo cáo lớp hơn client-only score.
- Curriculum vẫn có thể là **dữ liệu tĩnh trong monorepo** (đã làm L7) trước khi có CMS.
- **Không** dùng chessground (GPL); tái dùng board MIT sẵn có.

---

## 3. Cấu trúc curriculum (khái niệm)

### 3.1 Category → Stage → Level

- **Category**: nhóm sư phạm (ví dụ khái niệm: quân cờ · nền tảng · trung cấp · nâng cao).
- **Stage**: một chủ đề luật (ví dụ khái niệm: xe, tượng, hậu, vua, mã, tốt, ăn quân, bảo vệ, chiến đấu, chiếu 1 nước, thoát chiếu, chiếu hết, xếp bàn, nhập thành, bắt qua đường, bắt bí, giá trị quân, chiếu 2 nước…).
- **Level**: một thế cờ + luật thắng/thua + tham số điểm.

Thứ tự stage trong category tạo **lộ trình tự nhiên** (học quân trước → ăn/bảo vệ → chiếu/chiếu hết → luật đặc biệt → đánh giá vật chất).

Một số stage tồn tại trong codebase tham khảo nhưng **tắt** (không vào curriculum bật) — ví dụ khái niệm “đòn đôi”, “hòa” ở nhóm nâng cao. mentingo không cần mirror danh sách key; chỉ cần **coverage sư phạm** tương đương.

### 3.2 Metadata stage (hành vi)

Mỗi stage có (khái niệm):

- Khóa định danh ổn định (string).
- Tiêu đề / phụ đề / đoạn intro / đoạn complete.
- Ảnh minh họa / illustration cho màn intro.
- Danh sách level có thứ tự.
- Tuỳ chọn CSS class UX (ví dụ ẩn nút về home ở stage đặc biệt).

### 3.3 Metadata level (blueprint — khái niệm đầy đủ)

| Trường khái niệm           | Ý nghĩa                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Goal text                  | Câu lệnh nhiệm vụ hiển thị cho học sinh.                                                                                                                     |
| FEN                        | Thế cờ xuất phát (thường bàn **thưa**).                                                                                                                      |
| Màu chơi                   | Bên người học điều khiển (thường suy từ FEN).                                                                                                                |
| Số nước mục tiêu (optimal) | Dùng tính efficiency / rank, không luôn hard-fail nếu vượt.                                                                                                  |
| Targets (ô “sao”)          | Tập ô cần “gom” bằng cách đi quân tới.                                                                                                                       |
| Shapes                     | Mũi tên / khoanh gợi ý lúc vào level hoặc sau nước kịch bản.                                                                                                 |
| Success rule               | Predicate thắng (mặc định: hết targets; hoặc check, mate, piece_on, scenario xong…).                                                                         |
| Failure rule               | Predicate thua giữa chừng (sai hướng, để mất quân…).                                                                                                         |
| Scenario steps             | Chuỗi nước UCI xen player/opponent, có thể kèm shapes.                                                                                                       |
| Captures expected          | Kỳ vọng số lần ăn (điểm capture / clear-side).                                                                                                               |
| Flags                      | points-for-capture, show-piece-values, detect unprotected capture, offer illegal move, auto-castle, explain promotion, next-button, empty-targets-collision… |

---

## 4. Các “mode” chơi (mô hình chấm)

Đây là phần quan trọng nhất để port **ý tưởng** sang mentingo. Tên mode dưới đây là **tên khái niệm mentingo**, không phải tên API lila.

### 4.1 Collect targets (“gom mục tiêu ô”)

- Các ô mục tiêu hiển thị như **vật phẩm trên bàn** (ngôi sao / táo — chỉ UX; asset mentingo tự vẽ).
- Logic va chạm: ô mục tiêu **chặn đường** như có quân địch ảo (không cho đi xuyên).
- Khi quân người học **đến ô** mục tiêu: mục tiêu biến mất, cộng điểm target.
- Thắng mặc định: **hết mục tiêu**.
- Có thể gắn failure nếu quân rời vùng cho phép / không còn đường hợp lệ theo rule.

**Sư phạm:** dạy quỹ đạo quân (xe/tượng/mã…) bằng game nhỏ, không cần đối thủ.

### 4.2 Clear side / capture chain

- Mục tiêu: **ăn hết** quân một màu (thường đen).
- Điểm theo mỗi lần capture (cố định hoặc theo **giá trị quân** nếu bật show values).
- Tuỳ level: fail nếu sau nước của mình **bị ăn lại không bảo vệ** (detect hanging capture) — dạy “đừng để mất quân miễn phí”.
- Có thể highlight nước đối phương ăn lại khi fail.

**Sư phạm:** chuyển từ “đi quân” sang “tương tác có đối thủ tĩnh + an toàn quân”.

### 4.3 Predicate win/lose (điều kiện bàn cờ)

Success/failure là **biểu thức** trên trạng thái sau nước đi, ví dụ khái niệm:

- Quân loại X đứng trên ô Y / không đứng trên ô Y.
- Không còn quân trên tập ô.
- Đang chiếu / không chiếu trong N nước.
- Chiếu hết / bắt bí.
- Nước vừa đi khớp SAN đặc biệt (nhập thành).
- Kết hợp AND / OR / NOT.

**Sư phạm:** dạy **kết quả luật** (chiếu, nhập thành, bắt bí) thay vì “gom sao”.

### 4.4 Scripted scenario (kịch bản)

- Danh sách bước: nước **bắt buộc** của người học; xen kẽ nước **tự động** của “đối phương ảo”.
- Sai nước so với kịch bản → fail ngay.
- Đúng bước → có thể vẽ shapes mới; sau ~1s đối phương đi tiếp.
- Thắng khi hết bước kịch bản (thường kết hợp predicate `scenario complete`).

**Sư phạm:** dạy **tình huống có phản ứng** (bảo vệ, đổi quân, giá trị) mà không cần AI.

### 4.5 Illegal-move teaching

- Một số level **cho phép** chọn nước “không hợp lệ chuẩn” (ví dụ đi vào chiếu) để minh họa lỗi.
- Sau đó fail + highlight vua bị tấn công / mũi tên đỏ.

**Sư phạm:** “thấy hậu quả” thay vì chỉ chặn im lặng.

### 4.6 Exact line (mentingo L7 đã có)

- Người học gửi chuỗi UCI; server so khớp whitelist đáp án.
- Đây là mode **đơn giản, server-first** — phù hợp LMS; nên **giữ** và mở rộng multi-move UX, không bỏ.

### 4.7 Promotion & special moves

- Tốt vào hàng cuối: UI chọn quân phong; level có thể giải thích phong hậu.
- Nhập thành: auto-castle UX; success theo SAN nhập thành.
- En passant: FEN + targets/captures phù hợp.
- Bắt bí / chiếu hết: predicate mate/stalemate trên chess rules chuẩn.

---

## 5. Vòng đời một level (UX + logic)

```
Load stage → (lần đầu) Intro overlay → Start level
  → Khởi tạo FEN + targets + shapes + scenario index
  → Người học kéo quân
      → (optional) promotion dialog
      → Apply move (hoặc reject / teach illegal)
      → Cộng điểm target/capture/scenario
      → Evaluate failure? → fail UI + optional opponent follow-up capture
      → Evaluate success? → complete (cộng efficiency bonus) → lưu best score
      → Else continue (đổi lượt ảo / reset color nếu single-side play)
  → Next level hoặc Stage complete overlay
```

**Chi tiết hành vi đáng giữ ý tưởng:**

- **Single-color drills:** nhiều level chỉ đi một màu; sau nước người học, “lượt” được gán lại cùng màu (không chơi full game).
- **Scenario levels:** xen lượt thật với opponent scripted.
- **Complete delay:** chút trễ animation trước khi khóa board / sang level (UX polish).
- **Next button flag:** một số level chờ bấm “tiếp” thay vì auto-advance.
- **Restart level:** reset state local, không xóa best score đã lưu.

---

## 6. Hệ điểm & hạng sao (hành vi)

### 6.1 Cộng điểm trong level (khái niệm)

| Sự kiện            | Ý nghĩa điểm                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Gom 1 target       | Cộng điểm cố định (cùng hạng magnitude với capture).                                               |
| Capture (khi bật)  | Cộng điểm cố định **hoặc** theo bảng giá trị quân (hậu > xe > mã/tượng > tốt; vua không tính).     |
| Bước scenario đúng | Cộng điểm cố định.                                                                                 |
| Hoàn thành level   | **Bonus efficiency** theo số nước thực tế so với optimal: tốt nhất / khá / chấp nhận được (3 bậc). |

### 6.2 Max score & rank 1–3

- Max score level ≈ (số target × điểm target) + (captures kỳ vọng × điểm capture, nếu bật) + bonus bậc cao nhất.
- Rank 1 nếu đạt ~max; rank 2 nếu suýt max (ngưỡng lệch cố định); else rank 3 (vẫn complete).
- Rank **stage** suy từ tổng điểm các level so với tổng max stage (ngưỡng lệch phụ thuộc số level).

### 6.3 Persist

- Chỉ **ghi nhận nếu tốt hơn** điểm đã lưu cùng level (best-only).
- Complete level = có điểm > 0 (hoặc có rank) — dùng đếm tiến độ stage.
- Guest: local storage; login: POST điểm lên server (stage key + level index + score).
- Reset: xóa toàn bộ progress user.

**mentingo:** server tính score/stars từ transcript nước đi (không tin client score). Best-only + stars 1–3 vẫn giữ.

---

## 7. Progress server & báo cáo lớp (hành vi)

- Document/record per user: map stageKey → mảng scores theo thứ tự level.
- API hành vi: đọc progress khi render trang; ghi score; reset.
- **Completion percent** cho danh sách học sinh: đếm số “ô điểm khác 0” / hằng số max completion toàn chương trình → % (dùng báo cáo lớp).

**mentingo:** bảng quan hệ `(user, stageId, levelId)` đã có từ L7; mở rộng cột best score/stars; aggregate % cho classroom (LEARN-5).

---

## 8. Routing & shell UX

- Home map: categories + stage cards (tiến độ `done/total`, sao stage).
- Trong stage: side map các level + board run area.
- Deep link: stage + level (lila: hash; mentingo đã dùng path `/chess/learn/:stageId/:levelId` — **giữ path REST**, không cần hash).
- Prefs bàn cờ (coords, 3d, destination) đọc từ user pref — mentingo dùng pref board sẵn có nếu có.

---

## 9. Âm thanh & a11y (quan sát)

- Sound events: start stage, start level, move, capture/take, fail, complete level/stage.
- Môi trường trường học: mentingo nên **mặc định tắt tiếng** hoặc tôn trọng system mute; optional toggle.

---

## 10. Những gì **không** nên port nguyên xi

| Hạng mục                                         | Lý do                                           |
| ------------------------------------------------ | ----------------------------------------------- |
| Code / i18n strings / FEN / apples lists từ lila | AGPL + bản quyền expression                     |
| chessground, asset apple SVG, piece images learn | GPL / mixed / NC                                |
| Client-only grading làm source of truth          | LMS cần audit/report                            |
| Antichess-as-engine-hack cho thiếu vua           | mentingo dùng chess.js chuẩn + modes tường minh |
| Guest localStorage là mặc định                   | LMS = user đã login + tenant                    |
| CMS-less vĩnh viễn                               | mentingo có thể thêm CMS sau (ngoài LEARN-6)    |

---

## 11. Gap matrix tóm tắt → đợt mentingo

| Hạng mục                       | lila             | mentingo L7           | Đợt      |
| ------------------------------ | ---------------- | --------------------- | -------- |
| Exact line grading             | Phụ (client)     | Có (server)           | giữ      |
| Best score + stars             | Có               | Chỉ completed boolean | LEARN-1  |
| Multi-move runner + shapes     | Có               | 1 nước/UX, hint text  | LEARN-2  |
| Predicate DSL server           | Client asserts   | Không                 | LEARN-2  |
| Collect targets                | Có               | Không                 | LEARN-3  |
| Clear-side + hang detect       | Có               | Không                 | LEARN-3  |
| Scripted opponent              | Có               | Không                 | LEARN-3  |
| Full curriculum depth          | Cao              | 10 stage × 1–2 level  | LEARN-4  |
| Category map + sequential lock | Map + soft order | Flat list, all open   | LEARN-4  |
| Classroom % / learning path    | Class completion | Progress table only   | LEARN-5  |
| Coordinate high score          | Có (module khác) | Client only           | LEARN-6  |
| Teacher CMS Learn              | Không            | Không                 | epic sau |

---

## 12. Checklist đặc tả trước khi code (clean-room gate)

Người/agent implement **không** mở `D:\code\lila` khi code. Phải đủ trong docs mentingo:

- [x] Policy AGPL + clean-room (00).
- [x] Teardown hành vi Learn (file này).
- [x] Business spec interactive engine (chess-learn-interactive-engine-business-spec.md).
- [x] Roadmap đợt LEARN-1…6 (05-roadmap.md cập nhật).
- [ ] Unit/E2E acceptance ghi trong từng đợt PR.

---

## 13. Ghi chú khảo sát kỹ thuật (chỉ để hiểu ranh giới — không port)

- Backend Learn lila: collection progress Mongo, form validate whitelist stage names + level range + score range.
- Frontend: Snabbdom UI, chessops rules, chessground board (GPL).
- Apple collision: đặt tốt địch ảo trên ô target trong engine rules.
- `maxCompletion ≈ 110` dùng chia % class — hằng số phụ thuộc tổng level curriculum, mentingo tính từ **tổng level đang publish** của mình.

Hết teardown. Mọi quyết định product/API/schema mentingo nằm ở business specs, không ở file này.
