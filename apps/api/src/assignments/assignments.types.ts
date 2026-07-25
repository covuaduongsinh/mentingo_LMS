import type {
  AssignmentGradingType,
  AssignmentSubmissionStatus,
  AssignmentTaskType,
  LocalizedText,
} from "@repo/shared";
import type { UUIDType } from "src/common";
import type { AssignmentSubmissionContents, AssignmentTaskContents } from "src/storage/schema";

export type AssignmentRecord = {
  id: UUIDType;
  lessonId: UUIDType;
  title: LocalizedText;
  description: LocalizedText | null;
  dueDate: string | null;
  gradingType: AssignmentGradingType;
  autoGrading: boolean;
  showCorrectAnswers: boolean;
  allowRetries: boolean;
  maxRetries: number;
  passThresholdPercentage: number | null;
  antiCopyPaste: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AssignmentTaskRecord = {
  id: UUIDType;
  assignmentId: UUIDType;
  title: LocalizedText;
  description: LocalizedText | null;
  hint: LocalizedText | null;
  taskType: AssignmentTaskType;
  contents: AssignmentTaskContents;
  referenceFileS3Key: string | null;
  maxGradeValue: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Task shape safe to send to a learner who has not been graded yet: no
 * `contents.expectedAnswer` / `solutionMovesUci`, no `referenceFileS3Key` answer
 * key. See AssignmentsService.stripAnswerKey — the single point where this
 * filtering happens, deliberately kept out of the controller/UI layer.
 */
export type PublicAssignmentTaskRecord = Omit<AssignmentTaskRecord, "contents"> & {
  contents: Pick<AssignmentTaskContents, "allowedFileTypes" | "maxFileSizeMb" | "fen">;
};

export type AssignmentTaskSubmissionRecord = {
  id: UUIDType;
  taskId: UUIDType;
  userId: UUIDType;
  submission: AssignmentSubmissionContents;
  grade: number | null;
  feedback: string | null;
  manuallyGraded: boolean;
  gradedByUserId: UUIDType | null;
  gradedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssignmentUserSubmissionRecord = {
  id: UUIDType;
  assignmentId: UUIDType;
  userId: UUIDType;
  status: AssignmentSubmissionStatus;
  grade: number | null;
  overallFeedback: string | null;
  attemptNumber: number;
  submittedAt: string | null;
  gradedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssignmentWithTasks = AssignmentRecord & { tasks: AssignmentTaskRecord[] };

/** listSubmissionsForGrading's shape — the grading UI needs to show who it's grading, not just a userId. */
export type AssignmentUserSubmissionWithUserRecord = AssignmentUserSubmissionRecord & {
  userEmail: string;
  userFirstName: string;
  userLastName: string;
};
