/**
 * Hand-rolled client for the Assignment engine endpoints
 * (`apps/api/src/assignments/`). Not yet part of the generated swagger
 * client (`~/api/generated-api.ts`) — the same situation the chess module
 * was in before its contract stabilized (see HANDOVER.md "W2 — Chuẩn hóa
 * API client"). Once the assignment endpoints are considered stable, run
 * `pnpm generate:client` and migrate these calls onto the generated,
 * fully-typed `ApiClient.api.*` the rest of the app uses.
 */
import { ApiClient } from "./api-client";

import type { AxiosResponse } from "axios";

export type LocalizedText = Record<string, string>;

export type AssignmentGradingType = "numeric" | "percentage" | "pass_fail" | "letter" | "gpa";
export type AssignmentTaskType =
  | "short_answer"
  | "number_answer"
  | "file_submission"
  | "chess_pgn_analysis"
  | "chess_position_line";
export type AssignmentSubmissionStatus =
  | "not_submitted"
  | "pending"
  | "submitted"
  | "graded"
  | "late";

export type AssignmentTaskContents = {
  expectedAnswer?: string;
  expectedNumber?: number;
  numberTolerance?: number;
  fen?: string;
  solutionMovesUci?: string[];
  allowedFileTypes?: string[];
  maxFileSizeMb?: number;
};

export type AssignmentSubmissionContents = {
  text?: string;
  number?: number;
  movesUci?: string[];
  pgn?: string;
  fileS3Key?: string;
  fileName?: string;
};

export type AssignmentTask = {
  id: string;
  assignmentId: string;
  title: LocalizedText;
  description: LocalizedText | null;
  hint: LocalizedText | null;
  taskType: AssignmentTaskType;
  contents: AssignmentTaskContents;
  referenceFileS3Key: string | null;
  maxGradeValue: number;
  displayOrder: number;
};

export type Assignment = {
  id: string;
  lessonId: string;
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
};

export type AssignmentWithTasks = Assignment & { tasks: AssignmentTask[] };

export type AssignmentTaskSubmission = {
  id: string;
  taskId: string;
  userId: string;
  submission: AssignmentSubmissionContents;
  grade: number | null;
  feedback: string | null;
  manuallyGraded: boolean;
};

export type AssignmentUserSubmission = {
  id: string;
  assignmentId: string;
  userId: string;
  status: AssignmentSubmissionStatus;
  grade: number | null;
  overallFeedback: string | null;
  attemptNumber: number;
};

export type LearnerAssignmentView = {
  assignment: Assignment;
  tasks: AssignmentTask[];
  userSubmission: AssignmentUserSubmission | null;
  taskSubmissions: AssignmentTaskSubmission[];
};

type BaseResponse<T> = { data: T };

const unwrap = <T>(response: AxiosResponse<BaseResponse<T>>) => response.data.data;

export const assignmentsApi = {
  getForLearner: (lessonId: string) =>
    ApiClient.instance
      .get<BaseResponse<LearnerAssignmentView>>(`/assignments/lesson/${lessonId}`)
      .then(unwrap),

  getForAuthor: (lessonId: string) =>
    ApiClient.instance
      .get<BaseResponse<AssignmentWithTasks>>(`/assignments/lesson/${lessonId}/author`)
      .then(unwrap),

  submitTask: (taskId: string, submission: AssignmentSubmissionContents) =>
    ApiClient.instance
      .post<BaseResponse<AssignmentUserSubmission>>(`/assignments/tasks/${taskId}/submissions`, {
        submission,
      })
      .then(unwrap),

  createAssignmentLesson: (body: {
    chapterId: string;
    title: string;
    description?: string;
    gradingType?: AssignmentGradingType;
    autoGrading?: boolean;
    showCorrectAnswers?: boolean;
    allowRetries?: boolean;
    maxRetries?: number;
    passThresholdPercentage?: number | null;
    published?: boolean;
    tasks?: Array<{
      title: LocalizedText;
      description?: LocalizedText | null;
      taskType: AssignmentTaskType;
      contents?: AssignmentTaskContents;
      maxGradeValue?: number;
    }>;
  }) =>
    ApiClient.instance
      .post<
        BaseResponse<{ lessonId: string; assignment: AssignmentWithTasks }>
      >("/assignments/lessons", body)
      .then(unwrap),

  updateAssignment: (id: string, body: Partial<Omit<Assignment, "id" | "lessonId">>) =>
    ApiClient.instance.patch<BaseResponse<Assignment>>(`/assignments/${id}`, body).then(unwrap),

  deleteAssignment: (id: string) =>
    ApiClient.instance.delete<BaseResponse<{ id: string }>>(`/assignments/${id}`).then(unwrap),

  listSubmissionsForGrading: (assignmentId: string) =>
    ApiClient.instance
      .get<BaseResponse<AssignmentUserSubmission[]>>(`/assignments/${assignmentId}/submissions`)
      .then(unwrap),

  getSubmissionForGrading: (assignmentId: string, userId: string) =>
    ApiClient.instance
      .get<
        BaseResponse<{
          assignment: Assignment;
          aggregate: AssignmentUserSubmission | null;
          tasks: AssignmentTask[];
          taskSubmissions: AssignmentTaskSubmission[];
        }>
      >(`/assignments/${assignmentId}/submissions/${userId}`)
      .then(unwrap),

  gradeTaskSubmission: (taskSubmissionId: string, grade: number, feedback?: string | null) =>
    ApiClient.instance
      .patch<
        BaseResponse<AssignmentUserSubmission>
      >(`/assignments/task-submissions/${taskSubmissionId}/grade`, { grade, feedback })
      .then(unwrap),
};
