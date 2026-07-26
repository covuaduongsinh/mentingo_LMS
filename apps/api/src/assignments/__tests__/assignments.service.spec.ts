import { ForbiddenException } from "@nestjs/common";
import { ASSIGNMENT_SUBMISSION_STATUS } from "@repo/shared";

import { AssignmentsService } from "../assignments.service";

import type { AssignmentsRepository } from "../assignments.repository";
import type { AssignmentRecord, AssignmentTaskRecord } from "../assignments.types";
import type { AssignmentAiGraderService } from "../graders/assignment-ai-grader.service";
import type { CourseFeaturePolicyService } from "src/courses/course-feature-policy.service";
import type { MasterCourseService } from "src/courses/master-course.service";
import type { FileService } from "src/file/file.service";
import type { AdminLessonRepository } from "src/lesson/repositories/adminLesson.repository";
import type { AdminLessonService } from "src/lesson/services/adminLesson.service";
import type { LocalizationService } from "src/localization/localization.service";
import type { OutboxPublisher } from "src/outbox/outbox.publisher";

const ASSIGNMENT_ID = "assignment-1";
const LESSON_ID = "lesson-1";
const USER_ID = "user-1";
const TASK_ID = "task-1";

function buildAssignment(overrides: Partial<AssignmentRecord> = {}): AssignmentRecord {
  return {
    id: ASSIGNMENT_ID,
    lessonId: LESSON_ID,
    title: { en: "Homework" },
    description: null,
    dueDate: null,
    gradingType: "numeric",
    autoGrading: true,
    showCorrectAnswers: true,
    allowRetries: false,
    maxRetries: 0,
    passThresholdPercentage: null,
    antiCopyPaste: false,
    published: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildTask(overrides: Partial<AssignmentTaskRecord> = {}): AssignmentTaskRecord {
  return {
    id: TASK_ID,
    assignmentId: ASSIGNMENT_ID,
    title: { en: "Question 1" },
    description: null,
    hint: null,
    taskType: "number_answer",
    contents: { expectedNumber: 5 },
    referenceFileS3Key: "answer-key/secret.pdf",
    maxGradeValue: 100,
    displayOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const CHAPTER_ID = "chapter-1";
const CURRENT_USER = { userId: "trainer-1" } as Parameters<
  AssignmentsService["createAssignmentLesson"]
>[1];

describe("AssignmentsService", () => {
  let repo: jest.Mocked<AssignmentsRepository>;
  let aiGrader: jest.Mocked<AssignmentAiGraderService>;
  let outbox: jest.Mocked<OutboxPublisher>;
  let adminLessonRepo: jest.Mocked<AdminLessonRepository>;
  let adminLessonService: jest.Mocked<AdminLessonService>;
  let masterCourseService: jest.Mocked<MasterCourseService>;
  let courseFeaturePolicyService: jest.Mocked<CourseFeaturePolicyService>;
  let localization: jest.Mocked<LocalizationService>;
  let fileService: jest.Mocked<FileService>;
  let service: AssignmentsService;

  beforeEach(() => {
    repo = {
      getAssignmentByLessonId: jest.fn(),
      getAssignmentById: jest.fn(),
      listTasksByAssignmentId: jest.fn(),
      getUserSubmission: jest.fn(),
      listTaskSubmissionsForUser: jest.fn(),
      getTaskById: jest.fn(),
      upsertTaskSubmission: jest.fn(),
      gradeTaskSubmission: jest.fn(),
      upsertUserSubmission: jest.fn(),
      createLessonRow: jest.fn(),
      createAssignment: jest.fn(),
      createTask: jest.fn(),
      resetTaskSubmission: jest.fn(),
      listUserSubmissionsForAssignment: jest.fn(),
    } as unknown as jest.Mocked<AssignmentsRepository>;

    aiGrader = {
      gradeFreeTextAnswer: jest.fn(),
    } as unknown as jest.Mocked<AssignmentAiGraderService>;
    outbox = { publish: jest.fn() } as unknown as jest.Mocked<OutboxPublisher>;
    adminLessonRepo = {
      getMaxDisplayOrder: jest.fn().mockResolvedValue(0),
      updateLessonCountForChapter: jest.fn(),
    } as unknown as jest.Mocked<AdminLessonRepository>;
    adminLessonService = {
      validateAccess: jest.fn().mockResolvedValue(undefined),
      publishCreateLessonEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AdminLessonService>;
    masterCourseService = {
      assertCourseContentEditableByChapterId: jest.fn().mockResolvedValue(undefined),
      assertCourseContentEditableByLessonId: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MasterCourseService>;
    courseFeaturePolicyService = {
      assertCourseFeatureEnabledByChapterId: jest.fn().mockResolvedValue(undefined),
      assertCourseFeatureEnabledByLessonId: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CourseFeaturePolicyService>;
    localization = {
      getBaseLanguage: jest.fn().mockResolvedValue({
        language: "en",
        baseLanguage: "en",
        availableLocales: ["en"],
      }),
    } as unknown as jest.Mocked<LocalizationService>;
    fileService = { getFileUrl: jest.fn() } as unknown as jest.Mocked<FileService>;

    service = new AssignmentsService(
      repo,
      aiGrader,
      outbox,
      adminLessonRepo,
      adminLessonService,
      masterCourseService,
      courseFeaturePolicyService,
      localization,
      fileService,
    );
  });

  describe("createAssignmentLesson — lesson-system parity", () => {
    it("runs the same content-lock, feature-flag, and ownership checks other lesson types run, then publishes CreateLessonEvent", async () => {
      repo.createLessonRow.mockResolvedValue({
        id: LESSON_ID,
        chapterId: CHAPTER_ID,
        displayOrder: 1,
      });
      repo.getAssignmentByLessonId.mockResolvedValue(null);
      repo.createAssignment.mockResolvedValue(buildAssignment());

      await service.createAssignmentLesson(
        {
          chapterId: CHAPTER_ID,
          title: "Homework",
          showCorrectAnswers: true,
          allowRetries: false,
        } as Parameters<AssignmentsService["createAssignmentLesson"]>[0],
        CURRENT_USER,
      );

      expect(masterCourseService.assertCourseContentEditableByChapterId).toHaveBeenCalledWith(
        CHAPTER_ID,
      );
      expect(courseFeaturePolicyService.assertCourseFeatureEnabledByChapterId).toHaveBeenCalledWith(
        CHAPTER_ID,
        "curriculum_editing",
      );
      expect(adminLessonService.validateAccess).toHaveBeenCalledWith(
        "chapter",
        CURRENT_USER,
        CHAPTER_ID,
      );
      expect(adminLessonService.publishCreateLessonEvent).toHaveBeenCalledWith(
        LESSON_ID,
        "en",
        CURRENT_USER,
      );
    });

    it("propagates the content-lock error instead of creating the lesson, when the course is locked", async () => {
      masterCourseService.assertCourseContentEditableByChapterId.mockRejectedValue(
        new ForbiddenException("course locked"),
      );

      await expect(
        service.createAssignmentLesson(
          { chapterId: CHAPTER_ID, title: "Homework" } as Parameters<
            AssignmentsService["createAssignmentLesson"]
          >[0],
          CURRENT_USER,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.createLessonRow).not.toHaveBeenCalled();
    });
  });

  describe("getAssignmentForLearner — answer-key stripping", () => {
    it("strips the answer key when the learner has not been graded yet", async () => {
      repo.getAssignmentByLessonId.mockResolvedValue(buildAssignment());
      repo.listTasksByAssignmentId.mockResolvedValue([buildTask()]);
      repo.getUserSubmission.mockResolvedValue(null);
      repo.listTaskSubmissionsForUser.mockResolvedValue([]);

      const result = await service.getAssignmentForLearner(LESSON_ID, USER_ID);

      expect(result.tasks[0].referenceFileS3Key).toBeNull();
      expect(result.tasks[0].contents).not.toHaveProperty("expectedNumber");
    });

    it("still strips the answer key when graded but the assignment forbids showing it", async () => {
      repo.getAssignmentByLessonId.mockResolvedValue(
        buildAssignment({ showCorrectAnswers: false }),
      );
      repo.listTasksByAssignmentId.mockResolvedValue([buildTask()]);
      repo.getUserSubmission.mockResolvedValue({
        id: "agg-1",
        assignmentId: ASSIGNMENT_ID,
        userId: USER_ID,
        status: ASSIGNMENT_SUBMISSION_STATUS.GRADED,
        grade: 100,
        overallFeedback: null,
        attemptNumber: 1,
        submittedAt: "2026-01-01T00:00:00.000Z",
        gradedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      repo.listTaskSubmissionsForUser.mockResolvedValue([]);

      const result = await service.getAssignmentForLearner(LESSON_ID, USER_ID);

      expect(result.tasks[0].referenceFileS3Key).toBeNull();
    });

    it("reveals the answer key once graded when the assignment allows it", async () => {
      repo.getAssignmentByLessonId.mockResolvedValue(buildAssignment({ showCorrectAnswers: true }));
      repo.listTasksByAssignmentId.mockResolvedValue([buildTask()]);
      repo.getUserSubmission.mockResolvedValue({
        id: "agg-1",
        assignmentId: ASSIGNMENT_ID,
        userId: USER_ID,
        status: ASSIGNMENT_SUBMISSION_STATUS.GRADED,
        grade: 100,
        overallFeedback: null,
        attemptNumber: 1,
        submittedAt: "2026-01-01T00:00:00.000Z",
        gradedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      repo.listTaskSubmissionsForUser.mockResolvedValue([]);

      const result = await service.getAssignmentForLearner(LESSON_ID, USER_ID);

      expect(result.tasks[0].referenceFileS3Key).toBe("answer-key/secret.pdf");
    });
  });

  describe("submitTask — retry gate", () => {
    it("blocks a new attempt once graded when the assignment does not allow retries", async () => {
      repo.getTaskById.mockResolvedValue(buildTask());
      repo.getAssignmentById.mockResolvedValue(buildAssignment({ allowRetries: false }));
      repo.getUserSubmission.mockResolvedValue({
        id: "agg-1",
        assignmentId: ASSIGNMENT_ID,
        userId: USER_ID,
        status: ASSIGNMENT_SUBMISSION_STATUS.GRADED,
        grade: 40,
        overallFeedback: null,
        attemptNumber: 1,
        submittedAt: "2026-01-01T00:00:00.000Z",
        gradedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });

      await expect(
        service.submitTask(TASK_ID, USER_ID, { submission: { number: 5 } }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.upsertTaskSubmission).not.toHaveBeenCalled();
    });

    it("auto-grades a number_answer task and recomputes the aggregate as GRADED", async () => {
      repo.getTaskById.mockResolvedValue(buildTask({ contents: { expectedNumber: 5 } }));
      repo.getAssignmentById.mockResolvedValue(buildAssignment());
      repo.getUserSubmission.mockResolvedValue(null);
      repo.upsertTaskSubmission.mockResolvedValue({
        id: "sub-1",
        taskId: TASK_ID,
        userId: USER_ID,
        submission: { number: 5 },
        grade: null,
        feedback: null,
        manuallyGraded: false,
        gradedByUserId: null,
        gradedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      repo.gradeTaskSubmission.mockResolvedValue(null);
      repo.listTasksByAssignmentId.mockResolvedValue([
        buildTask({ contents: { expectedNumber: 5 } }),
      ]);
      repo.listTaskSubmissionsForUser.mockResolvedValue([
        {
          id: "sub-1",
          taskId: TASK_ID,
          userId: USER_ID,
          submission: { number: 5 },
          grade: 100,
          feedback: null,
          manuallyGraded: false,
          gradedByUserId: null,
          gradedAt: "2026-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]);
      repo.upsertUserSubmission.mockImplementation(async (_assignmentId, _userId, data) => ({
        id: "agg-1",
        assignmentId: ASSIGNMENT_ID,
        userId: USER_ID,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ...data,
      }));

      const result = await service.submitTask(TASK_ID, USER_ID, { submission: { number: 5 } });

      expect(repo.gradeTaskSubmission).toHaveBeenCalledWith(
        "sub-1",
        expect.objectContaining({ grade: 100, manuallyGraded: false }),
      );
      expect(result.status).toBe(ASSIGNMENT_SUBMISSION_STATUS.GRADED);
      expect(result.grade).toBe(100);
      // AssignmentSubmittedEvent (submission itself) + AssignmentGradedEvent (auto-grading reached GRADED).
      expect(outbox.publish).toHaveBeenCalledTimes(2);
    });
  });

  describe("rejectTaskSubmission", () => {
    it("resets the task submission and recomputes the aggregate without touching attemptNumber", async () => {
      repo.resetTaskSubmission.mockResolvedValue({
        id: "sub-1",
        taskId: TASK_ID,
        userId: USER_ID,
        submission: {},
        grade: null,
        feedback: null,
        manuallyGraded: false,
        gradedByUserId: null,
        gradedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      repo.getTaskById.mockResolvedValue(buildTask());
      repo.getAssignmentById.mockResolvedValue(buildAssignment());
      repo.getUserSubmission.mockResolvedValue({
        id: "agg-1",
        assignmentId: ASSIGNMENT_ID,
        userId: USER_ID,
        status: ASSIGNMENT_SUBMISSION_STATUS.SUBMITTED,
        grade: null,
        overallFeedback: null,
        attemptNumber: 2,
        submittedAt: "2026-01-01T00:00:00.000Z",
        gradedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      repo.listTasksByAssignmentId.mockResolvedValue([buildTask()]);
      repo.listTaskSubmissionsForUser.mockResolvedValue([]);
      repo.upsertUserSubmission.mockImplementation(async (_assignmentId, _userId, data) => ({
        id: "agg-1",
        assignmentId: ASSIGNMENT_ID,
        userId: USER_ID,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ...data,
      }));

      await service.rejectTaskSubmission("sub-1");

      expect(repo.resetTaskSubmission).toHaveBeenCalledWith("sub-1");
      // Reset submission means no task has a grade anymore -> aggregate goes
      // back to not_submitted, and the attempt number carries over (2), it
      // is never bumped by a rejection.
      expect(repo.upsertUserSubmission).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        USER_ID,
        expect.objectContaining({
          status: ASSIGNMENT_SUBMISSION_STATUS.NOT_SUBMITTED,
          attemptNumber: 2,
        }),
      );
    });
  });

  describe("getAssignmentSummary", () => {
    it("computes status counts, average grade, and pass rate from graded submissions only", async () => {
      repo.getAssignmentById.mockResolvedValue(buildAssignment({ passThresholdPercentage: 60 }));
      repo.listUserSubmissionsForAssignment.mockResolvedValue([
        {
          id: "a1",
          assignmentId: ASSIGNMENT_ID,
          userId: "u1",
          status: ASSIGNMENT_SUBMISSION_STATUS.GRADED,
          grade: 80,
          overallFeedback: null,
          attemptNumber: 1,
          submittedAt: null,
          gradedAt: null,
          createdAt: "",
          updatedAt: "",
          userEmail: "a@example.com",
          userFirstName: "A",
          userLastName: "A",
        },
        {
          id: "a2",
          assignmentId: ASSIGNMENT_ID,
          userId: "u2",
          status: ASSIGNMENT_SUBMISSION_STATUS.GRADED,
          grade: 40,
          overallFeedback: null,
          attemptNumber: 1,
          submittedAt: null,
          gradedAt: null,
          createdAt: "",
          updatedAt: "",
          userEmail: "b@example.com",
          userFirstName: "B",
          userLastName: "B",
        },
        {
          id: "a3",
          assignmentId: ASSIGNMENT_ID,
          userId: "u3",
          status: ASSIGNMENT_SUBMISSION_STATUS.NOT_SUBMITTED,
          grade: null,
          overallFeedback: null,
          attemptNumber: 0,
          submittedAt: null,
          gradedAt: null,
          createdAt: "",
          updatedAt: "",
          userEmail: "c@example.com",
          userFirstName: "C",
          userLastName: "C",
        },
      ]);

      const summary = await service.getAssignmentSummary(ASSIGNMENT_ID);

      expect(summary.totalLearners).toBe(3);
      expect(summary.statusCounts.graded).toBe(2);
      expect(summary.statusCounts.not_submitted).toBe(1);
      // average of 80 and 40 == 60
      expect(summary.averageGrade).toBe(60);
      // only the 80 submission clears the 60 threshold -> 1 of 2 graded == 50%
      expect(summary.passRate).toBe(50);
    });

    it("returns null average/pass rate when nothing has been graded yet", async () => {
      repo.getAssignmentById.mockResolvedValue(buildAssignment());
      repo.listUserSubmissionsForAssignment.mockResolvedValue([]);

      const summary = await service.getAssignmentSummary(ASSIGNMENT_ID);

      expect(summary.totalLearners).toBe(0);
      expect(summary.averageGrade).toBeNull();
      expect(summary.passRate).toBeNull();
    });
  });
});
