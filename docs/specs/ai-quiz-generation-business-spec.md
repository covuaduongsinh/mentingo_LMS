# AI Quiz Generation Business Spec

> Đặc tả này mô tả hành vi nghiệp vụ độc lập, viết ra sau khi khảo sát một hệ thống tham khảo cấp phép AGPL-3.0 (xem `docs/research/learnhouse/`). Không chứa mã nguồn hay văn bản trích dẫn trực tiếp từ hệ thống đó.

## Business Overview

Đợt 6 của roadmap "còn thiếu so với LearnHouse" ban đầu dự kiến 3 việc lớn: sinh quiz bằng AI, sinh bài tập bằng AI, và "Ask-AI" (RAG chat) trên mọi bài học. Khảo sát trước khi code (2026-07-26) phát hiện: **pipeline RAG hiện tại gắn cứng vào bảng `ai_mentor_lessons`** (mọi truy vấn tài liệu đều join qua `document_to_ai_mentor_lesson` → `ai_mentor_lessons.lesson_id`) — mở rộng RAG ra "mọi bài học" đòi hỏi tổng quát hóa lược đồ liên kết tài liệu, một quyết định kiến trúc cần đặc tả và review riêng, không phải việc làm thêm nhanh trong đợt này. Tương tự, **chưa có service nào gom nội dung toàn bộ khóa học thành văn bản** để làm ngữ cảnh cho AI (chỉ có truy vấn từng lesson/course riêng lẻ cho tìm kiếm), và **chưa có bất kỳ cơ chế hạn mức (quota) nào trong toàn bộ codebase** để soi theo. Vì vậy đợt này **thu hẹp phạm vi chỉ còn sinh quiz bằng AI từ nội dung một bài học**, theo đúng tinh thần "làm ít nhưng chắc" đã áp dụng ở các đợt trước (ví dụ đợt 2 hoãn 2 loại task mới, đợt 3 hoãn đo mật khẩu vì đã có sẵn). Sinh bài tập bằng AI và Ask-AI RAG chat chuyển sang mục Follow-up Work.

## Who Uses It

- Giáo viên/trợ giảng biên soạn bài học loại quiz (đã có quyền `course.ai_generation` — quyền đã tồn tại, dùng cho tính năng sinh khóa học bằng Luma) — bấm "Sinh câu hỏi bằng AI" khi đang tạo/sửa một bài học quiz, xem trước đề xuất, sửa/xóa/thêm câu hỏi tùy ý trước khi lưu thật.
- Admin tenant — cấu hình hạn mức số lượt sinh AI mỗi tháng cho toàn tenant (một con số trong Settings hiện có).

## Feature Functions

### 1. Sinh câu hỏi quiz từ nội dung một bài học

- Trong màn hình tạo/sửa bài học loại Quiz, thêm nút "Sinh câu hỏi bằng AI" mở một dialog: chọn **bài học nguồn** (mặc định là bài học hiện tại đang soạn nếu đã có nội dung; hoặc cho chọn một bài học `content` khác trong cùng khóa học làm nguồn ngữ cảnh — ví dụ sinh quiz ôn tập từ một bài giảng lý thuyết), chọn **số lượng câu hỏi** muốn sinh (1-10, mặc định 5).
- Hệ thống lấy `title` + `description` (đã tách plain-text khỏi rich-text HTML) của bài học nguồn làm ngữ cảnh, gọi AI sinh ra danh sách câu hỏi **trắc nghiệm một đáp án đúng** (loại đơn giản nhất, khớp với `singleChoice` đã có trong hệ thống quiz) — mỗi câu gồm: nội dung câu hỏi, 4 phương án, đúng 1 phương án được đánh dấu đúng, giải thích ngắn cho đáp án đúng.
- Kết quả trả về là **bản nháp**, không tự động ghi vào cơ sở dữ liệu — bản nháp được điền sẵn vào đúng form tạo/sửa bài học quiz **đã có sẵn** (không tạo luồng lưu mới), tác giả xem lại, sửa từ ngữ, xóa câu không ưng ý, thêm câu thủ công, rồi bấm nút "Lưu bài học" hiện có để lưu thật — dùng lại nguyên vẹn API tạo/sửa quiz lesson đã kiểm thử, không có đường ghi dữ liệu mới nào cho nội dung câu hỏi.
- Nếu bài học nguồn không đủ nội dung (dưới 50 ký tự plain-text), từ chối với thông báo rõ ràng thay vì gọi AI ra kết quả vô nghĩa.

### 2. Ghi nhận nhật ký sinh AI

- Mỗi lần gọi sinh (thành công hay thất bại) đều tạo một bản ghi trong bảng `ai_generations`: loại tạo tác (`quiz`, để mở rộng loại khác sau này), người dùng, bài học nguồn, số câu hỏi yêu cầu, trạng thái (`completed`/`failed`), thời điểm.
- Đây thuần là nhật ký kiểm toán (audit trail) — không có UI xem lại nhật ký ở đợt này (có thể thêm sau nếu cần).

### 3. Hạn mức sinh AI theo tháng, theo tenant

- Admin cấu hình `aiGenerationMonthlyLimit` trong Settings hiện có (mặc định 20 lượt/tháng cho toàn tenant — dùng chung cho mọi tác giả, không phải mỗi người 20 lượt).
- Trước khi gọi AI, đếm số bản ghi `ai_generations` có trạng thái `completed` được tạo trong tháng dương lịch hiện tại (theo tenant) — nếu đã đạt hoặc vượt hạn mức, từ chối với thông báo rõ ràng ("Đã đạt hạn mức sinh nội dung AI trong tháng này, vui lòng thử lại tháng sau hoặc liên hệ quản trị viên để tăng hạn mức").
- **Không** dùng cơ chế "giữ chỗ trước - trừ - hoàn lại khi lỗi" (reserve/deduct/refund) phức tạp — kiểm tra codebase xác nhận **chưa có tiền lệ nào** cho mẫu đó trong toàn bộ hệ thống. Thay vào đó dùng kiểm tra-trước-rồi-làm (check-then-act) đơn giản, cùng dạng với `assertMaxParallelSessionsAvailable()` (giới hạn phiên live-training song song) đã có — chỉ những lượt **thành công** mới tính vào hạn mức (lượt lỗi không trừ hạn mức, tương đương "hoàn lại" một cách tự nhiên vì chưa từng bị trừ).

## End-User Value

Giáo viên tiết kiệm thời gian soạn câu hỏi ôn tập từ nội dung đã có sẵn, vẫn giữ toàn quyền kiểm duyệt trước khi công bố cho học viên — không có nội dung AI nào đến tay học viên mà chưa qua mắt người.

## How It Works

- **Bảng mới `ai_generations`**: `id`, `tenantId` + RLS (mẫu `chess_exercises`/`0163`), `userId` (người yêu cầu), `artifactType` (text, giá trị `"quiz"` ở đợt này), `sourceLessonId` (uuid, nullable — bài học nguồn), `requestedCount` (integer), `status` (`"completed"` | `"failed"`), `createdAt`.
- **Service sinh câu hỏi mới** `apps/api/src/ai/services/quiz-generation.service.ts`, xây trên `ChatService` hiện có (`apps/api/src/ai/services/chat.service.ts`) — thêm một method mới `ChatService.generateStructured<T>(system, prompt, jsonSchema)` dùng `generateObject` từ Vercel `ai` SDK (đúng nguyên lý `ChatService.judge()` đã có, chỉ tổng quát hóa schema thay vì cố định schema chấm điểm) để nhận về đúng cấu trúc JSON câu hỏi thay vì text tự do.
- **Kiểm tra hạn mức**: `AiGenerationsRepository.countCompletedThisMonth(tenantId)` (dùng RLS hiện có, không cần lọc tenantId thủ công trong query) so với `settingsService.getAiGenerationMonthlyLimit()` (thêm field mới vào `globalSettingsJSONSchema`, mặc định 20, theo đúng mẫu `liveTrainingMaxParallelSessions`).
- **Lấy nội dung bài học nguồn**: tái dùng `lessonRepository.getLesson(id, language)` đã có (trả về `title`/`description` đã localize), tách plain-text khỏi HTML bằng một hàm strip-tags nhỏ viết mới (không có sẵn hàm dùng chung — hàm tương tự trong `seo.service.ts` là private, không export).
- **Endpoint mới**: `POST /api/ai/quiz-generation` (trong `AiController` hiện có, hoặc controller con `ai/quiz-generation`), nhận `{ sourceLessonId, language, questionCount }`, gate bằng `PERMISSIONS.COURSE_AI_GENERATION` (quyền đã tồn tại, đang dùng cho Luma course generation — cùng bản chất "tác giả yêu cầu AI tạo nội dung khóa học"). Trả về mảng câu hỏi nháp theo đúng hình dạng `optionSchema`/`questionSchema` con để frontend điền thẳng vào form.
- **Frontend**: nút "Sinh câu hỏi bằng AI" trong form tạo/sửa Quiz Lesson (`apps/web/app/modules/Admin/EditCourse/CourseLessons/NewLesson/QuizLessonForm/` hoặc thư mục tương ứng) mở dialog chọn bài học nguồn + số câu hỏi, gọi mutation mới, rồi gọi `form.setValue`/`append` vào field-array câu hỏi hiện có của react-hook-form — không có bước lưu riêng, tác giả vẫn bấm nút Lưu hiện có.

## Non-Goals (đợt này — chuyển sang Follow-up Work)

- **Sinh bài tập bằng AI**: hoãn — cùng mẫu "đề xuất rồi tác giả xác nhận" như quiz, nhưng gộp 2 tính năng lớn vào 1 đợt tăng rủi ro; tách đợt riêng.
- **Ask-AI RAG chat trên mọi bài học**: hoãn — pipeline RAG hiện tại (`rag.repository.ts`) gắn cứng vào `ai_mentor_lessons` qua khóa ngoại `document_to_ai_mentor_lesson.ai_mentor_lesson_id`; mở rộng ra mọi bài học đòi hỏi tổng quát hóa lược đồ liên kết tài liệu (hoặc tạo "bóng" `ai_mentor_lessons` cho mọi lesson, một giải pháp không sạch) — cần đặc tả kiến trúc riêng.
- **Sinh quiz từ toàn bộ nội dung khóa học** (nhiều bài học cùng lúc): chưa có service gom nội dung khóa học thành văn bản; đợt này chỉ sinh từ **một** bài học nguồn tại một thời điểm.
- **Cơ chế hạn mức kiểu reserve/deduct/refund giao dịch**: không có tiền lệ trong codebase; dùng đếm-trước-đơn-giản thay thế (xem mục 3).
- **Trang xem nhật ký AI cho admin**: bảng `ai_generations` chỉ phục vụ kiểm toán nội bộ/hạn mức ở đợt này, chưa có UI liệt kê.
- **Loại câu hỏi khác ngoài trắc nghiệm một đáp án đúng** (điền chỗ trống, đúng/sai, nhiều đáp án...): chỉ sinh `singleChoice` — loại phổ biến và dễ kiểm duyệt nhất.

## Key Technical Context

- Bảng mới: `apps/api/src/storage/schema/index.ts` (`aiGenerations`), migration mới theo đúng mẫu 2 file (create + RLS) như Đợt 4.
- `apps/api/src/ai/services/chat.service.ts` (thêm `generateStructured`), `apps/api/src/ai/services/quiz-generation.service.ts` (mới), `apps/api/src/ai/repositories/ai-generations.repository.ts` (mới).
- `apps/api/src/ai/ai.controller.ts` (endpoint mới), `apps/api/src/ai/ai.module.ts` (đăng ký provider mới).
- `apps/api/src/settings/schemas/settings.schema.ts`, `apps/api/src/settings/constants/settings.constants.ts`, `apps/api/src/settings/settings.service.ts` (field `aiGenerationMonthlyLimit`).
- `apps/api/src/lesson/repositories/lesson.repository.ts` (`getLesson`, tái dùng để lấy nội dung nguồn).
- Frontend: form tạo/sửa Quiz Lesson hiện có dưới `apps/web/app/modules/Admin/EditCourse/CourseLessons/NewLesson/QuizLessonForm/`.

## Test Evidence

- `apps/api/src/ai/services/__tests__/quiz-generation.service.spec.ts` (7 test, Jest, Node 22): từ chối khi bài học nguồn không tồn tại; từ chối (403) khi người dùng không sở hữu khóa học và không có `COURSE_UPDATE`; cho phép khi có `COURSE_UPDATE` bất kể ai sở hữu; từ chối khi nội dung nguồn quá ngắn (dưới 50 ký tự) mà không gọi AI; từ chối khi đã chạm hạn mức tháng mà không gọi AI; ghi log `completed` + trả về câu hỏi khi thành công; ghi log `failed` + ném lại lỗi khi AI provider lỗi.
- `pnpm exec tsc --noEmit` sạch cho cả `apps/api` và `apps/web` (Node 22).
- `pnpm exec eslint` sạch cho toàn bộ file mới/sửa của đợt 6.
- Toàn bộ Jest suite `apps/api` (57 suite / 349 test) và Vitest suite `apps/web` (47 file / 228 test, 12 skip có sẵn từ trước) chạy lại sau khi thêm test mới — không có hồi quy.
- Migration `0173`/`0174` áp dụng thành công lên DB dev; RLS xác nhận bật đúng theo mẫu `chess_exercises`.
- Kiểm tra thủ công qua đọc code: endpoint dùng đúng `PERMISSIONS.COURSE_AI_GENERATION` (quyền đã tồn tại, không thêm quyền mới); luồng "đề xuất rồi xác nhận" không có đường ghi dữ liệu mới nào cho nội dung câu hỏi — toàn bộ vẫn đi qua API tạo/sửa quiz lesson đã kiểm thử từ trước.

## Follow-up Work (đợt sau, nếu cần)

- Sinh bài tập bằng AI (đề xuất tasks cho assignment lesson) theo đúng mẫu "propose rồi xác nhận" của đợt này.
- Ask-AI RAG chat trên mọi bài học — cần đặc tả riêng để tổng quát hóa liên kết tài liệu↔bài học (hiện đang gắn cứng vào AI Mentor lesson).
- Sinh quiz từ nhiều bài học/toàn bộ khóa học — cần service gom nội dung khóa học trước.
- Trang admin xem nhật ký `ai_generations` + biểu đồ sử dụng hạn mức theo thời gian.
- Bộ công cụ AI ngay trong trình soạn thảo rich-text (viết tiếp, mở rộng, dịch, stream trực tiếp vào editor).
