# Deep teardown: Study / Chapter (tham chiếu lila)

> Đặc tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham chiếu cấp phép **AGPL-3.0** (lila / lichess.org Study). **Không** chứa mã nguồn, SQL/BSON schema, chuỗi UI, hay cấu trúc file trích dẫn trực tiếp từ hệ thống đó.
>
> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md) trước khi dùng tài liệu này để viết code Mentingo.
>
> Roadmap triển khai: [08-study-roadmap.md](./08-study-roadmap.md). Baseline Mentingo (L2): [chess-study-business-spec.md](../../specs/chess-study-business-spec.md).

## 1. Mục đích khảo sát

Module Study trên lichess.org là không gian **lưu trữ và chia sẻ phân tích cờ** (nhiều chương, cây biến có chú thích, chế độ hỏi–đáp, cộng tác, import/export PGN). Mentingo đã có MVP Study (L2 + practice L7 + chia sẻ study cho lớp ở Classroom C5). Tài liệu này **đào sâu** toàn bộ khía cạnh Study của hệ tham chiếu để:

1. Khóa danh sách hành vi còn thiếu so với nhu cầu LMS trường/CLB.
2. Làm nguồn cho business spec từng đợt S1–S6 — người viết code **chỉ** đọc spec + mã Mentingo, không mở lại codebase AGPL.

## 2. Vị trí trong sản phẩm tham chiếu

- URL người dùng: danh sách study, study theo chủ đề/tác giả, trang study + chapter, embed chapter, export PGN/GIF, practice gắn study, relay (tường thuật) tái dùng cây study.
- Study **khác** bàn phân tích tạm thời: study **bền** (lưu server, chia sẻ, nhân bản); analysis session thường là phiên ngắn.
- Study **khác** puzzle bank: puzzle là thế cờ chấm rating; study là bài giảng/soạn thảo có chủ đích sư phạm.

## 3. Mô hình khái niệm (ý tưởng, không schema)

### 3.1 Study (bài giảng / không gian phân tích)

| Khía cạnh            | Hành vi quan sát được                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Định danh            | Id ngắn công khai trên URL; slug tên phụ                                                                                               |
| Metadata             | Tên, mô tả tùy chọn, chủ đề (topics), biểu tượng trang trí (flair — giá trị thấp với LMS)                                              |
| Nguồn gốc            | Tạo từ trắng / từ một ván / nhân bản study khác / sinh từ relay                                                                        |
| Visibility           | `public` (list + mở) · `unlisted` (có link, không list) · `private` (chỉ thành viên)                                                   |
| Vị trí đang mở       | “Con trỏ” study: chapter hiện tại + path trên cây (phục vụ sticky collab)                                                              |
| Lượt thích           | Đếm likes + ranking “hot” theo log likes và tuổi study                                                                                 |
| Cài đặt theo feature | Mỗi feature (engine client, explorer, clone, share, chat) có **ngưỡng** ai được phép: nobody / owner / contributor / member / everyone |
| Sticky               | Khi bật: người xem “dính” path theo người đang chỉnh; khi tắt: mỗi người tự điều hướng                                                 |
| Giới hạn             | Số chapter tối đa cỡ vài chục; số thành viên cỡ vài chục                                                                               |

### 3.2 Thành viên

| Vai trò             | Đọc | Ghi cây/chapter | Mời người         | Xóa study / đổi role |
| ------------------- | --- | --------------- | ----------------- | -------------------- |
| Owner               | ✓   | ✓               | ✓                 | ✓                    |
| Write (contributor) | ✓   | ✓               | ✗ (chỉ owner mời) | ✗                    |
| Read (member)       | ✓   | ✗               | ✗                 | ✗                    |
| Platform admin      | ✓   | ✓               | ✓                 | ✓                    |

Mời thành viên: resolve theo username; rate-limit; tôn trọng chặn/follow và preference “ai được mời study”; thông báo nếu người được mời không đang online trong phòng.

### 3.3 Chapter (chương)

| Khía cạnh        | Hành vi                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Nội dung cốt lõi | Một **cây biến** gốc từ FEN (hoặc ván chuẩn), mỗi nút = một nước + chú thích                          |
| Setup            | Biến thể (Mentingo chỉ chuẩn), hướng bàn (trắng/đen), optional “từ FEN”, optional liên kết game nguồn |
| Tags PGN         | White, Black, Event, Result, ECO, … dùng đặt tên chapter, orientation gợi ý, practice goal            |
| Description      | Intro/markdown ngắn của chương (khác comment từng nước)                                               |
| Mode flags       | `practice`, `gamebook`, `conceal` (ply bắt đầu che) — có thể kết hợp ngữ nghĩa riêng                  |
| Thứ tự           | Order số nguyên; reorder toàn bộ list id                                                              |
| Preview denorm   | FEN cuối mainline, nước cuối, đồng hồ (phục vụ multi-board list)                                      |
| Server eval      | Cờ “đã yêu cầu / xong” phân tích engine phía server trên chapter                                      |
| Giới hạn         | Số node cỡ vài nghìn; độ sâu ply giới hạn                                                             |

### 3.4 Node trên cây (mỗi nước)

| Trường ý niệm            | Ý nghĩa                                              |
| ------------------------ | ---------------------------------------------------- |
| UCI / SAN / FEN sau nước | Định danh nước và vị trí                             |
| Shapes                   | Mũi tên + tô ô (giới hạn số shape/node)              |
| Comments                 | Một hoặc nhiều bình luận (có thể gắn người viết)     |
| Glyphs / NAG             | ! ? !! ?? !? ?! và bộ glyph mở rộng                  |
| Gamebook fields          | Gợi ý khi nghĩ; text khi đi lệch; text khi đi đúng   |
| Clock                    | Thời gian còn lại tại nút (phân tích ván có đồng hồ) |
| Force variation          | Ép hiển thị nhánh như biến dù là mainline local      |
| Score / eval cache       | Điểm engine gắn node (nếu có server eval)            |

Cây lưu server dạng tối ưu (hệ tham chiếu: flatten BSON). **Mentingo đã chọn adjacency list JSON** — giữ nguyên hướng đó; chỉ **mở rộng field** theo spec Mentingo, không sao chép encoding.

## 4. Chế độ tương tác chapter

### 4.1 Normal

- Hiện full cây, nhảy path, xem comment/glyph/shapes.
- Biên tập: thêm/xóa/promote biến, comment, glyph, shapes, tags.

### 4.2 Conceal

- Từ ply X trở đi, nước trên cây hiển thị ẩn cho tới khi người xem **tự đi đúng** (hoặc được tiết lộ theo policy UI).
- Dùng làm “bài đố trên ván đã có sẵn”.

### 4.3 Gamebook (hỏi–đáp)

- Ẩn cây; người học phải chọn nước.
- So khớp với nhánh được soạn (thường mainline hoặc nhánh có annotation gamebook).
- **Hint** (gợi ý trước khi đi), **deviation** (khi sai), **feedback** (khi đúng) — soạn **theo từng nút**.
- Có thể có chế độ “play” vs “analyse” (override tạm cho biên tập viên/xem lại).

### 4.4 Practice

- Mục tiêu: chiếu hết / hòa / ưu thế trong N nước (ở hệ tham chiếu thường suy từ tag/kết quả).
- Mentingo L7 đã có `practiceGoalType` + chấm server — **không** cần port lại engine practice lila; chỉ cần đảm bảo gamebook/conceal không xung đột practice trong spec S2.

## 5. Tạo chapter — nguồn dữ liệu

Wizard/tabs quan sát được:

1. **Trống** — FEN chuẩn, cây rỗng.
2. **FEN** — dán FEN, orientation, mode.
3. **PGN** — dán một hoặc nhiều ván; mỗi ván → một chapter; tags + cây + comment/NAG nếu parser hỗ trợ.
4. **Game** — lấy từ id ván trên platform (Mentingo: map sang `chess_matches` / game bank nếu sau này cần — không bắt buộc S1).
5. **Relay** — ngoài phạm vi Study depth (Mentingo dùng module broadcast L10 tách biệt).

Quy tắc orientation gợi ý (ý tưởng): cố định theo form; nếu conceal → bên được đi; nếu gamebook → góc nhìn người “phải tìm nước”; nếu có kết quả ván → mặc định trắng; nếu tên kỳ thủ khớp user → hướng về phía họ.

## 6. Biên tập realtime (hệ tham chiếu)

Phòng socket theo study id; mọi thay đổi versioned broadcast tới người trong phòng.

Nhóm sự kiện nghiệp vụ:

| Nhóm       | Ví dụ hành vi                                                      |
| ---------- | ------------------------------------------------------------------ |
| Điều hướng | setPath (sticky), đổi chapter hiện tại                             |
| Cây        | thêm nước, xóa node, promote mainline, force variation             |
| Chú thích  | shapes, comment, xóa comment, glyph, gamebook fields               |
| Chapter    | add/edit/delete/sort, clear annotations/variations, set tags, desc |
| Study      | edit metadata/settings/topics, like, desc                          |
| Thành viên | invite, setRole, kick, leave                                       |
| Phân tích  | request server analysis                                            |
| Chat       | nói trong phòng study                                              |
| Lỗi        | báo lỗi validation về đúng client                                  |

**Mentingo hiện tại:** PATCH nguyên chapter `moveNodes` (save thủ công). Full OT/CRDT **không** nằm trong S1–S4; S5 chỉ autosave + optimistic lock (+ presence tùy chọn).

## 7. Import / export / chia sẻ

| Hành vi                          | Ghi chú cho Mentingo                                        |
| -------------------------------- | ----------------------------------------------------------- |
| Import PGN vào study             | Ưu tiên S1; multi-game → multi-chapter; giới hạn kích thước |
| Export chapter / whole study PGN | S1                                                          |
| Embed iframe chapter             | Thấp hơn embed **trong lesson** LMS (S4)                    |
| Clone study                      | Đã có L2; S3 polish UX + `allowClone`                       |
| GIF                              | Bỏ (matrix)                                                 |
| API ngoài (OAuth study write)    | Bỏ — Mentingo có integration API riêng nếu cần sau          |

## 8. Discovery & social

| Hành vi hệ tham chiếu                                                                            | Phán quyết Mentingo (đã chốt S\*)                                              |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| List all / mine / member / public / private / likes / by owner / by topic / search / staff picks | S3: mine / shared-with-me / public + search title; **không** likes/staff picks |
| Topics + autocomplete                                                                            | L2 đã gắn `CHESS_TOPICS`; S3 có thể polish filter                              |
| Unlisted                                                                                         | **Không** làm trong S\* (giữ public/private)                                   |
| Like + hot rank                                                                                  | **Không** làm trong S\*                                                        |
| Invite prefs / rate limit phức tạp                                                               | S3: invite bằng email/username tenant; rate-limit đơn giản nếu cần             |

## 9. Tích hợp lân cận (ranh giới)

| Hệ lân cận           | Quan hệ với Study        | Mentingo                                                           |
| -------------------- | ------------------------ | ------------------------------------------------------------------ |
| Practice site-wide   | Study curated + complete | L7 practice goal trên chapter                                      |
| Relay/Broadcast      | Chapter tree live        | L10 module riêng, không dùng study tree                            |
| Analysis collab room | Phòng tạm realtime       | PR#19; pattern WsGateway cho S5 presence                           |
| Classroom            | Giao bài cho lớp         | C5: `assignStudy` → thêm members read — **khác** embed lesson (S4) |
| Course curriculum    | —                        | S4: lesson/block trỏ studyId+chapterId                             |

## 10. Ma trận gap sau L2 / L7 / C5

### Đã có (MVP)

- Study + chapter CRUD, reorder, clone, topics, public/private, members read/write
- Flat move tree: comment, glyph
- Mode normal / gamebook / conceal (guided **mainline only**, không per-node coaching text)
- Practice goal typed + server grade (L7)
- Share study vào classroom qua members (C5)
- UI list + detail + editor + guided player cơ bản

### Gap ưu tiên S\* (xem roadmap)

| Id  | Gap                                                             | Đợt |
| --- | --------------------------------------------------------------- | --- |
| G1  | Import/export PGN + multi-PGN                                   | S1  |
| G4  | Chapter orientation, description, pgnTags                       | S1  |
| G2  | Shapes persist trên node                                        | S2  |
| G3  | Gamebook hint / onWrong / onCorrect per node                    | S2  |
| G6  | Discovery filters, clone UX, invite-by-identity, allowClone     | S3  |
| G5  | Embed study vào **lesson khóa học** (không chỉ classroom share) | S4  |
| G10 | Autosave + optimistic concurrency (+ presence optional)         | S5  |
| G11 | E2E Playwright + i18n VI đầy đủ                                 | S6  |

### Chủ động không làm trong S\*

Realtime full tree, chat study, GIF, explorer, unlisted, like, staff picks, server eval study (trừ khi sau này job Arasan riêng), OAuth study API, multi-board denorm relay-style.

## 11. Nguyên tắc thiết kế Mentingo (rút ra, không copy)

1. **Persistence adjacency list** đã chọn — mở rộng field có kiểm soát, không đổi sang BSON flatten lila.
2. **Save atomic chapter** trước; collab từng nước sau (nếu bao giờ).
3. **Phân quyền 3 tầng** `assertCanRead/Write/Manage` giữ nguyên; settings chỉ thêm boolean đơn giản (`allowClone`).
4. **PGN round-trip best-effort** + giới hạn node/chapter — document rõ, test round-trip các PGN chuẩn.
5. **Embed lesson ≠ classroom assign**: lesson cần matrix quyền enrollment + study visibility; classroom C5 chỉ bulk-add members.
6. **Tên method controller global unique** (bài học L2/L7/L10).
7. **Clean-room**: code từ business spec; parser PGN dựa `chess.js` + `moveTree` Mentingo.

## 12. Giới hạn quan sát (không suy diễn quá mức)

- Không đặc tả chi tiết wire format socket (tránh “copy protocol”).
- Không đặc tả thuật toán ranking like chính xác (đã loại like).
- Không đặc tả UI pixel/CSS.
- Relay/practice site-wide chỉ nêu ranh giới.

## 13. Checklist khi viết business spec S1–S6

- [ ] Disclaimer AGPL clean-room ở đầu file
- [ ] Who / Feature functions / How it works / Non-goals
- [ ] Permission + tenant/RLS
- [ ] API shapes (tên method unique) hoặc UI-only
- [ ] Data model Mentingo (Drizzle) — **tự thiết kế**, không chép Mongo
- [ ] Acceptance criteria + tests
- [ ] Follow-up explicit
