# Deep Analytics — Phase 2 (Org-level) Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (xem `docs/research/learnhouse/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt 5 của roadmap "còn thiếu so với LearnHouse" mở rộng trang phân tích cấp tổ chức (`/statistics` admin) với các chỉ số theo dõi xu hướng theo thời gian mà bản hiện tại (5 thẻ số liệu tĩnh: khóa phổ biến, ghi danh, tỉ lệ hoàn thành, chuyển đổi freemium, điểm quiz trung bình) chưa có. Khảo sát trước khi code (2026-07-26) xác nhận: hệ thống **đã có** một bảng ghi nhận hoạt động hàng ngày theo từng người dùng (`user_statistics.activityHistory`, dạng `{"yyyy-MM-dd": true}`) phục vụ tính năng streak — bảng này đủ dữ liệu để tính **xu hướng người dùng hoạt động hàng ngày (DAU)**, **người dùng mới-vs-quay-lại**, và **mức độ hoạt động theo ngày trong tuần**, mà **không cần** thêm pipeline sự kiện mới hay Tinybird/ClickHouse. Ngược lại, **bản đồ nhiệt theo giờ trong ngày** (peak-hours heatmap) **không khả thi** ở đợt này vì `activityHistory` chỉ lưu theo ngày, không có mốc giờ — mục này bị loại khỏi phạm vi (xem Non-Goals).

## Who Uses It

- Admin tenant xem trang `/statistics` (org-level analytics) — hiểu xu hướng tăng trưởng/gắn kết người dùng theo thời gian, không chỉ số liệu tức thời.
- Không có luồng học viên nào bị ảnh hưởng — đây thuần là tính năng chỉ đọc dành cho admin.

## Feature Functions

### 1. Xu hướng người dùng hoạt động hàng ngày (DAU trend)

- Biểu đồ đường/cột theo ngày trong N ngày gần nhất (mặc định 30 ngày, có thể đổi qua tham số truy vấn `days`), mỗi điểm là **số người dùng riêng biệt hoạt động trong ngày đó** (tính từ khóa của `activityHistory` có giá trị `true`).
- Tính từ toàn bộ user trong tenant hiện tại (không lọc theo vai trò) — đủ để admin thấy nhịp độ sử dụng chung.
- Không tính người dùng đã xóa (`deletedAt IS NOT NULL` bị loại).

### 2. Người dùng mới vs quay lại (New vs Returning)

- Với cùng khoảng N ngày, mỗi ngày phân loại số người dùng hoạt động thành 2 nhóm: **mới** (ngày hoạt động đầu tiên xuất hiện trong `activityHistory` của họ trùng với ngày đang xét) và **quay lại** (đã có ít nhất 1 ngày hoạt động trước đó trong lịch sử của họ, tính trong toàn bộ `activityHistory` được lưu — không giới hạn N ngày khi xác định "đã từng hoạt động trước đây").
- Hiển thị dạng biểu đồ cột chồng (stacked bar): mới (màu 1) + quay lại (màu 2) mỗi ngày.

### 3. Cohort retention theo tuần ghi danh

- Nhóm học viên theo **tuần ghi danh khóa học đầu tiên** của họ (`student_courses.enrolledAt`, lấy ghi danh sớm nhất mỗi học viên trong toàn tenant — không phải theo từng khóa riêng lẻ, để tránh một học viên xuất hiện ở nhiều cohort).
- Với mỗi cohort tuần, tính tỉ lệ phần trăm học viên trong cohort đó **còn hoạt động** (xuất hiện trong `activityHistory` với giá trị `true`) ở tuần thứ 0, 1, 2, 3, 4 sau khi ghi danh (5 cột, mặc định — có thể ít hơn nếu cohort quá gần hiện tại thì các tuần chưa tới sẽ hiển thị "chưa đủ dữ liệu" thay vì 0%).
- Hiển thị dạng bảng ma trận (hàng = cohort tuần, cột = tuần thứ N sau ghi danh, ô = % retention), giống bố cục cohort-retention chuẩn ngành.
- Giới hạn 12 cohort gần nhất (12 tuần) để bảng không quá dài.

### 4. Mức độ hoạt động theo ngày trong tuần (thay cho bản đồ nhiệt giờ)

- Vì không có dữ liệu giờ, thay bằng biểu đồ cột 7 cột (Thứ 2 → Chủ nhật), mỗi cột là **tổng số lượt hoạt động** rơi vào ngày-trong-tuần đó, cộng dồn trên toàn bộ lịch sử `activityHistory` hiện có (không giới hạn N ngày — càng nhiều dữ liệu, xu hướng theo thứ trong tuần càng rõ).
- Giúp admin biết học viên có xu hướng học vào ngày nào trong tuần để lên lịch thông báo/sự kiện phù hợp.

### 5. Phân bố điểm quiz và bài tập

- Biểu đồ histogram điểm số (theo khoảng 10%: 0-9%, 10-19%, ..., 90-100%) tổng hợp từ **toàn bộ lượt làm quiz đã hoàn thành** (`quiz_attempts.score`, đã có sẵn) trong toàn tenant.
- Tương tự cho bài tập (`assignment_user_task_submissions` hoặc bảng điểm bài tập tương ứng đã có ở Assignment engine) — 2 biểu đồ riêng, cùng bố cục.

### 6. Tỉ lệ cấp chứng chỉ

- Tỉ lệ phần trăm: (số học viên đã hoàn thành khóa học `student_courses.completedAt IS NOT NULL`) mà **có** chứng chỉ đang hiệu lực (`certificates.status = 'active'` — kiểm tra giá trị enum chính xác trong schema) / tổng số học viên đã hoàn thành khóa học, tính trên toàn tenant.
- Hiển thị dạng số liệu lớn (giống style thẻ số hiện có: FreemiumConversion) kèm mô tả ngắn.

### 7. Điểm gắn kết học viên (Engagement Score) — org-level summary

- Một điểm tổng hợp (0-100) tính trung bình trên toàn tenant, công thức minh bạch (không phải machine learning): trọng số bằng nhau giữa 3 thành phần chuẩn hóa về thang 0-100 mỗi thành phần: (a) tỉ lệ ngày hoạt động trong 30 ngày gần nhất so với 30 (từ `activityHistory`), (b) tỉ lệ hoàn thành trung bình các khóa đã ghi danh (`student_courses.progress`), (c) tỉ lệ đạt quiz trung bình (`isQuizPassed` trong `student_lesson_progress`). Điểm cuối = trung bình cộng 3 thành phần, làm tròn số nguyên.
- Hiển thị dạng số liệu lớn kèm giải thích ngắn khi hover (tooltip liệt kê 3 thành phần).

### 8. Xuất báo cáo phân tích nâng cao (XLSX)

- Nút "Xuất báo cáo nâng cao" trên trang `/statistics`, tải file XLSX gồm các sheet: DAU 30 ngày, cohort retention, phân bố điểm quiz/bài tập, tỉ lệ chứng chỉ — theo đúng pattern xuất file hiện có (`report.service.ts`/`report.controller.ts`).

## End-User Value

Admin nhìn được xu hướng tăng trưởng và gắn kết theo thời gian thay vì chỉ số tức thời, giúp ra quyết định (ví dụ: cohort tuần nào rớt nhiều → xem lại nội dung tuần đó; ngày nào hoạt động thấp → lên lịch nhắc nhở).

## How It Works

- Toàn bộ tính toán chạy trên Postgres qua Drizzle, đọc `users.tenantId`-scoped bởi RLS hiện có (không tự thêm điều kiện `tenantId` thủ công, theo đúng convention `analytics.repository.ts`/`course-analytics.repository.ts` hiện tại).
- Truy vấn `activityHistory` (jsonb) dùng `jsonb_each_text`/`jsonb_object_keys` trong SQL thô qua `sql` template của Drizzle để "mở" object thành hàng (ngày, giá trị) — tương tự cách `course-analytics.repository.ts` đã dùng `sql<T>` cho các biểu thức không có sẵn trong Drizzle query builder.
- Repository mới: `apps/api/src/analytics/repositories/analytics.repository.ts` (mở rộng, không tạo file mới) — thêm `getDauTrend(days)`, `getNewVsReturning(days)`, `getCohortRetention()`, `getWeekdayActivity()`, `getScoreDistribution()`, `getCertificateIssuanceRate()`, `getEngagementScore()`.
- Service `analytics.service.ts` xử lý hậu kỳ (tính % từ số thô, làm tròn) — theo đúng pattern `course-analytics.service.ts` (SQL trả dữ liệu thô, JS tính phần trăm/bucket).
- Endpoint mới trong `analytics.controller.ts` (route mới, không đụng route `active-users` công khai hiện có): `GET /analytics/dau-trend`, `GET /analytics/new-vs-returning`, `GET /analytics/cohort-retention`, `GET /analytics/weekday-activity`, `GET /analytics/score-distribution`, `GET /analytics/certificate-issuance-rate`, `GET /analytics/engagement-score` — tất cả gate bằng `PERMISSIONS.STATISTICS_READ` (không dùng `COURSE_STATISTICS` vì đây là org-level, không phải course-level; không dùng `AnalyticsSecretGuard` vì đó dành riêng cho endpoint giám sát bên ngoài không qua UI admin).
- Export: `apps/api/src/report/report.service.ts` thêm `generateAdvancedAnalyticsReport()`, endpoint `GET /report/advanced-analytics` theo đúng mẫu `generateSummaryReport`/`GET /report/summary`.
- Frontend: mở rộng `apps/web/app/modules/Statistics/Admin/AdminStatistics.tsx` — thêm các card biểu đồ mới vào lưới hiện có (không tạo hệ thống tab mới vì trang org-level hiện tại không có tab, khác với course-level đã có tab) dùng **recharts** (đã có sẵn trong repo, không thêm thư viện). Mỗi widget một component riêng trong `apps/web/app/modules/Statistics/Admin/components/`, theo đúng mẫu `FiveMostPopularCourses`/`Enrollment` hiện có. Query hook mới trong `apps/web/app/api/queries/admin/`.

## Non-Goals (đợt này)

- **Bản đồ nhiệt theo giờ trong ngày** — không khả thi vì dữ liệu hoạt động (`activityHistory`) chỉ có độ phân giải theo ngày, không có mốc giờ. Thay bằng "mức độ hoạt động theo ngày trong tuần" (mục 4).
- Không thêm event-tracking pipeline mới, không Tinybird/ClickHouse — quyết định kiến trúc cũ vẫn giữ nguyên.
- Không mở rộng phần course-level (đã đủ 4 báo cáo từ PR #6) — đợt này chỉ org-level.
- Không thêm bộ lọc theo khoảng ngày tùy chỉnh trên UI — chỉ tham số cố định N=30 ngày (có thể đổi qua query string cho API, nhưng UI dùng mặc định).
- Retention cohort giới hạn 12 tuần gần nhất, không phân trang — nếu cần xem xa hơn, để đợt sau.

## Key Technical Context

- `apps/api/src/analytics/repositories/analytics.repository.ts`, `apps/api/src/analytics/services/analytics.service.ts`, `apps/api/src/analytics/analytics.controller.ts`.
- `apps/api/src/storage/schema/index.ts` — bảng `userStatistics` (`activityHistory` jsonb), `studentCourses` (`enrolledAt`, `completedAt`, `progress`), `studentLessonProgress` (`isQuizPassed`), `quizAttempts` (`score`), `certificates` (`status`, `issuedAt`).
- `apps/api/src/report/report.service.ts`, `apps/api/src/report/report.controller.ts`.
- `apps/web/app/modules/Statistics/Admin/AdminStatistics.tsx`, `apps/web/app/modules/Statistics/Admin/components/`.
- Permission dùng lại: `PERMISSIONS.STATISTICS_READ` (đã tồn tại trong `packages/shared/src/constants/permissions.ts`) — không thêm permission mới.

## Test Evidence

- `apps/api/src/analytics/services/__tests__/analytics.service.spec.ts` (8 test, Jest, Node 22): `getWeekdayActivity` điền 0 cho các ngày không có dữ liệu; `getCohortRetention` tính đúng % retention và trả `null` cho tuần chưa tới, sắp xếp cohort mới nhất trước; `getScoreDistribution` gộp đúng điểm quiz/bài tập vào khoảng 10%; `getCertificateIssuanceRate` tính đúng % (kể cả trường hợp mẫu số 0); `getEngagementScore` tính trung bình 3 thành phần đúng và không chia cho 0 khi chưa có ghi danh/lượt làm quiz nào.
- `pnpm exec tsc --noEmit` sạch cho cả `apps/api` và `apps/web` (Node 22).
- `pnpm exec eslint` sạch cho toàn bộ file mới/sửa của đợt 5.
- Toàn bộ Jest suite `apps/api` (56 suite / 342 test) và Vitest suite `apps/web` (47 file / 228 test, 12 skip có sẵn từ trước) chạy lại sau khi thêm test mới — không có hồi quy.
- Kiểm tra thủ công qua đọc code: các truy vấn jsonb (`jsonb_each_text` trên `activity_history`) đã kiểm tra cú pháp SQL hợp lệ qua `db.execute` chạy thực tế trên DB dev lúc regenerate swagger schema (API khởi động thành công, không lỗi runtime ở tầng repository).
- Toàn bộ endpoint mới dùng đúng `PERMISSIONS.STATISTICS_READ` (org-level), tách biệt khỏi endpoint `active-users` công khai hiện có (secret-gated) — không mở rộng phạm vi truy cập không cần thiết.

## Follow-up Work (đợt sau, nếu cần)

- Bản đồ nhiệt theo giờ thật sự — cần một pipeline ghi nhận sự kiện có mốc thời gian (không chỉ ngày), để đánh giá sau khi có nhu cầu rõ ràng.
- Bộ lọc khoảng ngày tùy chỉnh trên UI.
- Cohort retention theo tháng (ngoài theo tuần).
