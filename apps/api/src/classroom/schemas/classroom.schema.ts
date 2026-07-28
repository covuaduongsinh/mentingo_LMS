import { CLASSROOM_ANNOUNCEMENT_MAX_LENGTH, CLASSROOM_ANNOUNCEMENT_MIN_LENGTH } from "@repo/shared";
import { Type, type Static } from "@sinclair/typebox";

import { announcementLanguageSchema } from "src/announcements/schemas/announcement.schema";
import { UUIDSchema } from "src/common";

export const createClassroomBodySchema = Type.Object({
  name: Type.String({ minLength: 3, maxLength: 100 }),
  description: Type.Optional(Type.String({ maxLength: 2000 })),
  canMsg: Type.Optional(Type.Boolean()),
});

export const updateClassroomBodySchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 3, maxLength: 100 })),
  description: Type.Optional(Type.String({ maxLength: 2000 })),
  canMsg: Type.Optional(Type.Boolean()),
  wall: Type.Optional(Type.String({ maxLength: 20000 })),
});

export const setClassroomArchivedBodySchema = Type.Object({
  archived: Type.Boolean(),
});

export const addClassroomTeacherBodySchema = Type.Object({
  userId: UUIDSchema,
});

export const classroomTeacherSchema = Type.Object({
  userId: UUIDSchema,
  firstName: Type.String(),
  lastName: Type.String(),
  addedBy: Type.Union([UUIDSchema, Type.Null()]),
});

export const classroomSchema = Type.Object({
  id: UUIDSchema,
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  wall: Type.String(),
  ownerId: Type.Union([UUIDSchema, Type.Null()]),
  canMsg: Type.Boolean(),
  maxStudents: Type.Number(),
  viewedAt: Type.String(),
  archivedAt: Type.Union([Type.String(), Type.Null()]),
  archivedBy: Type.Union([UUIDSchema, Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const classroomDetailSchema = Type.Composite([
  classroomSchema,
  Type.Object({
    teachers: Type.Array(classroomTeacherSchema),
    isTeacher: Type.Boolean(),
  }),
]);

export const classroomListSchema = Type.Array(classroomSchema);

export const classroomIdForSourceGroupResponseSchema = Type.Object({
  classroomId: Type.Union([UUIDSchema, Type.Null()]),
});

export const classroomTeacherListSchema = Type.Array(classroomTeacherSchema);

// ---------------------------------------------------------------------------------------
// Students (Đợt C3)
// ---------------------------------------------------------------------------------------

export const classroomStudentSchema = Type.Object({
  userId: UUIDSchema,
  realName: Type.String(),
  notes: Type.String(),
  isManaged: Type.Boolean(),
  archivedAt: Type.Union([Type.String(), Type.Null()]),
  username: Type.Union([Type.String(), Type.Null()]),
});

export const classroomStudentListSchema = Type.Array(classroomStudentSchema);

export const createdClassroomStudentSchema = Type.Object({
  userId: UUIDSchema,
  username: Type.String(),
  temporaryPassword: Type.String(),
  realName: Type.String(),
});

export const createClassroomStudentBodySchema = Type.Object({
  realName: Type.String({ minLength: 1, maxLength: 100 }),
});

export const createClassroomStudentResponseSchema = createdClassroomStudentSchema;

export const bulkCreateClassroomStudentsBodySchema = Type.Object({
  names: Type.Array(Type.String({ minLength: 1, maxLength: 100 }), {
    minItems: 1,
    maxItems: 200,
  }),
});

export const bulkCreateClassroomStudentsResponseSchema = Type.Object({
  students: Type.Array(createdClassroomStudentSchema),
});

export const updateClassroomStudentBodySchema = Type.Object({
  realName: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  notes: Type.Optional(Type.String({ maxLength: 20000 })),
});

export const setClassroomStudentArchivedBodySchema = Type.Object({
  archived: Type.Boolean(),
});

export const resetClassroomStudentPasswordResponseSchema = Type.Object({
  temporaryPassword: Type.String(),
});

export const releaseClassroomStudentBodySchema = Type.Object({
  email: Type.String({ format: "email" }),
});

export const releaseClassroomStudentResponseSchema = Type.Object({
  createToken: Type.String(),
});

export const moveClassroomStudentBodySchema = Type.Object({
  targetClassroomId: UUIDSchema,
});

export const classroomBulkActionSchema = Type.Union([
  Type.Literal("archive"),
  Type.Literal("restore"),
  Type.Literal("remove"),
  Type.Literal("move"),
]);

export const runClassroomBulkActionBodySchema = Type.Object({
  action: classroomBulkActionSchema,
  userIds: Type.Array(UUIDSchema, { minItems: 1 }),
  targetClassroomId: Type.Optional(UUIDSchema),
});

// ---------------------------------------------------------------------------------------
// Invites (Đợt C3)
// ---------------------------------------------------------------------------------------

export const classroomInviteStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("accepted"),
  Type.Literal("declined"),
]);

export const inviteClassroomStudentBodySchema = Type.Object({
  username: Type.String({ minLength: 1 }),
  realName: Type.String({ minLength: 1, maxLength: 100 }),
});

export const inviteClassroomStudentResponseSchema = Type.Object({
  feedback: Type.Union([Type.Literal("already"), Type.Literal("found"), Type.Literal("invited")]),
});

export const classroomInviteSchema = Type.Object({
  id: UUIDSchema,
  userId: UUIDSchema,
  realName: Type.String(),
  status: classroomInviteStatusSchema,
  createdAt: Type.String(),
  username: Type.Union([Type.String(), Type.Null()]),
});

export const classroomInviteListSchema = Type.Array(classroomInviteSchema);

export const myClassroomInviteSchema = Type.Object({
  id: UUIDSchema,
  classroomId: UUIDSchema,
  realName: Type.String(),
  status: classroomInviteStatusSchema,
  createdAt: Type.String(),
  classroomName: Type.String(),
});

export const myClassroomInviteListSchema = Type.Array(myClassroomInviteSchema);

// ---------------------------------------------------------------------------------------
// Bulletin & announcements (Đợt C4)
// ---------------------------------------------------------------------------------------

export const sendClassroomAnnouncementBodySchema = Type.Object({
  message: Type.String({
    minLength: CLASSROOM_ANNOUNCEMENT_MIN_LENGTH,
    maxLength: CLASSROOM_ANNOUNCEMENT_MAX_LENGTH,
  }),
  language: announcementLanguageSchema,
});

// ---------------------------------------------------------------------------------------
// Admin oversight (Đợt C4)
// ---------------------------------------------------------------------------------------

export const adminClassroomSchema = Type.Object({
  id: UUIDSchema,
  name: Type.String(),
  ownerId: Type.Union([UUIDSchema, Type.Null()]),
  teacherCount: Type.Number(),
  activeStudentCount: Type.Number(),
  viewedAt: Type.String(),
  archivedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
});

export const adminClassroomListSchema = Type.Array(adminClassroomSchema);

// ---------------------------------------------------------------------------------------
// Nối lớp với LMS (Đợt C5)
// ---------------------------------------------------------------------------------------

export const assignClassroomCourseBodySchema = Type.Object({
  courseId: UUIDSchema,
  isMandatory: Type.Optional(Type.Boolean({ default: false })),
  dueDate: Type.Optional(Type.Union([Type.String({ format: "date-time" }), Type.Null()])),
});

export const classroomCourseSchema = Type.Object({
  courseId: UUIDSchema,
  title: Type.Record(Type.String(), Type.String()),
  isMandatory: Type.Boolean(),
  dueDate: Type.Union([Type.String(), Type.Null()]),
  assignedAt: Type.String(),
});

export const classroomCourseListSchema = Type.Array(classroomCourseSchema);

export const assignClassroomStudyBodySchema = Type.Object({
  studyId: UUIDSchema,
});

export const assignClassroomStudyResponseSchema = Type.Object({
  studentCount: Type.Number(),
});

// ---------------------------------------------------------------------------------------
// Báo cáo tiến độ (Đợt C6)
// ---------------------------------------------------------------------------------------

export const classroomProgressRatingSchema = Type.Object({
  category: Type.String(),
  current: Type.Number(),
  gamesPlayed: Type.Number(),
  ratingStart: Type.Number(),
  ratingEnd: Type.Number(),
});

export const classroomStudentProgressSchema = Type.Object({
  userId: UUIDSchema,
  username: Type.Union([Type.String(), Type.Null()]),
  realName: Type.String(),
  isManaged: Type.Boolean(),
  ratings: Type.Array(classroomProgressRatingSchema),
  matchesPlayed: Type.Number(),
  matchesWon: Type.Number(),
  winRate: Type.Number(),
  puzzlesAttempted: Type.Number(),
  puzzlesCorrect: Type.Number(),
  puzzleAccuracy: Type.Number(),
  playDurationMs: Type.Number(),
  learnCompletedLevels: Type.Number(),
  learnTotalLevels: Type.Number(),
  learnCompletionPercentage: Type.Number(),
});

export const classroomCourseProgressStudentSchema = Type.Object({
  userId: UUIDSchema,
  progress: Type.String(),
  finishedChapterCount: Type.Number(),
  completionPercentage: Type.Number(),
});

export const classroomCourseProgressSchema = Type.Object({
  courseId: UUIDSchema,
  title: Type.Record(Type.String(), Type.String()),
  isMandatory: Type.Boolean(),
  dueDate: Type.Union([Type.String(), Type.Null()]),
  totalChapterCount: Type.Number(),
  enrolledCount: Type.Number(),
  completedCount: Type.Number(),
  averageCompletionPercentage: Type.Number(),
  students: Type.Array(classroomCourseProgressStudentSchema),
});

export const classroomProgressResponseSchema = Type.Object({
  classroomId: UUIDSchema,
  days: Type.Number(),
  chess: Type.Object({
    students: Type.Array(classroomStudentProgressSchema),
    classAverage: Type.Object({
      winRate: Type.Number(),
      puzzleAccuracy: Type.Number(),
      learnCompletionPercentage: Type.Number(),
    }),
  }),
  courses: Type.Array(classroomCourseProgressSchema),
});

export type CreateClassroomBody = Static<typeof createClassroomBodySchema>;
export type UpdateClassroomBody = Static<typeof updateClassroomBodySchema>;
export type SetClassroomArchivedBody = Static<typeof setClassroomArchivedBodySchema>;
export type AddClassroomTeacherBody = Static<typeof addClassroomTeacherBodySchema>;
export type CreateClassroomStudentBody = Static<typeof createClassroomStudentBodySchema>;
export type BulkCreateClassroomStudentsBody = Static<typeof bulkCreateClassroomStudentsBodySchema>;
export type UpdateClassroomStudentBody = Static<typeof updateClassroomStudentBodySchema>;
export type SetClassroomStudentArchivedBody = Static<typeof setClassroomStudentArchivedBodySchema>;
export type ReleaseClassroomStudentBody = Static<typeof releaseClassroomStudentBodySchema>;
export type MoveClassroomStudentBody = Static<typeof moveClassroomStudentBodySchema>;
export type RunClassroomBulkActionBody = Static<typeof runClassroomBulkActionBodySchema>;
export type InviteClassroomStudentBody = Static<typeof inviteClassroomStudentBodySchema>;
export type SendClassroomAnnouncementBody = Static<typeof sendClassroomAnnouncementBodySchema>;
export type AssignClassroomCourseBody = Static<typeof assignClassroomCourseBodySchema>;
export type AssignClassroomStudyBody = Static<typeof assignClassroomStudyBodySchema>;
