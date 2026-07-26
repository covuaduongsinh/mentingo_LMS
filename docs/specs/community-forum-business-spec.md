# Community Forum & Public Profile Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (xem `docs/research/learnhouse/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt 7 của roadmap "còn thiếu so với LearnHouse" thêm một **diễn đàn cộng đồng độc lập với khóa học** (khác với course-chat theo từng khóa và QA hiện có — hai tính năng đó giữ nguyên, không đụng tới) cùng **hồ sơ công khai** cho người dùng. Khảo sát trước khi code (2026-07-26) phát hiện phạm vi đầy đủ ban đầu (bài đăng + bình luận + upvote + **reaction emoji** + kiểm duyệt 10 tham số bao gồm **slow mode**, **tự khóa sau N ngày**, **yêu cầu email đã xác minh**) quá rộng cho một đợt — đặc biệt **hệ thống chưa có bất kỳ cơ chế xác minh email nào** (không có cột `emailVerified`/tương đương trong `users`), nên "yêu cầu email đã xác minh mới được đăng" không thể làm nếu không xây cả tính năng xác minh email từ đầu — việc đó lớn và độc lập, không phải phần của diễn đàn. Đợt này **thu hẹp còn**: bài đăng + bình luận 1 cấp + upvote (bỏ reaction emoji), kiểm duyệt 2 tham số dễ triển khai và có giá trị cao nhất (danh sách từ chặn + số bài tối đa/ngày), và hồ sơ công khai cơ bản (username + avatar + bio, không hiển thị tiến độ học tập). Các phần còn lại chuyển sang Follow-up Work.

## Who Uses It

- Học viên/giáo viên đã đăng nhập — đọc, đăng bài, bình luận, upvote trong diễn đàn cộng đồng của trường; đặt `username` và bật hồ sơ công khai của riêng mình (mặc định tắt).
- Admin/kiểm duyệt viên — ghim/khóa bài, xóa bài/bình luận vi phạm, cấu hình danh sách từ chặn + số bài tối đa mỗi ngày.
- Khách vãng lai (chưa đăng nhập) — xem được hồ sơ công khai tại `/u/:username` nếu chủ tài khoản đã bật (không xem được diễn đàn — diễn đàn yêu cầu đăng nhập, khác hẳn public profile).

## Feature Functions

### 1. Bài đăng cộng đồng

- Mỗi bài đăng có: tiêu đề, nội dung (rich-text, tái dùng editor hiện có), **nhãn** chọn từ danh sách cố định (Thảo luận chung / Hỏi đáp / Thông báo / Chia sẻ / Góp ý — 5 nhãn cố định, không cho tạo nhãn tùy ý), tác giả, số lượt upvote, số bình luận, trạng thái ghim (`pinned`), trạng thái khóa (`locked` — khóa thì không bình luận thêm được nhưng vẫn đọc được), thời điểm tạo/sửa gần nhất.
- Danh sách bài đăng: lọc theo nhãn, sắp xếp theo mới nhất hoặc nhiều upvote nhất, bài ghim luôn hiện đầu danh sách bất kể sắp xếp. Phân trang giống mẫu `announcements` hiện có.
- Chỉ tác giả hoặc kiểm duyệt viên mới sửa/xóa được bài của mình; kiểm duyệt viên xóa/ghim/khóa được bài của bất kỳ ai.

### 2. Bình luận (1 cấp, không lồng nhau)

- Mỗi bình luận thuộc về đúng 1 bài đăng, không có bình luận trả lời bình luận (giữ đơn giản — khác course-chat có `parentMessageId` lồng nhau).
- Bình luận có upvote riêng (độc lập với upvote bài đăng).
- Không bình luận được vào bài đã khóa (`locked = true`) — kể cả tác giả bài đăng.
- Tác giả bình luận hoặc kiểm duyệt viên mới xóa được.

### 3. Upvote

- Mỗi người dùng chỉ upvote được 1 lần cho mỗi bài đăng/bình luận (ràng buộc unique theo user+target), bấm lại để bỏ upvote (toggle).

### 4. Kiểm duyệt (thu hẹp còn 2 tham số)

- **Danh sách từ chặn** (`communityBlockedWords`, mảng chuỗi trong Settings): khi tạo/sửa bài đăng hoặc bình luận, nếu tiêu đề/nội dung (đã strip HTML) chứa nguyên văn (không phân biệt hoa/thường) bất kỳ từ nào trong danh sách, từ chối với thông báo rõ ràng — không tự động che từ, chặn hẳn để tác giả tự sửa.
- **Số bài đăng tối đa/ngày** (`communityMaxPostsPerDay`, mặc định 10): đếm số bài đăng (không tính bình luận) người dùng đã tạo trong 24 giờ gần nhất (không phải theo ngày dương lịch — dùng cửa sổ trượt cho công bằng múi giờ), nếu đạt hoặc vượt, từ chối tạo bài mới với thông báo rõ ràng. Không giới hạn số bình luận (bình luận là tương tác nhẹ, giới hạn bài đăng đã đủ chống spam).
- Cả 2 tham số áp dụng chung cho toàn tenant (không phải theo từng người dùng riêng).

### 5. Hồ sơ công khai

- Thêm cột `username` trên `users` (duy nhất theo tenant, giống `email`) — người dùng tự đặt trong trang cài đặt cá nhân (chữ thường, số, gạch dưới, gạch ngang, 3-30 ký tự).
- Thêm cờ `publicProfileEnabled` (mặc định **tắt**) — người dùng tự bật/tắt trong cài đặt cá nhân.
- Trang `/u/:username` — **công khai, không cần đăng nhập** — hiển thị: avatar, tên hiển thị (firstName + lastName), username, bio (tái dùng `userDetails.description` sẵn có, đã dùng cho hồ sơ giáo viên — dùng chung field, không tạo cột trùng lặp). **Không hiển thị**: email, tiến độ học tập, danh sách khóa học, số liệu thống kê cá nhân (streak, v.v.) — chỉ thông tin công khai thuần túy tác giả tự nguyện chia sẻ.
- Nếu `username` chưa được đặt hoặc `publicProfileEnabled = false`, trang trả về "không tìm thấy hồ sơ" (không phân biệt giữa "không tồn tại" và "có nhưng đã tắt" để tránh dò username).

## End-User Value

Cộng đồng học viên/giáo viên có nơi trao đổi chung không giới hạn trong một khóa học cụ thể; người dùng có thể tự giới thiệu bản thân qua hồ sơ công khai nếu muốn.

## How It Works

- **Bảng mới**: `community_posts` (`id`, `authorId`, `title`, `content` text, `label` varchar enum cố định, `pinned` boolean default false, `locked` boolean default false, `upvoteCount` integer default 0 — đếm dồn, cập nhật khi vote để tránh COUNT() mỗi lần đọc danh sách, `tenantId` + RLS), `community_comments` (`id`, `postId` FK cascade, `authorId`, `content` text, `upvoteCount` integer default 0, `tenantId` + RLS), `community_votes` (`id`, `userId`, `targetType` enum `post`|`comment`, `targetId` uuid, unique `(userId, targetType, targetId)`, `tenantId` + RLS) — theo đúng mẫu RLS `chess_exercises`/`0163` các đợt trước.
- **Cột mới trên `users`**: `username` (varchar, nullable, unique theo `(tenantId, username)` — cùng mẫu `emailUniqueIdx`), `publicProfileEnabled` (boolean default false).
- **Repository/Service/Controller** theo đúng mẫu `announcements` (phân trang qua `addPagination`, lọc qua mảng `conditions` + `and(...)`, đếm tổng qua transaction) — module mới `apps/api/src/community/`.
- **Kiểm tra từ chặn**: hàm nhỏ so khớp case-insensitive trên plain-text đã strip HTML, chạy trong service trước khi insert.
- **Kiểm tra số bài/ngày**: đếm `community_posts` của user với `createdAt >= NOW() - INTERVAL '24 hours'`.
- **Permission mới** (`packages/shared/src/constants/permissions.ts`, theo đúng mẫu `COURSE_DISCUSSION_*`/`ASSIGNMENT_*`): `COMMUNITY_READ`, `COMMUNITY_POST_CREATE`, `COMMUNITY_POST_MANAGE_OWN` (sửa/xóa bài & bình luận của chính mình), `COMMUNITY_MODERATE` (ghim/khóa/xóa của người khác) — gán cho vai trò: student/content_creator có 3 quyền đầu, admin có thêm `COMMUNITY_MODERATE`.
- **Settings mới** (`globalSettingsJSONSchema`): `communityForumEnabled: Boolean` (mặc định false — tính năng tắt hoàn toàn cho tới khi admin bật, tránh xuất hiện đột ngột trên tenant đang chạy), `communityBlockedWords: Type.Array(Type.String())` (mặc định rỗng), `communityMaxPostsPerDay: Type.Number({minimum: 1})` (mặc định 10).
- **Frontend**: module mới `apps/web/app/modules/Community/` (danh sách + chi tiết bài đăng + form tạo/sửa, theo mẫu `announcements`/`qaView`), trang `apps/web/app/modules/PublicProfile/PublicProfile.page.tsx` đăng ký route `u/:username` **ngay dưới `NavigationWrapper`** (ngang hàng `PublicDashboard.layout`, không bọc trong route yêu cầu đăng nhập) theo đúng khảo sát routing hiện có — trang tự ẩn nội dung khi API trả "không tìm thấy", không có gate ở tầng router. Thêm ô `username` + switch `publicProfileEnabled` vào trang cài đặt cá nhân hiện có.

## Non-Goals (đợt này — chuyển sang Follow-up Work)

- **Reaction emoji**: hoãn — upvote đã đủ cho tương tác cơ bản; emoji đa dạng cần thêm bảng + UI picker, để đợt sau.
- **Slow mode** (giới hạn giây giữa các bài): hoãn — `communityMaxPostsPerDay` đã chống spam ở mức thô, slow-mode chi tiết hơn để sau nếu cần.
- **Tự khóa bài sau N ngày không hoạt động**: hoãn — cần cron mới, chưa cấp thiết ở quy mô một trường học.
- **Yêu cầu email đã xác minh mới được đăng**: hoãn hẳn — hệ thống **chưa có cơ chế xác minh email nào** (không có cột `emailVerified`), xây dựng việc đó là một tính năng độc lập lớn, không phải phần việc của diễn đàn.
- **Hiển thị tiến độ học tập trên hồ sơ công khai**: không làm — hồ sơ công khai chỉ chứa thông tin tác giả tự nguyện chia sẻ (avatar/bio/username), không lộ dữ liệu học tập.
- **Bình luận lồng nhau** (reply-to-reply): chỉ 1 cấp, giống quyết định giữ đơn giản của course-chat không áp dụng — course-chat có lồng nhau (`parentMessageId`) nhưng diễn đàn cộng đồng cố tình đơn giản hơn.
- **Command palette / tìm kiếm toàn cục cho diễn đàn**: dùng tìm kiếm global-search hiện có nếu cần, không xây riêng.

## Key Technical Context

- `apps/api/src/storage/schema/index.ts` — bảng `communityPosts`, `communityComments`, `communityVotes`; cột `username`/`publicProfileEnabled` trên `users`.
- `apps/api/src/community/` (mới) — module/controller/service/repository theo mẫu `apps/api/src/announcements/`.
- `packages/shared/src/constants/permissions.ts` — 4 permission mới.
- `apps/api/src/settings/schemas/settings.schema.ts`, `constants/settings.constants.ts`, `settings.service.ts` — 3 field mới.
- `apps/web/routes.ts` — route `u/:username` mới.
- `apps/web/app/modules/Community/` (mới), `apps/web/app/modules/PublicProfile/` (mới).
- `apps/web/app/modules/Dashboard/Settings/` — thêm ô username + switch publicProfileEnabled vào trang cài đặt cá nhân hiện có.

## Test Evidence

- `apps/api/src/community/__tests__/community.service.spec.ts` (13 test, Jest, Node 22): từ chối khi diễn đàn tắt; từ chối bài chứa từ cấm; từ chối khi đạt hạn mức bài/ngày; tạo bài thành công khi hợp lệ; chủ bài với quyền `manage_own` sửa/xóa được bài của mình, người khác không có quyền `moderate` bị từ chối, kiểm duyệt viên xóa được bài bất kỳ; ghim/khóa yêu cầu quyền `moderate`; bình luận vào bài đã khóa bị từ chối, bài chưa khóa thì tạo được; vote báo lỗi "không tìm thấy" với bài không tồn tại, toggle đúng khi bài tồn tại.
- `apps/api/src/public-profile/__tests__/public-profile.service.spec.ts` (8 test, Jest, Node 22): trả về "không tìm thấy" chung cho cả username không tồn tại lẫn `publicProfileEnabled=false` (không phân biệt được, đúng thiết kế chống dò username); trả đúng URL avatar khi có avatar, `null` và **không gọi FileService** khi không có avatar; từ chối username sai định dạng, đã bị trùng, hoặc bật hồ sơ công khai mà chưa có username; cập nhật đúng username/visibility/bio khi hợp lệ; cho phép xóa username đồng thời tắt hồ sơ công khai mà không gọi kiểm tra trùng lặp.
- `pnpm exec tsc --noEmit` sạch cho cả `apps/api` và `apps/web` (Node 22).
- `pnpm exec eslint` sạch cho toàn bộ file mới/sửa của đợt 7.
- Toàn bộ Jest suite `apps/api` (59 suite / 370 test) và Vitest suite `apps/web` (47 file / 228 test, 12 skip có sẵn từ trước) chạy lại sau khi thêm test mới — không có hồi quy.
- Migration `0175`/`0176` áp dụng thành công lên DB dev; RLS xác nhận bật đúng theo mẫu `chess_exercises` cho cả 3 bảng `community_posts`/`community_comments`/`community_votes`.
- Kiểm tra thủ công qua đọc code: route `/api/public-profile/settings/me` và `/api/public-profile/settings` được đặt **trước** route wildcard `/api/public-profile/:username` trong controller — xác nhận NestJS khớp route theo thứ tự khai báo, tránh "settings" bị hiểu nhầm thành một giá trị username.

## Follow-up Work (đợt sau, nếu cần)

- Reaction emoji trên bài đăng/bình luận.
- Slow mode + tự khóa bài sau N ngày không hoạt động.
- Yêu cầu email đã xác minh mới được đăng — phụ thuộc vào việc xây dựng cơ chế xác minh email (chưa tồn tại) như một tính năng riêng.
- Hiển thị tiến độ học tập (opt-in) trên hồ sơ công khai nếu có nhu cầu thực tế.
