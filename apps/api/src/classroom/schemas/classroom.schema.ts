import { Type, type Static } from "@sinclair/typebox";

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

export type CreateClassroomBody = Static<typeof createClassroomBodySchema>;
export type UpdateClassroomBody = Static<typeof updateClassroomBodySchema>;
export type SetClassroomArchivedBody = Static<typeof setClassroomArchivedBodySchema>;
export type AddClassroomTeacherBody = Static<typeof addClassroomTeacherBodySchema>;
