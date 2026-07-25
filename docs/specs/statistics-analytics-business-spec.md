# Statistics And Analytics Business Spec

## Business Overview

Statistics and Analytics give learners, course managers, and administrators visibility into learning progress and program performance. Learners can review their own progress, while administrators can inspect platform-level analytics and course-level learning outcomes.

For HR and L&D teams, this feature supports follow-up, reporting, and program improvement. It helps teams see whether learners are active, whether courses are being completed, how quizzes perform, how AI mentor lessons are used, and how much learning time is being recorded.

The feature has three main surfaces: the learner Progress page, the administrator Analytics dashboard, and course-level Statistics tabs inside course management.

## Who Uses It

- Learners review their own progress, streaks, course completion, lesson completion, and quiz performance.
- Course managers review course-specific learner progress, quiz outcomes, AI mentor outcomes, and learning time.
- Administrators monitor platform-level learning analytics and download summary reports.
- L&D leaders use statistics to identify engagement patterns, stuck learners, and courses that need improvement.

## Feature Functions

- Show learner progress dashboards with activity streaks, quiz score summaries, course rates, and lesson rates.
- Show administrator analytics charts for popular courses, enrollment, course completion, freemium conversion, and average quiz score.
- Download an analytics summary report.
- Show course-level statistics for enrolled learners, completion, average completion, total learning time, and status distribution.
- Filter course statistics by group, learner search, quiz, or AI mentor lesson.
- Show progress, quiz-result, AI mentor, and learning-time tables for a course.
- Show a per-lesson completion funnel, per-chapter dropoff, course completion velocity, and a top-learners leaderboard for a course.
- Exclude deleted learners from course statistics.
- Restrict analytics and course-statistics views by permissions.

## End-User Value

Statistics and Analytics help learning teams move from anecdotal feedback to measurable outcomes. Learners know where they stand, course managers can intervene when learners are stuck, and administrators can track adoption and performance across the platform.

## How It Works

A learner opens Progress to see personal learning activity. Mentingo aggregates the learner's course, lesson, quiz, and streak data in the selected interface language and displays charts that help the learner continue from the right context.

An administrator opens Analytics to review organization-level charts and download a summary report. These charts summarize course popularity, enrollment, completion, freemium conversion, and average quiz performance.

From a course management view, permitted users can open the Statistics tab. Mentingo shows course overview metrics and detailed tables for learner progress, quiz results, AI mentor results, and learning time, with filters for groups, learners, quizzes, and mentor lessons. Below the overview cards, a "Deep analytics" section shows four additional course-level reports: a lesson completion funnel, chapter dropoff, completion velocity, and a top-learners leaderboard.

## Key Technical Context

- Learner progress is routed at `/progress` and implemented in `apps/web/app/modules/Statistics/Client`.
- Admin analytics is routed at `/admin/analytics` and implemented in `apps/web/app/modules/Statistics/Admin`.
- Learner and admin aggregate endpoints live in `apps/api/src/statistics`; course-level statistics endpoints are in `apps/api/src/courses/course.controller.ts`.
- `STATISTICS_READ` gates admin analytics, and `COURSE_STATISTICS` gates course-level reporting.
- Statistics draw from course progress, lesson progress, quiz attempts, AI mentor progress, learning-time records, and activity streak data.
- A nightly cron (`StatisticsService#refreshCourseStudentsStats`) rolls up the previous calendar month's new enrollments per course into `course_students_stats`, which backs the admin enrollment chart.
- Rolling 12-month breakdowns (student rates chart, admin enrollment chart) are keyed internally by `"yyyy-MM"`, not by bare month name, so two different years never collide into the same bucket; the frontend derives the display month name from that key.

### Deep analytics (2026-07-25)

Four new course-scoped reports were added under `apps/api/src/analytics/`, separate from the pre-existing secret-guarded `/api/analytics/active-users` endpoint (that one keeps its own `AnalyticsSecretGuard`; the new endpoints are permission-guarded like the rest of course statistics):

- **Lesson completion funnel** (`GET /api/analytics/courses/:courseId/lesson-completion-funnel`) — per-lesson enrolled/completed counts and completion percentage, ordered by chapter then lesson `displayOrder`. Reuses the `studentLessonProgress` → `lessons` → `chapters` → `studentCourses` join pattern already used by `CourseService#getCourseStatistics`.
- **Chapter dropoff** (`GET /api/analytics/courses/:courseId/chapter-dropoff`) — per-chapter completion percentage from `studentChapterProgress`, plus a `dropoffPercentage` computed relative to the _previous_ chapter's completer count (not raw enrollment), so it reads as a funnel: chapter 2's dropoff is "how many of chapter 1's finishers didn't finish chapter 2," not "how many of all enrollees."
- **Completion velocity** (`GET /api/analytics/courses/:courseId/completion-velocity`) — average/median days between `studentCourses.enrolledAt` and `completedAt`, bucketed into `0-1`, `1-3`, `3-7`, `7-14`, `14-30`, `30+` day ranges for a histogram.
- **Top learners** (`GET /api/analytics/courses/:courseId/top-learners`) — top 10 students in the course by total `lessonLearningTime.totalSeconds`, with completed-lesson count.

All four are gated by `PERMISSIONS.COURSE_STATISTICS` (the same permission as `:courseId/statistics`), exclude soft-deleted users, and only count `studentCourses.status = enrolled`. They are rendered in a new "Deep analytics" section on `CourseAdminStatistics.tsx`, below the existing overview cards and average-quiz-score chart.

Two reports from the original plan were intentionally deferred (not implemented): peak-hours-of-day analytics (no time-of-day data is recorded — `lessonLearningTime` only stores a per-user-per-lesson total, not timestamped sessions) and view-to-enrollment conversion (course page views are not tracked anywhere in the app).

### Fixes (2026-07-25)

Three defects were found while reviewing this module and fixed in the same pass:

- The admin "average quiz score" chart rendered a hardcoded `7`/`13` split regardless of real data — it now uses the same `correctAnswerCount`/`answerCount` values already shown in the chart's center label.
- The enrollment-stats cron computed new-enrollment counts per course but never wrote them anywhere, so `course_students_stats` was permanently empty and the enrollment chart always showed no data. It now upserts into `course_students_stats` (and the read query's month/year formatting, which had an unrelated string-concatenation bug, was fixed alongside it).
- `formatStats`/`formatCourseStudentStats` keyed their rolling-12-month objects by bare month name (e.g. `"January"`), which silently collided across years in edge cases. Both now key by `"yyyy-MM"`.
- `StatisticsHandler` was registered for `CourseStartedEvent` (via `@EventsHandler`) but had no handling logic for it and nothing in the app ever publishes that event — every dispatch would have hit `.otherwise(() => throw)`. The dead registration was removed.
- Found while manually verifying the cron fix against real data: the demo seed script (`src/seed/seed.ts#getLast12Months`) wrote `courseStudentsStats.month` 0-indexed (`date.getMonth()`, January = 0), while the cron now writes it 1-indexed. Left unfixed, seeded and cron-refreshed rows for the same calendar month would never collide on the `(courseId, month, year)` unique constraint, double-counting that month and — worse — mislabeling it a month off once formatted as `"yyyy-MM"` (a `month = 0` row formats and parses as December of the _previous_ year). The seed script now writes 1-indexed months to match.

## Test Evidence

Frontend E2E coverage verifies analytics charts, analytics report download, role-based course-statistics tab visibility, course statistics overview, progress and quiz-result filters, learning-time visibility, and AI mentor statistics preview/filter behavior. API E2E coverage in the Course controller verifies that deleted students are excluded from progress, quiz, average quiz, and learning-time statistics. No dedicated Statistics controller backend E2E spec was found in the discovered API tests.

The four deep-analytics reports follow the same testing convention as `CourseService#getCourseStatistics` (no dedicated controller E2E spec; SQL correctness is exercised by real query shape review). `CourseAnalyticsService` has unit tests (`apps/api/src/analytics/services/__tests__/course-analytics.service.spec.ts`) covering the derived math: completion-percentage division-by-zero guarding, chapter dropoff computed relative to the previous chapter (not raw enrollment), completion-velocity day bucketing/average/median, and the top-learners query delegation.
