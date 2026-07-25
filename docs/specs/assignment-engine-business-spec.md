# Assignment Engine Business Spec

> Design notes for this feature came from a clean-room reading of an external reference system licensed AGPL-3.0 (see `docs/research/learnhouse/`) — this spec describes independently designed mentingo behavior, not ported code. Status: **beta / prototype**, mirroring how AI Mentor lessons were staged when first introduced (see `SelectLessonType`'s Beta badge).

## Business Overview

The Assignment lesson type lets course creators set graded homework inside a course: a short-answer question judged by AI, a numeric exercise, a chess position line, a PGN with written analysis, or (recorded but not yet upload-wired) a file submission. Learners answer each task, get graded automatically where possible, and see their overall result once every task in the assignment has a grade.

This closes the largest gap identified when comparing mentingo against LearnHouse (see `docs/research/learnhouse/03-feature-matrix.md`): mentingo had no assignment/submission concept at all before this feature — quizzes cover fixed-answer questions, but nothing captured free-form or multi-step graded work.

## Who Uses It

- Course creators / trainers add an assignment lesson to a chapter, defining its grading rules and tasks.
- Learners open the lesson, answer each task, and see feedback and their grade once graded.
- Trainers with grading permission review ungraded submissions (chiefly file submissions and AI-graded free text they want to double-check) and can override any task's grade.

## Feature Functions

- Create an assignment lesson with a title, optional description, due date, and grading configuration: grading type (numeric/percentage/pass-fail/letter/GPA), whether correct answers are shown to learners once graded, whether retries are allowed and how many, and a pass threshold.
- Add tasks of five types: short answer (AI-graded), number answer (exact match with tolerance), chess position line (UCI move sequence, exact match), chess PGN analysis (AI-graded), file submission (manual grading only).
- Learners submit an answer per task; eligible types are graded immediately (deterministic graders for number/chess-line, an AI judge for short-answer/PGN-analysis).
- The learner's overall grade is the percentage of achieved points across every task in the assignment, recomputed whenever a task submission or its grade changes.
- Once every task has a grade, the assignment's status becomes `graded` and — only if `showCorrectAnswers` is enabled — the learner can see each task's reference answer.
- A trainer can manually grade or re-grade any task submission; a manual grade always overrides auto/AI grading for that submission until the learner resubmits.
- Retries: if the assignment forbids retries, a learner cannot resubmit after being graded; if it allows a limited number, resubmission is blocked once the limit is reached.

## End-User Value

For a chess school, this is the first way to assign real homework inside mentingo: "analyze this PGN and explain what went wrong," "solve this endgame in the fewest moves," "how many pieces does White have after move 12." Trainers get a single place to define graded work and see results, instead of grading outside the platform.

## How It Works

A trainer picks "Assignment" from the lesson-type picker (marked Beta), sets the title, grading options, and adds one or more tasks with type-specific fields (a reference answer for short answer, an expected number and tolerance for number answer, a UCI move sequence for chess position line). Saving creates the lesson and its assignment definition together in one call.

A learner opens the lesson and sees each task with an input appropriate to its type (text area, number field, or a plain UCI move-sequence field for chess tasks — not yet the interactive chess board). Submitting a task grades it immediately when possible; the assignment's overall status and grade update after every task submission. Answer keys are filtered out of every response to a learner until their submission is fully graded and the assignment explicitly allows showing them — enforced in one place (`AssignmentsService.stripAnswerKey`) rather than left to the UI.

## Key Technical Context

- Backend module: `apps/api/src/assignments/` (controller, service, repository, TypeBox schemas, `graders/` for number-answer and chess-position-line deterministic grading, and an AI grader built on `ChatService.judge` — the same OpenAI judging primitive `JudgeService` uses for AI Mentor, reused directly rather than through the thread system since a task submission is a single answer, not a conversation).
- Schema: `assignments`, `assignment_tasks`, `assignment_task_submissions`, `assignment_user_submissions` in `apps/api/src/storage/schema/index.ts`; migrations `0166_lean_nick_fury.sql` (tables) and `0167_enable_assignment_tenant_rls.sql` (RLS — applied and verified against the local dev database).
- Shared constants: `packages/shared/src/constants/assignments.ts` (grading types, task types, submission statuses); lesson type added to `packages/shared/src/constants/lessonTypes.ts`.
- Permissions: `assignment.read`, `assignment.manage`, `assignment.manage_own`, `assignment.grade`, `assignment.submit` in `packages/shared/src/constants/permissions.ts`, mapped into all four system roles.
- Lesson creation: `POST /assignments/lessons` creates the `lessons` row and the assignment together, reusing `AdminLessonRepository.getMaxDisplayOrder`/`updateLessonCountForChapter` and `LocalizationService.getBaseLanguage` — see "Follow-up work" for what this endpoint does **not** yet replicate from the general lesson-creation flow.
- Frontend: `apps/web/app/modules/Courses/Lesson/AssignmentLesson/AssignmentLesson.tsx` (learner view, wired into `LessonContentRenderer.tsx`), `apps/web/app/modules/Admin/EditCourse/CourseLessons/NewLesson/AssignmentLessonForm/AssignmentLessonForm.tsx` (authoring, wired into `SelectLessonType.tsx` and `CourseLessons.tsx`), both calling `apps/web/app/api/assignments-api.ts` — a hand-rolled axios client, not yet the generated swagger client (see that file's header comment).
- Event: `AssignmentGradedEvent` (`apps/api/src/events/assignment/assignment-graded.event.ts`) is published through the outbox whenever a learner's assignment becomes fully graded, including on re-grade. No consumer is registered yet.

## Test Evidence

Backend: 12 Jest unit tests in `apps/api/src/assignments/` — 3 for the deterministic graders (`number-answer.grader.spec.ts`, `chess-position-line.grader.spec.ts`), 5 covering the answer-key stripping rule (ungraded, graded-but-not-allowed, graded-and-allowed) and the retry gate (blocked resubmission, auto-grading a task through to a `GRADED` aggregate with the outbox event published). All pass; `tsc --noEmit` and `eslint` are clean on the whole API package.

Frontend: `tsc --noEmit` and `eslint` are clean on the whole web package after all changes. No component or E2E tests were added for the frontend pieces — see follow-up work.

## Follow-up Work (explicitly not done in this pass)

Being direct about scope, since this was built as a working prototype rather than a fully polished feature:

- **Lesson-creation parity**: `AssignmentsService.createAssignmentLesson` does not replicate `AdminLessonService`'s course-content-lock check, curriculum-editing feature-flag check, or `CreateLessonEvent` activity-log publish that every other lesson type's create path has. Functionally the lesson is created correctly and appears in the chapter; these are defense-in-depth/audit checks, not correctness gaps.
- **Editing an existing assignment lesson**: the authoring form only creates; it does not yet load an existing assignment's tasks back in for editing (the way `EmbedLessonForm` diffs and updates resources). `updateAssignment`/`updateTask`/`deleteTask` exist on the backend and are ready for this.
- **Generated API client**: `apps/web/app/api/assignments-api.ts` is hand-rolled against the live routes, matching how the chess module started (see `HANDOVER.md` "W2"). Run `pnpm generate:client` once the assignment endpoints are considered stable and migrate the frontend onto `ApiClient.api.*`.
- **File submission uploads**: the task type exists end-to-end in the data model and grading dispatch (it's always manually graded), but no S3/TUS upload UI is wired up yet — `apps/api/src/file/` is the intended integration point.
- **Chess-board UI for chess tasks**: the learner view uses a plain text field for UCI moves / PGN rather than `apps/web/app/modules/Chess/board/ChessBoard.tsx` / `PgnViewer.tsx`.
- **AI grader localization**: `AssignmentAiGraderService` reads an arbitrary locale from a task's `LocalizedText` title/description instead of resolving the course's base language via `LocalizationService`, unlike other AI-prompt call sites.
- **Certificate revocation on re-grade**: `AssignmentGradedEvent` is published on every re-grade (`isRegrade: true`) but has no registered listener yet; wiring it to `apps/api/src/certificates/` for the "re-grade drops below threshold → revoke" cascade (the single most valuable LearnHouse design note, see `docs/research/learnhouse/02-data-model.md`) is not done.
- **E2E coverage**: no Playwright specs yet, unlike the chess module's `apps/web/e2e/{data,factories,flows,specs}/chess/` pattern.
- **i18n**: all 22 new UI strings were added to all 7 locale files (en/vi/pl/de/lt/cs/es) with real translations, not machine-copied English; task-type option labels in the authoring form's dropdown are still raw enum values (`short_answer`, `chess_position_line`, ...) rather than translated labels.
