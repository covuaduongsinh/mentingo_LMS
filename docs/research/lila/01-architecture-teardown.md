# lila — Kiến trúc hệ thống (tài liệu tham khảo, không chứa code nguồn)

> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md) trước. Tài liệu này mô tả kiến trúc bằng lời để hiểu thiết kế, không phải hướng dẫn copy code.

## Tổng quan repo

lila ("li[chess in sca]la") là server của lichess.org, viết bằng **Scala 3** trên **Play Framework 2.8** (bản chỉnh sửa riêng), templating bằng **scalatags** (không dùng Twirl). Quy mô: **84 module Scala** trong `modules/`, **~34 package TypeScript/Sass** trong `ui/` (pnpm workspace), **~999 dòng route** trong `conf/routes` + 4 file route con (`clas.routes`, `team.routes`, `appeal.routes`, `report.routes`), **43 file i18n nguồn** (`translation/source/*.xml`), **74 controller**.

So với mentingo (pnpm + Turborepo, NestJS + Remix — toàn bộ TypeScript), lila là hệ thống **JVM/Scala thuần** ở backend với frontend TypeScript riêng biệt — khác biệt ngôn ngữ này khiến việc "trùng code vô tình" gần như không thể xảy ra, nhưng đồng thời cũng nghĩa là **không thể port trực tiếp bất kỳ file nào** — mọi thứ phải viết lại từ đặc tả nghiệp vụ.

## Backend (Scala/Play)

**Cấu trúc module**: mỗi thư mục con của `modules/` là một sbt project độc lập (danh sách đầy đủ khai trong `build.sbt`), theo mẫu `Env.scala` (composition root, dependency injection **thủ công** — không dùng framework DI như Nest) + các file logic chính (`XxxApi.scala` = tầng nghiệp vụ, `Xxx.scala`/`model.scala` = entity, `BsonHandlers.scala` = mapping MongoDB, `XxxForm.scala` = validate form, `XxxRepo.scala` = truy vấn DB).

**Module `core` là "hub" trung tâm**: định nghĩa interface & kiểu dữ liệu dùng chung để 83 module còn lại giao tiếp mà **không phụ thuộc trực tiếp lẫn nhau** — mọi tương tác chéo module đi qua `core` hoặc qua `Bus` (event bus nội bộ, publish/subscribe). Đây là điểm kiến trúc đáng học nhất của lila: cho phép 84 module tồn tại mà không tạo thành một đồ thị phụ thuộc rối rắm.

**Điểm vào ứng dụng**: `app/Env.scala` (composition root toàn cục, nối tất cả `Env` của từng module lại), `app/UiEnv.scala`, `app/controllers/` (74 controller nhận HTTP request), `app/views/` (render bằng scalatags — HTML sinh trực tiếp từ Scala code, không phải template engine tách biệt).

**ORM/DB**: **MongoDB** (ReactiveMongo), không phải SQL. Module `db` là tầng trừu tượng (`dsl`, `BSON` handlers, `AsyncColl`, `PaginatorAdapter`). Không có migration schema cứng nhắc kiểu Drizzle — MongoDB schema-less, mỗi module tự định nghĩa `BsonHandlers` để map document ↔ case class.

**Cache & rate-limit**: module `memo` — cache trong tiến trình (Caffeine) + `MongoCache` (cache bền vững) + `RateLimit`/`MongoRateLimit` + `SettingStore` (cấu hình động runtime, tương tự vai trò `settings` jsonb của mentingo nhưng lưu từng key riêng lẻ trong Mongo).

**Realtime**: module `socket` — WebSocket qua **Redis** (`RemoteSocket` — mỗi node backend giao tiếp qua Redis pub/sub để đồng bộ trạng thái socket phân tán), tương tự vai trò `@socket.io/redis-adapter` mà mentingo đã dùng. Module `room` là trừu tượng "phòng có chat" dùng chung bởi study/tournament/simul/swiss — một pattern tái sử dụng đáng chú ý (xem [04-subsystem-notes.md](./04-subsystem-notes.md)).

**Search**: module `search` — client tới **Elasticsearch** riêng (`lila-search`, một service tách biệt ngoài lila chính), dùng cho forum/team/study/game/ublog search. mentingo dùng PostgreSQL `tsvector`+GIN (`search_documents`) — đơn giản hơn nhưng đủ cho quy mô hiện tại, không cần thêm Elasticsearch.

**Phân tích engine**: module `fishnet` — cụm phân tích **Stockfish phân tán** (worker bên ngoài nhận job, trả kết quả qua HTTP polling), module `analyse`/`evalCache`/`explorer` xoay quanh nó. **Không áp dụng cho mentingo** (chính sách MIT-only cấm Stockfish/GPL — xem [00-cleanroom-policy.md](./00-cleanroom-policy.md)); mọi tính năng phân tích của mentingo dùng Arasan (MIT) qua BullMQ job, không có khái niệm "cụm worker phân tán" như fishnet.

**Mailer/Push**: `mailer` (gửi email), `push` (Firebase cho mobile + Web Push API) — mentingo đã có nodemailer/SES + chưa có push notification trình duyệt (ngoài phạm vi roadmap này).

**Thanh toán**: module `plan` — Stripe + PayPal (cả checkout mới lẫn IPN legacy), mô hình **donate/patron tự nguyện** (không phải bán khóa học). mentingo đã có Stripe cho mô hình bán khóa học + promotion codes — mô hình doanh thu khác hẳn, không port module `plan`.

## Frontend (`ui/`)

**Framework**: TypeScript thuần + **snabbdom** (virtual DOM tối giản, không phải React/Vue) + **Sass**. Tổ chức thành pnpm workspace monorepo (~34 package), build riêng qua `ui/build`.

Cấu trúc đáng chú ý:

- `ui/lib` — thư viện dùng chung lớn nhất: `ceval/` (chạy Stockfish **WASM ngay trong trình duyệt** cho phân tích client-side, không cần fishnet mỗi lần), `puz/` (engine dùng chung cho puzzle/storm/racer), `nvui/` (giao diện dành cho người khiếm thị dùng screen reader), `socket.ts`, `i18n.ts`, `storage.ts`/`objectStorage.ts` (IndexedDB cho cache offline).
- `ui/site` — bootstrap toàn site (topbar, sound, friends online, reload theo sự kiện server-sent).
- `ui/bits` — tập hợp script nhỏ, mỗi file phục vụ đúng 1 trang/tính năng (mô hình "mỗi trang một entry point JS riêng", khác hẳn SPA React của mentingo).
- `ui/round`, `ui/analyse`, `ui/puzzle`, `ui/tournament`... — mỗi package tương ứng 1 module nghiệp vụ backend, giữ đối xứng frontend/backend theo tên.

mentingo dùng Remix (SPA mode) + React + TanStack Query + shadcn/ui — mô hình SPA hiện đại hoàn toàn khác snabbdom. Không có gì để "port" ở tầng framework frontend; chỉ port **hành vi UI** (vẽ mũi tên trên bàn cờ, cây biến, dashboard puzzle...) viết lại bằng React.

## Routing

`conf/routes` (999 dòng) là **một file trung tâm** liệt kê mọi route dạng `METHOD /path controller.Method(params)` — không có hệ thống module tự động đăng ký route như NestJS decorator. Các domain lớn được tách ra file con qua cú pháp include (`-> /class clas.Routes`): `clas.routes` (lớp học), `team.routes`, `appeal.routes`, `report.routes`. Điểm kỹ thuật đáng học: tách route theo domain lớn ra file riêng giúp file gốc không phình quá lớn — mentingo hiện dùng `routes.ts` khai báo cây route lồng nhau (khác cách nhưng cùng mục tiêu).

## i18n

Module `coreI18n` định nghĩa enum `I18nModule` (43 domain: site, arena, emails, learn, activity, coordinates, study, class, contact, appeal, patron, coach, broadcast, streamer, tfa, settings, preferences, team, perfStat, search, tourname, faq, lag, swiss, puzzle, puzzleTheme, challenge, storm, ublog, insight, keyboardMove, timeago, oauthScope, dgt, video, voiceCommands, onboarding, features, nvui, variant, recap, app) — mỗi domain có 1 file XML nguồn riêng trong `translation/source/`, đồng bộ qua Crowdin. Sinh code type-safe từ XML (`bin/i18n-file-gen.ts`) → truy cập bản dịch qua `I18nKey.puzzle.xxx` có kiểm tra kiểu lúc biên dịch. mentingo dùng i18next với JSON phẳng theo namespace — ít cấu trúc hơn nhưng đơn giản hơn để bảo trì ở quy mô nhỏ.

## Nhận định kiến trúc tổng thể cho roadmap

1. **Module `core` + `Bus`** là mẫu thiết kế đáng tham khảo nhất — nhưng mentingo đã có mẫu tương đương tốt hơn cho JS/TS: **outbox pattern** (`apps/api/src/outbox/`) cho domain event bền vững + BullMQ cho job nền. Roadmap L1–L10 nên tiếp tục dùng outbox/BullMQ thay vì dựng lại một event bus riêng kiểu `Bus` của lila.
2. **Module `room`** (phòng có chat dùng chung cho study/tournament/simul/swiss) là mẫu tái sử dụng tốt — mentingo đã có tiền lệ tương đương ngay trong PR #19 (bàn phân tích cờ cộng tác): mở rộng `WsGateway` chung với event `join:<domain>` theo từng phòng, thay vì tạo gateway riêng cho mỗi tính năng L2/L4/L6.
3. **MongoDB schema-less** của lila không áp dụng được cho mentingo (PostgreSQL + Drizzle + RLS multi-tenant) — mọi entity ở [02-data-model.md](./02-data-model.md) phải thiết kế lại thành bảng quan hệ có `tenant_id` + RLS theo đúng pattern hiện có của mentingo (`chess_exercises`/`0163` làm mẫu).
4. **fishnet/Stockfish/chessground** không port được do ràng buộc license — mọi tính năng liên quan (phân tích engine, bàn cờ WASM) dùng Arasan + `chess.js` (đã ghi rõ ở [00-cleanroom-policy.md](./00-cleanroom-policy.md)).
5. mentingo có nền tảng hạ tầng (RLS multi-tenant, outbox, BullMQ, permission matrix, generated API client giữ đồng bộ contract) **vững chắc và hiện đại hơn** lila ở nhiều điểm hạ tầng — khi port tính năng, nên **giữ nguyên hạ tầng mentingo và chỉ vay mượn phần thiết kế nghiệp vụ** (data model, business rules, thuật toán Glicko-2) của lila, không vay mượn cách tổ chức hạ tầng Scala/MongoDB/snabbdom của nó.
