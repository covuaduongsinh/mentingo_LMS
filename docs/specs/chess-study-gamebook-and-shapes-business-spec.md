# Chess Study Gamebook Coaching & Persistent Shapes — Business Spec

> Đặc tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0. Không chứa mã nguồn trích dẫn trực tiếp. Đợt **S2** (`docs/research/lila/08-study-roadmap.md`).

## Business Overview

Nâng gamebook/conceal từ “chỉ so mainline” lên **coaching text theo từng nước** (gợi ý, phản hồi sai, phản hồi đúng) và **lưu shapes** (mũi tên/tô ô) trên từng node của cây biến.

## Feature Functions

### Shapes on node

- Mỗi flat node có thể có `shapes?: BoardShape[]` (arrow/circle + color) — cùng model L1 client.
- Editor: shapes vẽ trên bàn gắn vào **nước hiện tại** (path); lưu cùng PATCH chapter.
- Viewer normal: hiện shapes của node đang đứng.

### Gamebook fields per node

- Trên node (nước đúng tiếp theo / node vừa chơi): `hint?`, `onWrong?`, `onCorrect?` (string ngắn).
- Player gamebook:
  - Có thể bấm “Gợi ý” → hiện `hint` của nước **kỳ vọng tiếp theo**.
  - Đi sai → hiện `onWrong` của nước kỳ vọng (fallback message mặc định).
  - Đi đúng → hiện `onCorrect` của nước vừa khớp (nếu có) + comment/glyph.
- Conceal: giữ che ply; shapes hiện sau khi reveal tới node.

## Non-goals

- Multi-author comments; realtime; import shapes từ PGN.

## Technical

- Mở rộng `ChessStudyFlatMoveNode` + `FlatMoveNode` + TypeBox schema + flatten/unflatten.
- Không migration bảng (jsonb `move_nodes` đã linh hoạt).
