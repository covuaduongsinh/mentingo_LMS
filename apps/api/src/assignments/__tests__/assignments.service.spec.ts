import { ForbiddenException } from "@nestjs/common";
import { ASSIGNMENT_SUBMISSION_STATUS } from "@repo/shared";

import { AssignmentsService } from "../assignments.service";

import type { AssignmentsRepository } from "../assignments.repository";
import type { AssignmentRecord, AssignmentTaskRecord } from "../assignments.types";
import type { AssignmentAiGraderService } from "../graders/assignment-ai-grader.service";
import type { AdminLessonRepository } from "src/lesson/repositories/adminLesson.repository";
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

describe("AssignmentsService", () => {
  let repo: jest.Mocked<AssignmentsRepository>;
  let aiGrader: jest.Mocked<AssignmentAiGraderService>;
  let outbox: jest.Mocked<OutboxPublisher>;
  let adminLessonRepo: jest.Mocked<AdminLessonRepository>;
  let localization: jest.Mocked<LocalizationService>;
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
    } as unknown as jest.Mocked<AssignmentsRepository>;

    aiGrader = {
      gradeFreeTextAnswer: jest.fn(),
    } as unknown as jest.Mocked<AssignmentAiGraderService>;
    outbox = { publish: jest.fn() } as unknown as jest.Mocked<OutboxPublisher>;
    adminLessonRepo = {
      getMaxDisplayOrder: jest.fn(),
      updateLessonCountForChapter: jest.fn(),
    } as unknown as jest.Mocked<AdminLessonRepository>;
    localization = { getBaseLanguage: jest.fn() } as unknown as jest.Mocked<LocalizationService>;

    service = new AssignmentsService(repo, aiGrader, outbox, adminLessonRepo, localization);
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
      expect(outbox.publish).toHaveBeenCalledTimes(1);
    });
  });
});
