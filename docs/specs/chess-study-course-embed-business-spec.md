# Chess Study Course Lesson Embed — Business Spec

> Clean-room business spec (AGPL reference surveyed separately). Đợt **S4**.

## Business Overview

Giáo viên nhúng một Study (và tùy chọn một Chapter) vào curriculum khóa học như lesson type `chess_study`. Học sinh đã ghi danh khóa học học study trong ngữ cảnh bài học — kể cả study `private` (grant tạm qua enrollment, không bắt buộc add member).

## Who Uses It

- Content creator / admin: tạo/sửa lesson chess_study trong curriculum builder.
- Learner enrolled (hoặc freemium chapter): xem/học study trong lesson player.

## Feature Functions

1. **Create lesson**: chapterId, title, description?, studyId, chapterId? (study chapter).
2. **Update link**: đổi study/chapter ref (owner of course).
3. **Learner load**: GET by lessonId → study detail + selected chapter(s); access if (can access lesson via enrollment/freemium/admin) AND study still exists.
4. **Deleted study**: placeholder message, not crash.
5. **Complete**: optional mark lesson complete (reuse existing student progress API if available for non-quiz types).

## Non-goals

- TipTap block embed; auto classroom members (C5 already separate).

## Technical

- `LESSON_TYPES.CHESS_STUDY = "chess_study"`
- Table `lesson_chess_studies` (lessonId unique FK, studyId FK set null, studyChapterId nullable FK set null)
- Endpoints on ChessController with unique method names: `createChessStudyLesson`, `getChessStudyLessonForLearner`, `updateChessStudyLesson`
