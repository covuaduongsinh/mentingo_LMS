import type { UUIDType } from "src/common";

export type ClassroomRow = {
  id: UUIDType;
  name: string;
  description: string | null;
  wall: string;
  ownerId: UUIDType | null;
  canMsg: boolean;
  maxStudents: number;
  viewedAt: string;
  archivedAt: string | null;
  archivedBy: UUIDType | null;
  createdAt: string;
  updatedAt: string;
};

export type ClassroomTeacherRow = {
  id: UUIDType;
  classroomId: UUIDType;
  userId: UUIDType;
  addedBy: UUIDType | null;
};

export type CreateClassroomInput = {
  name: string;
  description?: string;
  canMsg?: boolean;
};

export type UpdateClassroomInput = {
  name?: string;
  description?: string;
  canMsg?: boolean;
  wall?: string;
};

export type CreatedClassroomStudent = {
  userId: UUIDType;
  username: string;
  temporaryPassword: string;
  realName: string;
};

export type UpdateClassroomStudentInput = {
  realName?: string;
  notes?: string;
};
