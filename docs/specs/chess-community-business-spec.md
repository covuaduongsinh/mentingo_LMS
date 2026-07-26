# Chess Community (Cộng đồng cờ) Business Spec — L9

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (lila/lichess.org, xem `docs/research/lila/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt L9 của roadmap "còn thiếu so với lila" (`docs/research/lila/05-roadmap.md`), nối tiếp L8 (Insight/Tutor, PR #28). `docs/research/lila/03-feature-matrix.md` mục I liệt kê 5 hạng mục còn thiếu ở "Cộng đồng cờ": **CLB tự phục vụ**, **tin nhắn riêng 1-1**, **follow/block**, **danh bạ HLV**, **kid mode xuyên suốt**. Mentingo đã có diễn đàn cộng đồng (bài đăng/bình luận/upvote, PR #15) và hồ sơ công khai `/u/:username` — đợt này **mở rộng đúng module `community` đã có** (không viết lại diễn đàn), thêm 3 hạng mục có giá trị cao nhất và độc lập kỹ thuật nhất: **tin nhắn riêng 1-1** (mentingo hiện hoàn toàn chưa có kênh liên hệ trực tiếp giữa hai người dùng), **follow/block** (lớp quan hệ xã hội nhẹ, cần thiết để tin nhắn an toàn), và **danh bạ HLV** (tận dụng thẳng dữ liệu hồ sơ công khai đã có). **Kid mode** không làm thành một cơ chế xuyên suốt toàn hệ thống (quá rộng cho một đợt) mà áp dụng cụ thể vào đúng hai tính năng mới có khả năng lộ thông tin liên hệ: nhắn tin và theo dõi.

## Who Uses It

- Mọi người dùng có quyền `community.read` hiện có (student, content_creator, trainer, admin) — nhắn tin, theo dõi, chặn, xem danh bạ HLV.
- Học sinh dùng tài khoản do giáo viên quản lý (managed account, L5) — nhắn tin/theo dõi bị giới hạn chỉ trong phạm vi bạn cùng lớp (cùng `groups`), không liên hệ được người lạ trong tenant và ngược lại không ai lạ liên hệ được các em.

## Feature Functions

### 1. Tin nhắn riêng 1-1 (Direct Messages)

- `GET /community/conversations` — danh sách hội thoại của chính mình, mỗi dòng gồm người còn lại (tên, ảnh đại diện), xem trước tin nhắn cuối, thời điểm tin nhắn cuối, số tin chưa đọc — sắp xếp theo thời điểm gần nhất.
- `GET /community/conversations/:id/messages` — danh sách tin nhắn phân trang trong một hội thoại (chỉ thành viên hội thoại mới xem được).
- `POST /community/messages` — gửi tin nhắn tới một `recipientUserId`; tự tạo hội thoại nếu chưa có (chuẩn hoá theo cặp hai userId, không tạo trùng).
- `POST /community/conversations/:id/read` — đánh dấu đã đọc toàn bộ tin nhắn của phía bên kia trong hội thoại.
- `GET /community/messageable-users` — danh sách gợi ý người có thể bắt đầu hội thoại: nếu tài khoản đang gọi là **managed** → chỉ bạn cùng lớp (cùng `groups`); ngược lại → HLV có hồ sơ công khai + người đang theo dõi + người đã từng nhắn tin — có chủ đích **không** làm ô tìm kiếm toàn bộ người dùng tenant (bề mặt liên hệ rộng không cần thiết cho môi trường trường học).
- Chặn gửi tin nếu một trong hai bên đã chặn bên kia (bất kỳ chiều nào).
- Thông báo tin nhắn mới đẩy realtime qua `WsGateway` sẵn có (phòng `user:<userId>` đã tự động join lúc xác thực WS — không cần thêm sự kiện `join:*` mới).

### 2. Theo dõi / Chặn (Follow / Block)

- `POST/DELETE /community/users/:userId/follow` — theo dõi/bỏ theo dõi. Hiển thị số người theo dõi trên hồ sơ công khai (`/u/:username`) khi cả hai đều bật hồ sơ công khai — chưa làm dòng hoạt động bạn bè (activity feed), xem "Follow-up Work".
- `POST/DELETE /community/users/:userId/block` — chặn/bỏ chặn; chặn ai đó tự động huỷ quan hệ theo dõi hai chiều giữa hai người (dọn dẹp, tránh trạng thái mâu thuẫn "chặn nhưng vẫn theo dõi").
- `GET /community/users/:userId/relationship` — trạng thái quan hệ hiện tại với một người khác (`isFollowing`/`isFollowedBy`/`isBlocking`/`isBlockedBy`) để giao diện hiển thị đúng nút bấm.
- Cùng áp quy tắc kid mode như nhắn tin: managed account chỉ theo dõi được bạn cùng lớp; không ai theo dõi được managed account trừ bạn cùng lớp. Chặn thì **không** bị giới hạn theo lớp — hành động tự bảo vệ luôn được phép với bất kỳ ai.

### 3. Danh bạ HLV (Trainer Directory)

- `GET /community/trainers` — danh sách người dùng có vai trò `trainer` **và** đã bật hồ sơ công khai (tái dùng đúng cờ `publicProfileEnabled` từ Public Profile, PR #15/Đợt 7) — tên, bio, ảnh đại diện, username (để liên kết sang `/u/:username`). Không cần quyền mới — dùng lại `community.read`.

### 4. Kid mode áp dụng cho hai tính năng mới

- Nếu **một trong hai bên** (người gửi/theo dõi hoặc người nhận/bị theo dõi) là tài khoản managed (`users.isManagedAccount`), bắt buộc hai bên phải **cùng ít nhất một `groups`** (dùng lại `group_users` đã có từ trước, đúng cơ chế "bạn cùng lớp" mà L5 dùng cho báo cáo tiến độ) — nếu không, từ chối với lỗi rõ ràng. Đây là cách hiện thực hoá "kid mode xuyên suốt" cho đúng phạm vi hai tính năng mới có khả năng lộ thông tin liên hệ, không mở rộng ra toàn hệ thống (diễn đàn, bài đăng... giữ nguyên hành vi cũ).

## End-User Value

Học sinh và giáo viên giờ có thể liên hệ trực tiếp 1-1 (hỏi bài riêng, trao đổi giữa HLV và phụ huynh/học sinh) mà trước đây phải qua kênh ngoài ứng dụng. Theo dõi tạo lớp kết nối xã hội nhẹ nhàng khuyến khích tương tác. Danh bạ HLV giúp phụ huynh/học sinh tìm đúng người hướng dẫn trong trường/CLB. Quan trọng nhất: cơ chế kid mode đảm bảo tài khoản trẻ em không bị người lạ trong hệ thống liên hệ, và ngược lại các em cũng không "chat lung tung" ra ngoài phạm vi lớp học — an toàn cho cả hai chiều.

## How It Works

Người dùng vào mục "Tin nhắn" mới, thấy danh sách hội thoại đã có kèm gợi ý người có thể bắt đầu chat mới (bạn cùng lớp/HLV/người đang theo dõi/người đã từng chat). Bấm vào một người, gõ tin nhắn, gửi — người nhận thấy tin nhắn xuất hiện gần như ngay lập tức nếu đang mở ứng dụng (đẩy qua WebSocket), hoặc thấy khi vào lại mục Tin nhắn. Trên trang hồ sơ công khai của người khác, nút "Theo dõi" và "Nhắn tin" xuất hiện (chỉ khi đã đăng nhập và không phải hồ sơ của chính mình); có thể "Chặn" nếu bị làm phiền. Trang "Danh bạ HLV" mới liệt kê toàn bộ HLV đã bật hồ sơ công khai trong trường/CLB.

## Key Technical Context

- Bảng mới (đơn giản hoá còn 3 bảng, gộp follow+block vào một bảng có cột phân loại thay vì 4 bảng riêng — cùng nguyên lý gộp bảng đã dùng ở L4/L6): `communityConversations` (`userAId`/`userBId` chuẩn hoá theo thứ tự UUID nhỏ hơn đứng trước để tránh trùng cặp, `lastMessageAt`), `communityMessages` (`conversationId`, `senderId`, `content`, `readAt` nullable), `communityUserRelationships` (`actorUserId`, `targetUserId`, `relationshipType` — `follow` | `block`, unique theo 3 cột). Theo đúng quy ước cột enum dạng `varchar` không gắn kiểu TS của chính module `community` hiện có (`communityPosts.label`, `communityVotes.targetType`) — không theo mẫu `$type<...>()` của module `chess`. Migration mẫu "1 tạo bảng + 1 bật RLS riêng" (`0197`/`0198`).
- Module mới trong **cùng** `CommunityModule` hiện có: `community-social.repository.ts`/`community-social.service.ts` (không sửa `community.repository.ts`/`community.service.ts` cũ), endpoint mới thêm thẳng vào `community.controller.ts` hiện có.
- Không tạo gateway Socket.IO riêng — tin nhắn mới phát qua `RealtimePublisher.emitToRoom` tới phòng `user:<recipientId>` đã tồn tại sẵn (mọi kết nối WS đã tự động join phòng này lúc xác thực, xem `websocket.gateway.ts`/`ws-jwt.guard.ts`) — đúng nguyên lý "mọi tính năng realtime mới mở rộng hạ tầng sẵn có" đã ghi ở `04-subsystem-notes.md` mục 8, và đúng mẫu an toàn tránh vòng lặp require() cấp file đã học từ L3/L4 (`community-social.service.ts` chỉ inject `REALTIME_PUBLISHER`, không import gì từ `src/websocket/` dưới dạng giá trị).
- Danh bạ HLV join `permissionUserRoles`/`permissionRoles` (lọc `slug = 'trainer'`) với `users` (lọc `publicProfileEnabled = true`) — không thêm cột/bảng vai trò riêng.
- `publicProfileSchema`/`PublicProfileService.getPublicProfile` (Đợt 7) được mở rộng thêm trường `userId` (dữ liệu này thật ra **đã có sẵn** trong câu query của `PublicProfileRepository.getPublicProfileByUsername` nhưng bị bỏ qua lúc dựng response) — cần thiết để trang hồ sơ công khai gọi được API theo dõi/nhắn tin/chặn (các API này định danh người dùng theo `userId`, không theo `username`). Thay đổi thêm trường, không phá vỡ response cũ.
- Permission mới: dùng lại đúng tên miền `community.*` đã có — `community.message.send` (nhắn tin, đọc hội thoại của chính mình), `community.social.manage` (theo dõi/bỏ theo dõi/chặn/bỏ chặn), gán cho cả 4 vai trò hệ thống (student/content_creator/trainer/admin). Không thêm quyền cho danh bạ HLV (dùng lại `community.read`). **Phát hiện kèm khi code**: vai trò `trainer` trước đó **hoàn toàn không có** quyền `community.*` nào (kể cả `community.read`) — một khoảng trống từ Đợt 7 (community forum), khiến HLV không đọc được diễn đàn dù đây chính là đối tượng trung tâm của "danh bạ HLV"/nhắn tin ở đợt này. Đã bổ sung `community.read`/`community.post.create`/`community.post.manage_own` cho `trainer` cùng lúc với 2 quyền mới, đưa `trainer` lên ngang hàng `content_creator` về quyền cộng đồng — thay đổi chỉ cộng thêm, không ảnh hưởng vai trò khác.
- Kid mode: một hàm dùng chung `assertCanInteract(actorUserId, targetUserId)` trong `community-social.service.ts` — tra `isManagedAccount` của cả hai (truy vấn trực tiếp `users`, vì `CurrentUserType`/JWT hiện không mang cờ này), nếu một trong hai managed thì bắt buộc `EXISTS` một `group_users` chung.

## Test Evidence

- Unit test: gửi tin nhắn tạo hội thoại mới đúng chuẩn hoá cặp userId, gửi tiếp không tạo hội thoại trùng; chặn hai chiều thì từ chối gửi tin nhắn (cả hai chiều); kid mode chặn đúng khi một trong hai bên managed và không cùng lớp, cho phép khi cùng lớp; theo dõi/bỏ theo dõi idempotent; chặn tự huỷ theo dõi hai chiều; danh sách người có thể nhắn tin đúng theo từng trường hợp (managed → bạn cùng lớp; không managed → HLV/đang theo dõi/đã từng chat); danh bạ HLV chỉ trả về trainer đã bật hồ sơ công khai.
- `pnpm lint-tsc-api`/`lint-tsc-web` sạch, `pnpm test:api`/`test:web` xanh.
- Xác minh thủ công qua Caddy (`tenant1.lms.localhost`): hai tài khoản thật gửi tin nhắn qua lại, xác nhận nhận realtime qua WebSocket; theo dõi/chặn qua API, kiểm tra `GET relationship` phản ánh đúng; kiểm managed account (từ L5) không nhắn được người ngoài lớp.

## Follow-up Work (explicitly not done in this pass)

- **CLB tự phục vụ** (self-service club khác `groups` do admin quản lý: xin gia nhập, quyền leader chi tiết, danh sách chặn riêng theo CLB) — hệ thống thành viên song song đủ lớn để tách đợt riêng.
- **Dòng hoạt động bạn bè (activity feed)** — cần thêm một chiều theo dõi hoạt động xuyên suốt nhiều loại sự kiện (bài đăng, ván đấu, puzzle...), phạm vi riêng.
- **Kid mode cho các tính năng đã có từ trước** (diễn đàn, bình luận) — đợt này chỉ áp dụng cho 2 tính năng mới (nhắn tin, theo dõi); nội dung diễn đàn/bình luận managed account vẫn theo đúng hành vi hiện có, có thể xem lại nếu phát sinh vấn đề thực tế.
- **Nhắn tin nhóm, thu hồi/sửa tin nhắn, báo đã xem (read receipt) hiển thị UI, chỉ báo đang gõ** — chỉ làm 1-1 gửi/nhận/đánh dấu đã đọc cơ bản.
- **Thông báo email/push khi có tin nhắn mới** — chỉ đẩy realtime qua WebSocket lúc đang mở ứng dụng, không gửi email như `course-chat` mention.
- **Ô tìm kiếm toàn bộ người dùng tenant để bắt đầu chat** — cố ý thu hẹp còn danh sách gợi ý (bạn cùng lớp/HLV/đang theo dõi/đã từng chat) để giữ bề mặt liên hệ hẹp, phù hợp môi trường trường học.
