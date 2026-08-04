# Roadmap: Study depth (S0–S6)

> Mở rộng Study Mentingo sau MVP L2/L7 và classroom share C5. Nguồn hành vi: [07-study-deep-teardown.md](./07-study-deep-teardown.md). Clean-room: [00-cleanroom-policy.md](./00-cleanroom-policy.md).
>
> **Không copy code** từ lila (AGPL-3.0). Mỗi đợt: đặc tả → code Mentingo → verify → commit → push → PR → merge → đợt sau.

## Quyết định sản phẩm đã chốt

| Hạng mục              | Quyết định                                                                          |
| --------------------- | ----------------------------------------------------------------------------------- |
| Phạm vi               | Đầy đủ **S0 → S6**                                                                  |
| Visibility            | Giữ **public / private** — không `unlisted` trong chu kỳ này                        |
| Social                | **Không** like / hot ranking / staff picks                                          |
| Realtime full tree    | **Hoãn** sau S\*; S5 chỉ autosave + optimistic lock (+ presence tùy chọn)           |
| Classroom share study | **Đã có C5** (`assignStudy` → members) — S4 tập trung **embed vào lesson khóa học** |

## Bảng đợt

| Đợt    | Nội dung                                                        | Spec                                                           | PR         |
| ------ | --------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| **S0** | Deep teardown docs + roadmap này + cập nhật matrix/HANDOVER     | (docs only)                                                    | #42 merged |
| **S1** | PGN import/export + chapter orientation / description / pgnTags | `docs/specs/chess-study-pgn-and-chapter-meta-business-spec.md` | (this PR)  |
| **S2** | Shapes-on-node + gamebook per-node hint/onWrong/onCorrect       | `docs/specs/chess-study-gamebook-and-shapes-business-spec.md`  |            |
| **S3** | Discovery filters, invite-by-identity, clone UX, allowClone     | `docs/specs/chess-study-ux-and-membership-business-spec.md`    |            |
| **S4** | Embed study chapter vào lesson khóa học                         | `docs/specs/chess-study-course-embed-business-spec.md`         |            |
| **S5** | Autosave chapter + optimistic concurrency (+ presence optional) | `docs/specs/chess-study-editing-reliability-business-spec.md`  |            |
| **S6** | E2E Playwright, i18n VI, cập nhật master study spec + HANDOVER  | cập nhật `chess-study-business-spec.md`                        |            |

## Chi tiết đợt

### S0 — Docs only

- `07-study-deep-teardown.md`, `08-study-roadmap.md`
- Cập nhật mục B trong `03-feature-matrix.md` (trạng thái sau L2 + trỏ S\*)
- Ghi nhận roadmap S\* trong `05-roadmap.md` và `HANDOVER.md`
- Không product code, không migration

### S1 — PGN + chapter metadata

**Hành vi**

- Import một PGN → một chapter (tags, mainline + variations → flat nodes; comment/glyph từ NAG nếu parser hỗ trợ)
- Import multi-PGN → nhiều chapter (giới hạn số chapter + số node/request)
- Export chapter PGN + export whole study PGN
- Chapter: `orientation` (`white`|`black`), `description?`, `pgnTags` (json map headers chuẩn)
- UI: dán PGN, export, chọn orientation

**Kỹ thuật**

- Pure functions parse/export trên `chess.js` + `moveTree` Mentingo — **tự viết**
- Method controller tên **unique** toàn API: ví dụ `importStudyPgn`, `exportStudyPgn`, `exportStudyChapterPgn`
- Migration cột chapter + RLS nếu cần (mẫu 2 file)

**Tests:** round-trip PGN; permission; reject payload quá lớn.

### S2 — Shapes + gamebook đầy đủ

**Hành vi**

- Persist `shapes[]` trên mỗi flat node (map từ model shapes L1)
- Per-node: `hint?`, `onWrong?`, `onCorrect?` (tên field Mentingo, không copy lila)
- Guided player: hiện hint; sai → onWrong; đúng → onCorrect + advance
- Editor: panel soạn gamebook khi mode=gamebook; shapes khi biên tập

**Tests:** flatten/unflatten; guided flow; API schema.

### S3 — UX & membership

**Hành vi**

- List: mine / shared-with-me / public; search title; sort updated
- Clone button + link study nguồn
- Mời member bằng email hoặc username trong tenant; đổi role; không UX chính bằng raw UUID
- `allowClone` boolean (owner); public → copy link trong tenant
- **Không** unlisted/like

### S4 — Embed vào khóa học

**Hành vi**

- Lesson type hoặc block: `studyId` + optional `chapterId`
- Quyền: enrolled **và** (study public **hoặc** member **hoặc** grant lesson tường minh) — matrix trong spec, chống lộ private study
- Học trong lesson: reuse guided/practice components
- Study bị xóa → placeholder
- Optional: complete lesson khi xong chapter/practice

**Khác C5:** C5 bulk-add `chess_study_members` cho cả lớp; S4 là **nội dung bài học** trong curriculum.

### S5 — Độ tin cậy biên tập

**Hành vi**

- Autosave debounce PATCH + indicator saved/saving/error
- Optimistic lock (`updatedAt` hoặc version) — conflict 409 rõ ràng
- Optional presence `join:chess-study` (WsGateway pattern PR#19) — **không** sync từng nước

### S6 — Hardening

- Playwright smoke: tạo → import PGN → gamebook → học → embed lesson
- i18n `chess.study.*` VI (+ parity keys nếu repo yêu cầu)
- Cập nhật master `chess-study-business-spec.md` + HANDOVER
- **Không** like

## Quy trình mỗi đợt

```
spec (nếu đổi hành vi) → code Mentingo only → tests → lint-tsc hẹp
→ generate:client nếu API đổi → commit → push → PR → merge → main pull → đợt sau
```

## Ngoài phạm vi S\*

Xem `07-study-deep-teardown.md` §10 “Chủ động không làm” và `03-feature-matrix.md` mục L.

## Definition of Done (toàn S\*)

- [ ] Docs S0 merged
- [ ] S1–S6 merged tuần tự
- [ ] Không mã nguồn AGPL trong repo
- [ ] PGN in/out; shapes; gamebook coaching fields; embed lesson; autosave; E2E tối thiểu
- [ ] Visibility vẫn chỉ public/private
