import {
  ASSIGNMENT_GRADING_TYPE,
  ASSIGNMENT_SUBMISSION_STATUS,
  ASSIGNMENT_TASK_TYPE,
} from "@repo/shared";
import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

export const assignmentGradingTypeSchema = Type.Enum(ASSIGNMENT_GRADING_TYPE);
export const assignmentTaskTypeSchema = Type.Enum(ASSIGNMENT_TASK_TYPE);
export const assignmentSubmissionStatusSchema = Type.Enum(ASSIGNMENT_SUBMISSION_STATUS);

/** LocalizedText: a map of language code -> string, e.g. { en: "...", vi: "..." }. */
export const localizedTextSchema = Type.Record(Type.String(), Type.String());

export const assignmentTaskContentsSchema = Type.Object({
  expectedAnswer: Type.Optional(Type.String()),
  expectedNumber: Type.Optional(Type.Number()),
  numberTolerance: Type.Optional(Type.Number({ minimum: 0 })),
  fen: Type.Optional(Type.String()),
  solutionMovesUci: Type.Optional(Type.Array(Type.String())),
  allowedFileTypes: Type.Optional(Type.Array(Type.String())),
  maxFileSizeMb: Type.Optional(Type.Number({ minimum: 0 })),
});

export const assignmentSubmissionContentsSchema = Type.Object({
  text: Type.Optional(Type.String()),
  number: Type.Optional(Type.Number()),
  movesUci: Type.Optional(Type.Array(Type.String())),
  pgn: Type.Optional(Type.String()),
  fileS3Key: Type.Optional(Type.String()),
  fileName: Type.Optional(Type.String()),
  /** Signed download URL — set only by getSubmissionForGrading, never stored. */
  fileUrl: Type.Optional(Type.String()),
});

export const assignmentTaskSchema = Type.Object({
  id: UUIDSchema,
  assignmentId: UUIDSchema,
  title: localizedTextSchema,
  description: Type.Union([localizedTextSchema, Type.Null()]),
  hint: Type.Union([localizedTextSchema, Type.Null()]),
  taskType: assignmentTaskTypeSchema,
  contents: assignmentTaskContentsSchema,
  referenceFileS3Key: Type.Union([Type.String(), Type.Null()]),
  maxGradeValue: Type.Number({ minimum: 1 }),
  displayOrder: Type.Number(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const createAssignmentTaskBodySchema = Type.Object({
  title: localizedTextSchema,
  description: Type.Optional(Type.Union([localizedTextSchema, Type.Null()])),
  hint: Type.Optional(Type.Union([localizedTextSchema, Type.Null()])),
  taskType: assignmentTaskTypeSchema,
  contents: Type.Optional(assignmentTaskContentsSchema),
  referenceFileS3Key: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  maxGradeValue: Type.Optional(Type.Number({ minimum: 1 })),
  displayOrder: Type.Optional(Type.Number()),
});

export const updateAssignmentTaskBodySchema = Type.Partial(createAssignmentTaskBodySchema);

export const assignmentSchema = Type.Object({
  id: UUIDSchema,
  lessonId: UUIDSchema,
  title: localizedTextSchema,
  description: Type.Union([localizedTextSchema, Type.Null()]),
  dueDate: Type.Union([Type.String(), Type.Null()]),
  gradingType: assignmentGradingTypeSchema,
  autoGrading: Type.Boolean(),
  showCorrectAnswers: Type.Boolean(),
  allowRetries: Type.Boolean(),
  maxRetries: Type.Number({ minimum: 0 }),
  passThresholdPercentage: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
  antiCopyPaste: Type.Boolean(),
  published: Type.Boolean(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const assignmentWithTasksSchema = Type.Intersect([
  assignmentSchema,
  Type.Object({ tasks: Type.Array(assignmentTaskSchema) }),
]);

export const createAssignmentBodySchema = Type.Object({
  lessonId: UUIDSchema,
  title: localizedTextSchema,
  description: Type.Optional(Type.Union([localizedTextSchema, Type.Null()])),
  dueDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  gradingType: Type.Optional(assignmentGradingTypeSchema),
  autoGrading: Type.Optional(Type.Boolean()),
  showCorrectAnswers: Type.Optional(Type.Boolean()),
  allowRetries: Type.Optional(Type.Boolean()),
  maxRetries: Type.Optional(Type.Number({ minimum: 0 })),
  passThresholdPercentage: Type.Optional(
    Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
  ),
  antiCopyPaste: Type.Optional(Type.Boolean()),
  published: Type.Optional(Type.Boolean()),
  tasks: Type.Optional(Type.Array(createAssignmentTaskBodySchema)),
});

export const updateAssignmentBodySchema = Type.Partial(
  Type.Omit(createAssignmentBodySchema, ["lessonId", "tasks"]),
);

export const submitAssignmentTaskBodySchema = Type.Object({
  submission: assignmentSubmissionContentsSchema,
});

export const gradeAssignmentTaskSubmissionBodySchema = Type.Object({
  grade: Type.Number({ minimum: 0 }),
  feedback: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const assignmentTaskSubmissionSchema = Type.Object({
  id: UUIDSchema,
  taskId: UUIDSchema,
  userId: UUIDSchema,
  submission: assignmentSubmissionContentsSchema,
  grade: Type.Union([Type.Number(), Type.Null()]),
  feedback: Type.Union([Type.String(), Type.Null()]),
  manuallyGraded: Type.Boolean(),
  gradedByUserId: Type.Union([UUIDSchema, Type.Null()]),
  gradedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const assignmentUserSubmissionSchema = Type.Object({
  id: UUIDSchema,
  assignmentId: UUIDSchema,
  userId: UUIDSchema,
  status: assignmentSubmissionStatusSchema,
  grade: Type.Union([Type.Number(), Type.Null()]),
  overallFeedback: Type.Union([Type.String(), Type.Null()]),
  attemptNumber: Type.Number(),
  submittedAt: Type.Union([Type.String(), Type.Null()]),
  gradedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  taskSubmissions: Type.Optional(Type.Array(assignmentTaskSubmissionSchema)),
});

/** listSubmissionsForGrading's response — the grading UI needs to show who it's grading, not just a userId. */
export const assignmentUserSubmissionWithUserSchema = Type.Composite([
  assignmentUserSubmissionSchema,
  Type.Object({
    userEmail: Type.String(),
    userFirstName: Type.String(),
    userLastName: Type.String(),
  }),
]);

export const retryAssignmentBodySchema = Type.Object({});

/**
 * Creates a `lessons` row (type "assignment") and its Assignment definition
 * together, mirroring how AI Mentor lessons create `lessons` + `ai_mentor_lessons`
 * in one call (see adminLesson.service.ts#createAiMentorLesson). Kept as its
 * own endpoint in AssignmentsController rather than folded into the general
 * lesson controller/service, but AssignmentsService now runs the same
 * course-content-lock / curriculum-editing-feature-flag / ownership checks
 * and publishes CreateLessonEvent via AdminLessonService, matching every
 * other lesson type's authoring flow.
 */
export const createAssignmentLessonBodySchema = Type.Object({
  chapterId: UUIDSchema,
  title: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.String()),
  dueDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  gradingType: Type.Optional(assignmentGradingTypeSchema),
  autoGrading: Type.Optional(Type.Boolean()),
  showCorrectAnswers: Type.Optional(Type.Boolean()),
  allowRetries: Type.Optional(Type.Boolean()),
  maxRetries: Type.Optional(Type.Number({ minimum: 0 })),
  passThresholdPercentage: Type.Optional(
    Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
  ),
  antiCopyPaste: Type.Optional(Type.Boolean()),
  published: Type.Optional(Type.Boolean()),
  tasks: Type.Optional(Type.Array(createAssignmentTaskBodySchema)),
});

export const createAssignmentLessonResponseSchema = Type.Object({
  lessonId: UUIDSchema,
  assignment: assignmentWithTasksSchema,
});

export type CreateAssignmentLessonBody = Static<typeof createAssignmentLessonBodySchema>;

export type AssignmentSchema = Static<typeof assignmentSchema>;
export type AssignmentWithTasksSchema = Static<typeof assignmentWithTasksSchema>;
export type CreateAssignmentBody = Static<typeof createAssignmentBodySchema>;
export type UpdateAssignmentBody = Static<typeof updateAssignmentBodySchema>;
export type CreateAssignmentTaskBody = Static<typeof createAssignmentTaskBodySchema>;
export type UpdateAssignmentTaskBody = Static<typeof updateAssignmentTaskBodySchema>;
export type SubmitAssignmentTaskBody = Static<typeof submitAssignmentTaskBodySchema>;
export type GradeAssignmentTaskSubmissionBody = Static<
  typeof gradeAssignmentTaskSubmissionBodySchema
>;
export type AssignmentTaskSubmissionSchema = Static<typeof assignmentTaskSubmissionSchema>;
export type AssignmentUserSubmissionSchema = Static<typeof assignmentUserSubmissionSchema>;
