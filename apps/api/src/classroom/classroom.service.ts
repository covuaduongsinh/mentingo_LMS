import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CLASSROOM_DEFAULTS, PERMISSIONS } from "@repo/shared";

import { hasPermission } from "src/common/permissions/permission.utils";

import { ClassroomRepository } from "./classroom.repository";

import type { CreateClassroomInput, UpdateClassroomInput } from "./classroom.types";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

@Injectable()
export class ClassroomService {
  constructor(private readonly repository: ClassroomRepository) {}

  private canManageAny(user: CurrentUserType): boolean {
    return hasPermission(user.permissions, PERMISSIONS.CLASSROOM_MANAGE);
  }

  /** Not a teacher/student of the classroom and not an admin ⇒ 404, never 403 — never reveal
   * whether a classroom exists to someone who has no relationship to it. */
  private async assertCanRead(classroomId: UUIDType, user: CurrentUserType) {
    if (this.canManageAny(user)) return;

    const [isTeacher, isStudent] = await Promise.all([
      this.repository.isTeacher(classroomId, user.userId),
      this.repository.isActiveStudent(classroomId, user.userId),
    ]);

    if (!isTeacher && !isStudent) {
      throw new NotFoundException("classroom.error.notFound");
    }
  }

  /** A student who IS a member gets 403 (they know the classroom exists); a stranger gets 404. */
  private async assertCanManage(classroomId: UUIDType, user: CurrentUserType) {
    if (this.canManageAny(user)) return;

    const isTeacher = await this.repository.isTeacher(classroomId, user.userId);
    if (isTeacher) return;

    const isStudent = await this.repository.isActiveStudent(classroomId, user.userId);
    if (isStudent) {
      throw new ForbiddenException("classroom.error.notTeacher");
    }

    throw new NotFoundException("classroom.error.notFound");
  }

  private async getClassroomOrThrow(classroomId: UUIDType) {
    const classroom = await this.repository.getClassroomById(classroomId);
    if (!classroom) {
      throw new NotFoundException("classroom.error.notFound");
    }
    return classroom;
  }

  async createClassroom(user: CurrentUserType, data: CreateClassroomInput) {
    return this.repository.createClassroom(data, user.userId);
  }

  async getClassroomDetail(classroomId: UUIDType, user: CurrentUserType) {
    const classroom = await this.getClassroomOrThrow(classroomId);
    await this.assertCanRead(classroomId, user);

    const isTeacher =
      this.canManageAny(user) || (await this.repository.isTeacher(classroomId, user.userId));
    if (isTeacher) {
      // Recorded only on a teacher opening the class — the sole signal the future
      // auto-archive job (C4) uses to decide a classroom is abandoned.
      await this.repository.touchViewedAt(classroomId);
    }

    const teachers = await this.repository.listTeachers(classroomId);

    return { ...classroom, teachers, isTeacher };
  }

  async listTeachingClassrooms(user: CurrentUserType) {
    return this.repository.listTeachingClassrooms(user.userId);
  }

  async listLearningClassrooms(user: CurrentUserType) {
    return this.repository.listLearningClassrooms(user.userId);
  }

  async updateClassroom(classroomId: UUIDType, user: CurrentUserType, data: UpdateClassroomInput) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const updated = await this.repository.updateClassroom(classroomId, data);
    if (!updated) {
      throw new NotFoundException("classroom.error.notFound");
    }
    return updated;
  }

  async setArchived(classroomId: UUIDType, user: CurrentUserType, archived: boolean) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const updated = await this.repository.setArchived(classroomId, archived ? user.userId : null);
    if (!updated) {
      throw new NotFoundException("classroom.error.notFound");
    }
    return updated;
  }

  async addTeacher(classroomId: UUIDType, user: CurrentUserType, targetUserId: UUIDType) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const targetUser = await this.repository.findUserByIdEnabled(targetUserId);
    if (!targetUser || targetUser.archived) {
      throw new BadRequestException("classroom.error.teacherNotFound");
    }

    const currentCount = await this.repository.countTeachers(classroomId);
    if (currentCount >= CLASSROOM_DEFAULTS.MAX_TEACHERS) {
      throw new BadRequestException("classroom.error.tooManyTeachers");
    }

    await this.repository.addTeacher(classroomId, targetUserId, user.userId);
    return this.repository.listTeachers(classroomId);
  }

  async removeTeacher(classroomId: UUIDType, user: CurrentUserType, targetUserId: UUIDType) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const currentCount = await this.repository.countTeachers(classroomId);
    if (currentCount <= 1) {
      throw new BadRequestException("classroom.error.lastTeacher");
    }

    await this.repository.removeTeacher(classroomId, targetUserId);
    return this.repository.listTeachers(classroomId);
  }
}
