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
- Exclude deleted learners from course statistics.
- Restrict analytics and course-statistics views by permissions.

## End-User Value

Statistics and Analytics help learning teams move from anecdotal feedback to measurable outcomes. Learners know where they stand, course managers can intervene when learners are stuck, and administrators can track adoption and performance across the platform.

## How It Works

A learner opens Progress to see personal learning activity. Mentingo aggregates the learner's course, lesson, quiz, and streak data in the selected interface language and displays charts that help the learner continue from the right context.

An administrator opens Analytics to review organization-level charts and download a summary report. These charts summarize course popularity, enrollment, completion, freemium conversion, and average quiz performance.

From a course management view, permitted users can open the Statistics tab. Mentingo shows course overview metrics and detailed tables for learner progress, quiz results, AI mentor results, and learning time, with filters for groups, learners, quizzes, and mentor lessons.

## Key Technical Context

- Learner progress is routed at `/progress` and implemented in `apps/web/app/modules/Statistics/Client`.
- Admin analytics is routed at `/admin/analytics` and implemented in `apps/web/app/modules/Statistics/Admin`.
- Learner and admin aggregate endpoints live in `apps/api/src/statistics`; course-level statistics endpoints are in `apps/api/src/courses/course.controller.ts`.
- `STATISTICS_READ` gates admin analytics, and `COURSE_STATISTICS` gates course-level reporting.
- Statistics draw from course progress, lesson progress, quiz attempts, AI mentor progress, learning-time records, and activity streak data.
- A nightly cron (`StatisticsService#refreshCourseStudentsStats`) rolls up the previous calendar month's new enrollments per course into `course_students_stats`, which backs the admin enrollment chart.
- Rolling 12-month breakdowns (student rates chart, admin enrollment chart) are keyed internally by `"yyyy-MM"`, not by bare month name, so two different years never collide into the same bucket; the frontend derives the display month name from that key.

### Fixes (2026-07-25)

Three defects were found while reviewing this module and fixed in the same pass:

- The admin "average quiz score" chart rendered a hardcoded `7`/`13` split regardless of real data — it now uses the same `correctAnswerCount`/`answerCount` values already shown in the chart's center label.
- The enrollment-stats cron computed new-enrollment counts per course but never wrote them anywhere, so `course_students_stats` was permanently empty and the enrollment chart always showed no data. It now upserts into `course_students_stats` (and the read query's month/year formatting, which had an unrelated string-concatenation bug, was fixed alongside it).
- `formatStats`/`formatCourseStudentStats` keyed their rolling-12-month objects by bare month name (e.g. `"January"`), which silently collided across years in edge cases. Both now key by `"yyyy-MM"`.
- `StatisticsHandler` was registered for `CourseStartedEvent` (via `@EventsHandler`) but had no handling logic for it and nothing in the app ever publishes that event — every dispatch would have hit `.otherwise(() => throw)`. The dead registration was removed.
- Found while manually verifying the cron fix against real data: the demo seed script (`src/seed/seed.ts#getLast12Months`) wrote `courseStudentsStats.month` 0-indexed (`date.getMonth()`, January = 0), while the cron now writes it 1-indexed. Left unfixed, seeded and cron-refreshed rows for the same calendar month would never collide on the `(courseId, month, year)` unique constraint, double-counting that month and — worse — mislabeling it a month off once formatted as `"yyyy-MM"` (a `month = 0` row formats and parses as December of the _previous_ year). The seed script now writes 1-indexed months to match.

## Test Evidence

Frontend E2E coverage verifies analytics charts, analytics report download, role-based course-statistics tab visibility, course statistics overview, progress and quiz-result filters, learning-time visibility, and AI mentor statistics preview/filter behavior. API E2E coverage in the Course controller verifies that deleted students are excluded from progress, quiz, average quiz, and learning-time statistics. No dedicated Statistics controller backend E2E spec was found in the discovered API tests.
