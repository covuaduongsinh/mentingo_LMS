# Chess Study PGN Import/Export & Chapter Metadata — Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, xem `docs/research/lila/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.
>
> Đợt **S1** của roadmap Study depth (`docs/research/lila/08-study-roadmap.md`). Baseline MVP: `chess-study-business-spec.md` (L2).

## Business Overview

Giáo viên cần mang giáo án cờ từ file PGN (ChessBase, lichess export, v.v.) vào Study Mentingo, và xuất lại PGN để dùng ngoài hệ thống. Mỗi chapter cần metadata chuẩn: hướng bàn, mô tả intro, và thẻ PGN (White/Black/Event/Result…).

## Who Uses It

- Owner / write member / admin: import PGN, sửa metadata, export.
- Read member / public viewer: export (nếu có quyền đọc study).

## Feature Functions

### 1. Chapter metadata

- `orientation`: `white` | `black` (mặc định `white`) — hướng bàn khi xem/học.
- `description`: text tùy chọn (intro chương).
- `pgnTags`: object string→string (headers PGN chuẩn, ví dụ Event, White, Black, Result, ECO).

### 2. Import PGN

- Body: `{ pgn: string, mode?: chapter mode }` trên `POST .../studies/:id/import-pgn` (method **importStudyPgn**).
- Tách multi-game PGN (các ván cách nhau bởi dòng trống + tag mới) → **nhiều chapter**.
- Mỗi ván: parse tags → `pgnTags`; parse **mainline** (best-effort; biến phức tạp có thể không đầy đủ) → `moveNodes` adjacency list; `rootFen` từ FEN tag hoặc chuẩn; title từ Event/White-Black hoặc "Chapter N".
- Giới hạn: tối đa 32 chapter/request; tối đa 1500 node/chapter; PGN ≤ 500_000 ký tự.
- PGN invalid → 400.

### 3. Export PGN

- `GET .../studies/:id/export.pgn` (method **exportStudyPgn**) — toàn bộ chapter nối multi-game.
- `GET .../studies/:id/chapters/:chapterId/export.pgn` (method **exportStudyChapterPgn**).
- Response text/plain PGN; quyền đọc study.

## Non-goals (S1)

- Import variation tree đầy đủ từ PGN lồng nhau phức tạp (best-effort mainline).
- GIF, embed iframe, unlisted.

## Key Technical Context

- Pure functions `apps/api/src/chess/utils/study-pgn.utils.ts` dùng `chess.js` — không port code AGPL.
- Migration cột trên `chess_study_chapters`: orientation, description, pgn_tags jsonb.
- Clone study copy metadata mới.
- Frontend: form dán PGN + nút export trên Study detail/editor.

## Test Evidence

- Unit parse/export round-trip mainline.
- Service import permission + multi-game count.
- Controller method names unique globally.
