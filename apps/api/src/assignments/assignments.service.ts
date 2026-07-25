import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ASSIGNMENT_GRADING_DEFAULTS,
  ASSIGNMENT_SUBMISSION_STATUS,
  ASSIGNMENT_TASK_TYPE,
} from "@repo/shared";
import { match } from "ts-pattern";

import { AssignmentGradedEvent } from "src/events/assignment/assignment-graded.event";
import { AdminLessonRepository } from "src/lesson/repositories/adminLesson.repository";
import { LocalizationService } from "src/localization/localization.service";
import { ENTITY_TYPE } from "src/localization/localization.types";
import { OutboxPublisher } from "src/outbox/outbox.publisher";

import { AssignmentsRepository } from "./assignments.repository";
import { AssignmentAiGraderService } from "./graders/assignment-ai-grader.service";
import { gradeChessPositionLine } from "./graders/chess-position-line.grader";
import { gradeNumberAnswer } from "./graders/number-answer.grader";

import type {
  AssignmentTaskRecord,
  AssignmentWithTasks,
  PublicAssignmentTaskRecord,
  AssignmentRecord,
} from "./assignments.types";
import type {
  CreateAssignmentBody,
  CreateAssignmentLessonBody,
  CreateAssignmentTaskBody,
  GradeAssignmentTaskSubmissionBody,
  SubmitAssignmentTaskBody,
  UpdateAssignmentBody,
  UpdateAssignmentTaskBody,
} from "./schemas/assignment.schema";
import type { UUIDType } from "src/common";

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly aiGrader: AssignmentAiGraderService,
    private readonly outboxPublisher: OutboxPublisher,
    private readonly adminLessonRepository: AdminLessonRepository,
    private readonly localizationService: LocalizationService,
  ) {}

  /**
   * Creates the `lessons` row (type "assignment") and the Assignment
   * definition together — the entry point the curriculum builder's "add
   * assignment lesson" action calls. Deliberately does not replicate
   * AdminLessonService's course-content-lock / curriculum-editing-feature-flag
   * / activity-log-event steps; see the business spec's "Follow-up work".
   */
  async createAssignmentLesson(
    body: CreateAssignmentLessonBody,
  ): Promise<{ lessonId: UUIDType; assignment: AssignmentWithTasks }> {
    const { language } = await this.localizationService.getBaseLanguage(
      ENTITY_TYPE.CHAPTER,
      body.chapterId,
    );

    const displayOrder = (await this.adminLessonRepository.getMaxDisplayOrder(body.chapterId)) + 1;

    const lessonRow = await this.assignmentsRepository.createLessonRow(
      body.chapterId,
      language,
      body.title,
      body.description,
      displayOrder,
    );

    const assignment = await this.createAssignment({
      lessonId: lessonRow.id,
      title: { [language]: body.title },
      description: body.description ? { [language]: body.description } : null,
      dueDate: body.dueDate,
      gradingType: body.gradingType,
      autoGrading: body.autoGrading,
      showCorrectAnswers: body.showCorrectAnswers,
      allowRetries: body.allowRetries,
      maxRetries: body.maxRetries,
      passThresholdPercentage: body.passThresholdPercentage,
      antiCopyPaste: body.antiCopyPaste,
      published: body.published,
      tasks: body.tasks,
    });

    await this.adminLessonRepository.updateLessonCountForChapter(body.chapterId);

    return { lessonId: lessonRow.id, assignment };
  }

  // ---------------------------------------------------------------------
  // Authoring (admin / content creator / trainer with ASSIGNMENT_MANAGE*)
  // ---------------------------------------------------------------------

  async createAssignment(body: CreateAssignmentBody): Promise<AssignmentWithTasks> {
    const existing = await this.assignmentsRepository.getAssignmentByLessonId(body.lessonId);
    if (existing) {
      throw new BadRequestException("assignment.errors.lessonAlreadyHasAssignment");
    }

    const assignment = await this.assignmentsRepository.createAssignment({
      ...body,
      gradingType: body.gradingType ?? "numeric",
      autoGrading: body.autoGrading ?? true,
      showCorrectAnswers: body.showCorrectAnswers ?? false,
      allowRetries: body.allowRetries ?? true,
      maxRetries: body.maxRetries ?? ASSIGNMENT_GRADING_DEFAULTS.MAX_RETRIES_UNLIMITED,
      antiCopyPaste: body.antiCopyPaste ?? false,
    });

    const tasks: AssignmentTaskRecord[] = [];
    for (const [index, task] of (body.tasks ?? []).entries()) {
      tasks.push(
        await this.assignmentsRepository.createTask(assignment.id, {
          ...task,
          displayOrder: task.displayOrder ?? index,
        }),
      );
    }

    return { ...assignment, tasks };
  }

  async updateAssignment(id: UUIDType, body: UpdateAssignmentBody): Promise<AssignmentRecord> {
    await this.requireAssignment(id);
    const updated = await this.assignmentsRepository.updateAssignment(id, body);
    if (!updated) throw new NotFoundException("assignment.errors.notFound");
    return updated;
  }

  async deleteAssignment(id: UUIDType): Promise<{ id: UUIDType }> {
    const deleted = await this.assignmentsRepository.deleteAssignment(id);
    if (!deleted) throw new NotFoundException("assignment.errors.notFound");
    return { id };
  }

  async addTask(
    assignmentId: UUIDType,
    body: CreateAssignmentTaskBody,
  ): Promise<AssignmentTaskRecord> {
    await this.requireAssignment(assignmentId);
    return this.assignmentsRepository.createTask(assignmentId, body);
  }

  async updateTask(
    taskId: UUIDType,
    body: UpdateAssignmentTaskBody,
  ): Promise<AssignmentTaskRecord> {
    const updated = await this.assignmentsRepository.updateTask(taskId, body);
    if (!updated) throw new NotFoundException("assignment.errors.taskNotFound");
    return updated;
  }

  async deleteTask(taskId: UUIDType): Promise<{ id: UUIDType }> {
    const deleted = await this.assignmentsRepository.deleteTask(taskId);
    if (!deleted) throw new NotFoundException("assignment.errors.taskNotFound");
    return { id: taskId };
  }

  /** Full assignment + tasks WITH answer keys — authoring/grading views only. */
  async getAssignmentForAuthor(lessonId: UUIDType): Promise<AssignmentWithTasks> {
    const assignment = await this.assignmentsRepository.getAssignmentByLessonId(lessonId);
    if (!assignment) throw new NotFoundException("assignment.errors.notFound");
    const tasks = await this.assignmentsRepository.listTasksByAssignmentId(assignment.id);
    return { ...assignment, tasks };
  }

  // ---------------------------------------------------------------------
  // Learner-facing
  // ---------------------------------------------------------------------

  /**
   * Assignment + tasks for a learner. Answer keys are stripped unless the
   * assignment allows showing them AND this learner's overall submission is
   * already graded — see `stripAnswerKey`, the single point this is enforced.
   */
  async getAssignmentForLearner(lessonId: UUIDType, userId: UUIDType) {
    const assignment = await this.assignmentsRepository.getAssignmentByLessonId(lessonId);
    if (!assignment || !assignment.published)
      throw new NotFoundException("assignment.errors.notFound");

    const tasks = await this.assignmentsRepository.listTasksByAssignmentId(assignment.id);
    const userSubmission = await this.assignmentsRepository.getUserSubmission(
      assignment.id,
      userId,
    );
    const canSeeAnswers =
      assignment.showCorrectAnswers &&
      userSubmission?.status === ASSIGNMENT_SUBMISSION_STATUS.GRADED;

    const taskSubmissions = await this.assignmentsRepository.listTaskSubmissionsForUser(
      assignment.id,
      userId,
    );

    return {
      assignment,
      tasks: tasks.map((task) => (canSeeAnswers ? task : this.stripAnswerKey(task))),
      userSubmission,
      taskSubmissions,
    };
  }

  /**
   * Never expose `contents.expectedAnswer` / `expectedNumber` /
   * `solutionMovesUci`, or the answer-key `referenceFileS3Key`, to a learner
   * who has not been graded with `showCorrectAnswers` enabled. This is the
   * only place this filtering happens — repository and controller both
   * defer to it rather than re-implementing the check.
   */
  private stripAnswerKey(task: AssignmentTaskRecord): PublicAssignmentTaskRecord {
    return {
      ...task,
      referenceFileS3Key: null,
      contents: {
        allowedFileTypes: task.contents.allowedFileTypes,
        maxFileSizeMb: task.contents.maxFileSizeMb,
        fen: task.contents.fen,
      },
    };
  }

  async submitTask(taskId: UUIDType, userId: UUIDType, body: SubmitAssignmentTaskBody) {
    const task = await this.assignmentsRepository.getTaskById(taskId);
    if (!task) throw new NotFoundException("assignment.errors.taskNotFound");

    const assignment = await this.assignmentsRepository.getAssignmentById(task.assignmentId);
    if (!assignment || !assignment.published)
      throw new NotFoundException("assignment.errors.notFound");

    const currentAggregate = await this.assignmentsRepository.getUserSubmission(
      assignment.id,
      userId,
    );
    const isStartingNewAttempt = currentAggregate?.status === ASSIGNMENT_SUBMISSION_STATUS.GRADED;

    if (isStartingNewAttempt) {
      if (!assignment.allowRetries) {
        throw new ForbiddenException("assignment.errors.retriesNotAllowed");
      }
      if (
        assignment.maxRetries !== ASSIGNMENT_GRADING_DEFAULTS.MAX_RETRIES_UNLIMITED &&
        currentAggregate.attemptNumber >= assignment.maxRetries
      ) {
        throw new ForbiddenException("assignment.errors.maxRetriesReached");
      }
    }

    const submissionRow = await this.assignmentsRepository.upsertTaskSubmission(
      taskId,
      userId,
      body.submission,
    );

    if (assignment.autoGrading) {
      const graded = await this.gradeTask(task, body.submission);
      if (graded) {
        await this.assignmentsRepository.gradeTaskSubmission(submissionRow.id, {
          grade: graded.grade,
          feedback: graded.feedback ?? null,
          manuallyGraded: false,
          gradedByUserId: null,
        });
      }
    }

    const nextAttemptNumber = isStartingNewAttempt
      ? currentAggregate.attemptNumber + 1
      : Math.max(1, currentAggregate?.attemptNumber ?? 1);

    return this.recomputeAggregate(assignment, userId, nextAttemptNumber);
  }

  /** Dispatches to a deterministic grader, an AI grader, or `null` (needs a human) by task type. */
  private async gradeTask(
    task: AssignmentTaskRecord,
    submission: SubmitAssignmentTaskBody["submission"],
  ): Promise<{ grade: number; feedback?: string } | null> {
    return match(task.taskType)
      .with(ASSIGNMENT_TASK_TYPE.NUMBER_ANSWER, () => {
        const result = gradeNumberAnswer(task.contents, submission, task.maxGradeValue);
        return { grade: result.grade };
      })
      .with(ASSIGNMENT_TASK_TYPE.CHESS_POSITION_LINE, () => {
        const result = gradeChessPositionLine(task.contents, submission, task.maxGradeValue);
        return { grade: result.grade };
      })
      .with(
        ASSIGNMENT_TASK_TYPE.SHORT_ANSWER,
        ASSIGNMENT_TASK_TYPE.CHESS_PGN_ANALYSIS,
        async () => {
          if (!submission.text?.trim() && !submission.pgn?.trim()) return null;
          const learnerAnswer = submission.pgn ?? submission.text ?? "";
          // Follow-up: resolve the course's base language via LocalizationService
          // instead of taking an arbitrary locale, matching how other lesson
          // types build AI prompts (see AiMentorLesson / JudgeService callers).
          const titleText = Object.values(task.title)[0] ?? "";
          const descriptionText = task.description ? Object.values(task.description)[0] : null;
          const result = await this.aiGrader.gradeFreeTextAnswer({
            taskTitle: titleText,
            taskDescription: descriptionText,
            expectedAnswer: task.contents.expectedAnswer,
            learnerAnswer,
            maxGradeValue: task.maxGradeValue,
          });
          return { grade: result.grade, feedback: result.feedback };
        },
      )
      .with(ASSIGNMENT_TASK_TYPE.FILE_SUBMISSION, () => null)
      .exhaustive();
  }

  /**
   * Recomputes the learner's overall assignment grade from every task's
   * current submission, and republishes AssignmentGradedEvent whenever the
   * status becomes GRADED (first grading pass or a manual re-grade).
   */
  private async recomputeAggregate(
    assignment: AssignmentRecord,
    userId: UUIDType,
    attemptNumber: number,
  ) {
    const tasks = await this.assignmentsRepository.listTasksByAssignmentId(assignment.id);
    const taskSubmissions = await this.assignmentsRepository.listTaskSubmissionsForUser(
      assignment.id,
      userId,
    );
    const submissionByTask = new Map(taskSubmissions.map((s) => [s.taskId, s]));

    const totalMax = tasks.reduce((sum, task) => sum + task.maxGradeValue, 0);
    const totalAchieved = tasks.reduce(
      (sum, task) => sum + (submissionByTask.get(task.id)?.grade ?? 0),
      0,
    );
    const allTasksGraded =
      tasks.length > 0 && tasks.every((task) => submissionByTask.get(task.id)?.grade != null);
    const anySubmitted = taskSubmissions.length > 0;

    const percentage = totalMax > 0 ? Math.round((totalAchieved / totalMax) * 100) : 0;
    const passThreshold =
      assignment.passThresholdPercentage ??
      match(assignment.gradingType)
        .with("letter", "gpa", () => ASSIGNMENT_GRADING_DEFAULTS.PASS_THRESHOLD_LETTER_GPA)
        .otherwise(() => ASSIGNMENT_GRADING_DEFAULTS.PASS_THRESHOLD_NUMERIC_PERCENTAGE_PASS_FAIL);
    const passed = percentage >= passThreshold;

    const isLate = assignment.dueDate != null && new Date() > new Date(assignment.dueDate);
    const status = match({ allTasksGraded, anySubmitted, isLate })
      .with({ allTasksGraded: true }, () => ASSIGNMENT_SUBMISSION_STATUS.GRADED)
      .with({ anySubmitted: true, isLate: true }, () => ASSIGNMENT_SUBMISSION_STATUS.LATE)
      .with({ anySubmitted: true }, () => ASSIGNMENT_SUBMISSION_STATUS.SUBMITTED)
      .otherwise(() => ASSIGNMENT_SUBMISSION_STATUS.NOT_SUBMITTED);

    const now = new Date().toISOString();
    const aggregate = await this.assignmentsRepository.upsertUserSubmission(assignment.id, userId, {
      status,
      grade: allTasksGraded ? percentage : null,
      overallFeedback: null,
      attemptNumber,
      submittedAt: anySubmitted ? now : null,
      gradedAt: allTasksGraded ? now : null,
    });

    if (status === ASSIGNMENT_SUBMISSION_STATUS.GRADED) {
      await this.outboxPublisher.publish(
        new AssignmentGradedEvent({
          assignmentId: assignment.id,
          lessonId: assignment.lessonId,
          userId,
          grade: percentage,
          passed,
          isRegrade: attemptNumber > 1,
        }),
      );
    }

    return aggregate;
  }

  // ---------------------------------------------------------------------
  // Grading (trainer / admin with ASSIGNMENT_GRADE)
  // ---------------------------------------------------------------------

  async listSubmissionsForGrading(assignmentId: UUIDType) {
    await this.requireAssignment(assignmentId);
    return this.assignmentsRepository.listUserSubmissionsForAssignment(assignmentId);
  }

  async getSubmissionForGrading(assignmentId: UUIDType, userId: UUIDType) {
    const assignment = await this.requireAssignment(assignmentId);
    const aggregate = await this.assignmentsRepository.getUserSubmission(assignmentId, userId);
    const taskSubmissions = await this.assignmentsRepository.listTaskSubmissionsForUser(
      assignmentId,
      userId,
    );
    const tasks = await this.assignmentsRepository.listTasksByAssignmentId(assignmentId);
    return { assignment, aggregate, tasks, taskSubmissions };
  }

  /**
   * Manual grade always wins over auto/AI grading — see
   * `manuallyGraded` on assignment_task_submissions. A later re-grade of
   * the whole assignment must not clobber this without an explicit
   * trainer action.
   */
  async gradeTaskSubmissionManually(
    taskSubmissionId: UUIDType,
    graderUserId: UUIDType,
    body: GradeAssignmentTaskSubmissionBody,
  ) {
    const graded = await this.assignmentsRepository.gradeTaskSubmission(taskSubmissionId, {
      grade: body.grade,
      feedback: body.feedback ?? null,
      manuallyGraded: true,
      gradedByUserId: graderUserId,
    });
    if (!graded) throw new NotFoundException("assignment.errors.submissionNotFound");

    const task = await this.assignmentsRepository.getTaskById(graded.taskId);
    if (!task) throw new NotFoundException("assignment.errors.taskNotFound");
    const assignment = await this.assignmentsRepository.getAssignmentById(task.assignmentId);
    if (!assignment) throw new NotFoundException("assignment.errors.notFound");

    const currentAggregate = await this.assignmentsRepository.getUserSubmission(
      assignment.id,
      graded.userId,
    );

    return this.recomputeAggregate(assignment, graded.userId, currentAggregate?.attemptNumber ?? 1);
  }

  private async requireAssignment(id: UUIDType): Promise<AssignmentRecord> {
    const assignment = await this.assignmentsRepository.getAssignmentById(id);
    if (!assignment) throw new NotFoundException("assignment.errors.notFound");
    return assignment;
  }
}
