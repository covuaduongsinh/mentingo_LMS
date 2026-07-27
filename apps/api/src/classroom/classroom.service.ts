import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ACTIVITY_LOG_ACTION_TYPES,
  ACTIVITY_LOG_RESOURCE_TYPES,
  CLASSROOM_BULK_ACTIONS,
  CLASSROOM_DEFAULTS,
  CLASSROOM_INVITE_STATUSES,
  PERMISSIONS,
  SYSTEM_ROLE_SLUGS,
} from "@repo/shared";
import { nanoid } from "nanoid";

import { ActivityLogsService } from "src/activity-logs/activity-logs.service";
import { hashToken } from "src/auth/utils/hash-auth-token";
import {
  generateManagedAccountEmail,
  generatePseudonym,
  generateSafeCode,
  generateUsernameCandidate,
} from "src/chess-class/utils/safe-code.utils";
import { DatabasePg } from "src/common";
import hashPassword from "src/common/helpers/hashPassword";
import { hasPermission } from "src/common/permissions/permission.utils";
import { SettingsService } from "src/settings/settings.service";
import { UserService } from "src/user/user.service";

import { ClassroomRepository, type NewClassroomManagedUserRow } from "./classroom.repository";

import type {
  CreateClassroomInput,
  CreatedClassroomStudent,
  UpdateClassroomInput,
  UpdateClassroomStudentInput,
} from "./classroom.types";
import type { ClassroomBulkAction } from "@repo/shared";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

const TEMP_PASSWORD_LENGTH = 10;
const USERNAME_GENERATION_MAX_ATTEMPTS = 5;
const CREATE_TOKEN_EXPIRATION_YEARS = 1;

@Injectable()
export class ClassroomService {
  constructor(
    @Inject("DB") private readonly db: DatabasePg,
    private readonly repository: ClassroomRepository,
    private readonly settingsService: SettingsService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly userService: UserService,
  ) {}

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

  private async getManagedStudentOrThrow(classroomId: UUIDType, userId: UUIDType) {
    const student = await this.repository.getClassroomStudent(classroomId, userId);
    if (!student) {
      throw new NotFoundException("classroom.error.studentNotFound");
    }
    if (!student.isManaged) {
      throw new BadRequestException("classroom.error.studentNotManaged");
    }
    return student;
  }

  async createClassroom(user: CurrentUserType, data: CreateClassroomInput) {
    return this.repository.createClassroom(data, user.userId);
  }

  /** Đợt C2 backward-compat bridge — see ClassroomRepository.getClassroomIdBySourceGroupId. */
  async findClassroomIdForSourceGroup(groupId: UUIDType) {
    return this.repository.getClassroomIdBySourceGroupId(groupId);
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

  // ---------------------------------------------------------------------------------------
  // Students (Đợt C3)
  // ---------------------------------------------------------------------------------------

  async listStudents(classroomId: UUIDType, user: CurrentUserType, includeArchived: boolean) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanRead(classroomId, user);
    return this.repository.listClassroomStudents(classroomId, includeArchived);
  }

  async getStudentDetail(classroomId: UUIDType, user: CurrentUserType, targetUserId: UUIDType) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const student = await this.repository.getClassroomStudent(classroomId, targetUserId);
    if (!student) {
      throw new NotFoundException("classroom.error.studentNotFound");
    }
    return student;
  }

  async updateStudent(
    classroomId: UUIDType,
    user: CurrentUserType,
    targetUserId: UUIDType,
    data: UpdateClassroomStudentInput,
  ) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const updated = await this.repository.updateClassroomStudent(classroomId, targetUserId, data);
    if (!updated) {
      throw new NotFoundException("classroom.error.studentNotFound");
    }
    // The plain UPDATE...RETURNING row has no `username` (only the join in
    // getClassroomStudent does) — re-fetch so the response matches classroomStudentSchema.
    return this.repository.getClassroomStudent(classroomId, targetUserId);
  }

  async setStudentArchived(
    classroomId: UUIDType,
    user: CurrentUserType,
    targetUserId: UUIDType,
    archived: boolean,
  ) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const updated = await this.repository.setClassroomStudentArchived(
      classroomId,
      targetUserId,
      archived ? user.userId : null,
    );
    if (!updated) {
      throw new NotFoundException("classroom.error.studentNotFound");
    }
    // Same reason as updateStudent: the RETURNING row has no `username` join.
    return this.repository.getClassroomStudent(classroomId, targetUserId);
  }

  private async generateUniqueUsernames(count: number): Promise<string[]> {
    const usernames = new Set<string>();

    for (
      let attempt = 0;
      attempt < USERNAME_GENERATION_MAX_ATTEMPTS && usernames.size < count;
      attempt++
    ) {
      const needed = count - usernames.size;
      const candidates = Array.from({ length: needed }, () => generateUsernameCandidate());
      const existing = await this.repository.findExistingUsernames(candidates);

      for (const candidate of candidates) {
        if (usernames.size >= count) break;
        if (!existing.has(candidate)) usernames.add(candidate);
      }
    }

    if (usernames.size < count) {
      throw new BadRequestException("classroom.error.usernameGenerationFailed");
    }

    return Array.from(usernames);
  }

  private async assertRoomForStudents(classroomId: UUIDType, additional: number) {
    const currentCount = await this.repository.countActiveStudents(classroomId);
    if (currentCount + additional > CLASSROOM_DEFAULTS.MAX_STUDENTS) {
      throw new BadRequestException("classroom.error.tooManyStudents");
    }
  }

  async createStudent(
    classroomId: UUIDType,
    user: CurrentUserType,
    realName: string,
  ): Promise<CreatedClassroomStudent> {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);
    await this.assertRoomForStudents(classroomId, 1);

    const roleId = await this.repository.findStudentRoleId(user.tenantId);
    if (!roleId) throw new BadRequestException("classroom.error.studentRoleUnavailable");

    const [username] = await this.generateUniqueUsernames(1);
    const temporaryPassword = generateSafeCode(TEMP_PASSWORD_LENGTH);
    const hashedPassword = await hashPassword(temporaryPassword);
    const pseudonym = generatePseudonym();

    const createdUser = await this.db.transaction(async (trx) => {
      const [created] = await this.repository.insertManagedUsers(
        [
          {
            email: generateManagedAccountEmail(),
            firstName: pseudonym.firstName,
            lastName: pseudonym.lastName,
            username,
            realName,
            managedByUserId: user.userId,
          },
        ],
        trx,
      );

      await this.repository.insertCredentials([{ userId: created.id, hashedPassword }], trx);
      await this.repository.insertOnboardingRows([created.id], trx);
      await this.repository.insertRoleAssignments([{ userId: created.id, roleId }], trx);
      await this.settingsService.createSettingsForUsers(
        [{ userId: created.id, roleSlugs: [SYSTEM_ROLE_SLUGS.STUDENT] }],
        trx,
      );
      await this.repository.insertClassroomStudentsBulk(
        [{ classroomId, userId: created.id, realName, addedBy: user.userId }],
        trx,
      );

      return created;
    });

    return { userId: createdUser.id, username, temporaryPassword, realName };
  }

  async bulkCreateStudents(
    classroomId: UUIDType,
    user: CurrentUserType,
    names: string[],
  ): Promise<CreatedClassroomStudent[]> {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const trimmedNames = names.map((name) => name.trim()).filter(Boolean);
    if (!trimmedNames.length) {
      throw new BadRequestException("classroom.error.noNamesProvided");
    }
    await this.assertRoomForStudents(classroomId, trimmedNames.length);

    const roleId = await this.repository.findStudentRoleId(user.tenantId);
    if (!roleId) throw new BadRequestException("classroom.error.studentRoleUnavailable");

    const usernames = await this.generateUniqueUsernames(trimmedNames.length);
    const plainPasswords = trimmedNames.map(() => generateSafeCode(TEMP_PASSWORD_LENGTH));
    const hashedPasswords = await Promise.all(
      plainPasswords.map((password) => hashPassword(password)),
    );

    const insertRows: NewClassroomManagedUserRow[] = trimmedNames.map((realName, index) => {
      const pseudonym = generatePseudonym();
      return {
        email: generateManagedAccountEmail(),
        firstName: pseudonym.firstName,
        lastName: pseudonym.lastName,
        username: usernames[index],
        realName,
        managedByUserId: user.userId,
      };
    });

    const createdUsers = await this.db.transaction(async (trx) => {
      const created = await this.repository.insertManagedUsers(insertRows, trx);
      const userIds = created.map((row) => row.id);

      await this.repository.insertCredentials(
        created.map((row, index) => ({ userId: row.id, hashedPassword: hashedPasswords[index] })),
        trx,
      );
      await this.repository.insertOnboardingRows(userIds, trx);
      await this.repository.insertRoleAssignments(
        userIds.map((userId) => ({ userId, roleId })),
        trx,
      );
      await this.settingsService.createSettingsForUsers(
        userIds.map((userId) => ({ userId, roleSlugs: [SYSTEM_ROLE_SLUGS.STUDENT] })),
        trx,
      );
      await this.repository.insertClassroomStudentsBulk(
        created.map((row, index) => ({
          classroomId,
          userId: row.id,
          realName: trimmedNames[index],
          addedBy: user.userId,
        })),
        trx,
      );

      return created;
    });

    return createdUsers.map((row, index) => ({
      userId: row.id,
      username: usernames[index],
      temporaryPassword: plainPasswords[index],
      realName: trimmedNames[index],
    }));
  }

  async resetStudentPassword(classroomId: UUIDType, user: CurrentUserType, targetUserId: UUIDType) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);
    await this.getManagedStudentOrThrow(classroomId, targetUserId);

    const temporaryPassword = generateSafeCode(TEMP_PASSWORD_LENGTH);
    const hashedPassword = await hashPassword(temporaryPassword);
    await this.repository.updatePassword(targetUserId, hashedPassword);

    await this.activityLogsService.recordActivity({
      actor: user,
      operation: ACTIVITY_LOG_ACTION_TYPES.SEND_PASSWORD_RESET_EMAIL,
      resourceType: ACTIVITY_LOG_RESOURCE_TYPES.USER,
      resourceId: targetUserId,
      context: { classroomId },
    });

    return temporaryPassword;
  }

  async releaseStudent(
    classroomId: UUIDType,
    user: CurrentUserType,
    targetUserId: UUIDType,
    email: string,
  ) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);
    await this.getManagedStudentOrThrow(classroomId, targetUserId);

    const existing = await this.repository.findUserByEmail(email);
    if (existing) throw new BadRequestException("classroom.error.emailAlreadyExists");

    await this.repository.releaseUserAccount(targetUserId, email);
    await this.repository.setClassroomStudentManagedFlagFalse(targetUserId);

    const createToken = nanoid(64);
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + CREATE_TOKEN_EXPIRATION_YEARS);
    await this.repository.insertCreateToken(targetUserId, hashToken(createToken), expiryDate);

    await this.activityLogsService.recordActivity({
      actor: user,
      operation: ACTIVITY_LOG_ACTION_TYPES.UPDATE,
      resourceType: ACTIVITY_LOG_RESOURCE_TYPES.USER,
      resourceId: targetUserId,
      context: { classroomId, action: "release" },
    });

    return createToken;
  }

  async closeStudent(classroomId: UUIDType, user: CurrentUserType, targetUserId: UUIDType) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const student = await this.repository.getClassroomStudent(classroomId, targetUserId);
    if (!student) {
      throw new NotFoundException("classroom.error.studentNotFound");
    }

    if (student.isManaged) {
      await this.repository.deleteClassroomStudent(classroomId, targetUserId);
      await this.userService.bulkArchiveUsers([targetUserId]);

      await this.activityLogsService.recordActivity({
        actor: user,
        operation: ACTIVITY_LOG_ACTION_TYPES.DELETE,
        resourceType: ACTIVITY_LOG_RESOURCE_TYPES.USER,
        resourceId: targetUserId,
        context: { classroomId, action: "close" },
      });
      return;
    }

    if (!student.archivedAt) {
      throw new BadRequestException("classroom.error.studentNotArchived");
    }
    await this.repository.deleteClassroomStudent(classroomId, targetUserId);
  }

  async moveStudent(
    fromClassroomId: UUIDType,
    user: CurrentUserType,
    targetUserId: UUIDType,
    toClassroomId: UUIDType,
  ) {
    await this.getClassroomOrThrow(fromClassroomId);
    await this.getClassroomOrThrow(toClassroomId);
    await this.assertCanManage(fromClassroomId, user);
    await this.assertCanManage(toClassroomId, user);

    const student = await this.repository.getClassroomStudent(fromClassroomId, targetUserId);
    if (!student) {
      throw new NotFoundException("classroom.error.studentNotFound");
    }

    const existingAtTarget = await this.repository.getClassroomStudent(toClassroomId, targetUserId);
    if (!existingAtTarget) {
      // Preserve the student's full profile across a move — only the classroom link changes.
      await this.repository.insertClassroomStudent(
        toClassroomId,
        targetUserId,
        student.realName,
        student.isManaged,
        user.userId,
        { notes: student.notes, archivedAt: student.archivedAt },
      );
    }
    await this.repository.deleteClassroomStudent(fromClassroomId, targetUserId);

    return this.repository.listClassroomStudents(toClassroomId, true);
  }

  /** Bulk action over a list of student user ids — the caller supplies exactly which ids to
   * act on (the UI pattern: prefill every row, let the teacher remove the ones to keep). */
  async runBulkStudentAction(
    classroomId: UUIDType,
    user: CurrentUserType,
    action: ClassroomBulkAction,
    userIds: UUIDType[],
    targetClassroomId?: UUIDType,
  ) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    if (!userIds.length) {
      throw new BadRequestException("classroom.error.noStudentsSelected");
    }

    if (action === CLASSROOM_BULK_ACTIONS.MOVE) {
      if (!targetClassroomId) {
        throw new BadRequestException("classroom.error.targetClassroomRequired");
      }
      for (const userId of userIds) {
        await this.moveStudent(classroomId, user, userId, targetClassroomId);
      }
      return this.repository.listClassroomStudents(classroomId, true);
    }

    for (const userId of userIds) {
      if (action === CLASSROOM_BULK_ACTIONS.ARCHIVE) {
        await this.repository.setClassroomStudentArchived(classroomId, userId, user.userId);
      } else if (action === CLASSROOM_BULK_ACTIONS.RESTORE) {
        await this.repository.setClassroomStudentArchived(classroomId, userId, null);
      } else if (action === CLASSROOM_BULK_ACTIONS.REMOVE) {
        await this.closeStudent(classroomId, user, userId);
      }
    }

    return this.repository.listClassroomStudents(classroomId, true);
  }

  // ---------------------------------------------------------------------------------------
  // Invites (Đợt C3)
  // ---------------------------------------------------------------------------------------

  async inviteStudent(
    classroomId: UUIDType,
    user: CurrentUserType,
    username: string,
    realName: string,
  ) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);
    await this.assertRoomForStudents(classroomId, 1);

    const invitee = await this.repository.findUserByUsername(username);
    if (!invitee) {
      throw new BadRequestException("classroom.error.userNotFound");
    }

    const isTeacher = await this.repository.isTeacher(classroomId, invitee.id);
    if (isTeacher) {
      throw new BadRequestException("classroom.error.cannotInviteTeacher");
    }

    const existingStudent = await this.repository.getClassroomStudent(classroomId, invitee.id);
    if (existingStudent) {
      if (existingStudent.archivedAt) {
        await this.repository.setClassroomStudentArchived(classroomId, invitee.id, null);
        return { feedback: "already" as const };
      }
      return { feedback: "already" as const };
    }

    const pendingInvite = await this.repository.findPendingInvite(classroomId, invitee.id);
    if (pendingInvite) {
      return { feedback: "found" as const };
    }

    await this.repository.createInvite(classroomId, invitee.id, realName, user.userId);
    return { feedback: "invited" as const };
  }

  async listClassroomInvites(classroomId: UUIDType, user: CurrentUserType) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);
    return this.repository.listClassroomInvites(classroomId);
  }

  async revokeInvite(classroomId: UUIDType, user: CurrentUserType, inviteId: UUIDType) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const invite = await this.repository.getInviteById(inviteId);
    if (!invite || invite.classroomId !== classroomId) {
      throw new NotFoundException("classroom.error.inviteNotFound");
    }
    await this.repository.deleteInvite(inviteId);
  }

  async listMyInvites(user: CurrentUserType) {
    return this.repository.listMyInvites(user.userId);
  }

  private async getOwnInviteOrThrow(inviteId: UUIDType, user: CurrentUserType) {
    const invite = await this.repository.getInviteById(inviteId);
    // Same 404-not-403 rule as classrooms: someone who isn't the invitee should not be able
    // to tell an invite exists at all.
    if (!invite || invite.userId !== user.userId) {
      throw new NotFoundException("classroom.error.inviteNotFound");
    }
    return invite;
  }

  async acceptInvite(inviteId: UUIDType, user: CurrentUserType) {
    const invite = await this.getOwnInviteOrThrow(inviteId, user);
    if (invite.status === CLASSROOM_INVITE_STATUSES.ACCEPTED) {
      return invite;
    }

    await this.assertRoomForStudents(invite.classroomId, 1);
    await this.repository.insertClassroomStudent(
      invite.classroomId,
      user.userId,
      invite.realName,
      false,
      invite.createdBy ?? user.userId,
    );
    return this.repository.setInviteStatus(inviteId, CLASSROOM_INVITE_STATUSES.ACCEPTED);
  }

  async declineInvite(inviteId: UUIDType, user: CurrentUserType) {
    const invite = await this.getOwnInviteOrThrow(inviteId, user);
    if (invite.status === CLASSROOM_INVITE_STATUSES.ACCEPTED) {
      return invite;
    }
    return this.repository.setInviteStatus(inviteId, CLASSROOM_INVITE_STATUSES.DECLINED);
  }
}
