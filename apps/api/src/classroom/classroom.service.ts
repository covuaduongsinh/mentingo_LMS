import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ACTIVITY_LOG_ACTION_TYPES,
  ACTIVITY_LOG_RESOURCE_TYPES,
  ANNOUNCEMENT_EMAIL_TEMPLATES,
  ANNOUNCEMENT_SOURCE_TYPES,
  CHESS_LEARN_STAGES,
  CHESS_STUDY_MEMBER_ROLES,
  CLASSROOM_AUTO_ARCHIVE_INACTIVE_DAYS,
  CLASSROOM_BULK_ACTIONS,
  CLASSROOM_DEFAULTS,
  CLASSROOM_INVITE_STATUSES,
  PERMISSIONS,
  SYSTEM_ROLE_SLUGS,
} from "@repo/shared";
import { nanoid } from "nanoid";

import { ActivityLogsService } from "src/activity-logs/activity-logs.service";
import { AnnouncementsSchedulerService } from "src/announcements/announcements-scheduler.service";
import { hashToken } from "src/auth/utils/hash-auth-token";
import { ChessStudyService } from "src/chess/chess-study.service";
import {
  generateManagedAccountEmail,
  generatePseudonym,
  generateSafeCode,
  generateUsernameCandidate,
} from "src/chess-class/utils/safe-code.utils";
import { DatabasePg } from "src/common";
import hashPassword from "src/common/helpers/hashPassword";
import { resolveTenantOrigin } from "src/common/helpers/resolveTenantOrigin";
import { canUpdateCourseByAuthor } from "src/common/permissions/course-permission.utils";
import { hasPermission } from "src/common/permissions/permission.utils";
import { CourseService } from "src/courses/course.service";
import { UsersAssignedToCourseEvent } from "src/events/user/user-assigned-to-course.event";
import { OutboxPublisher } from "src/outbox/outbox.publisher";
import { SettingsService } from "src/settings/settings.service";
import { DB_ADMIN } from "src/storage/db/db.providers";
import { UserService } from "src/user/user.service";

import { ClassroomRepository, type NewClassroomManagedUserRow } from "./classroom.repository";

import type {
  CreateClassroomInput,
  CreatedClassroomStudent,
  UpdateClassroomInput,
  UpdateClassroomStudentInput,
} from "./classroom.types";
import type { ClassroomBulkAction, SupportedLanguages } from "@repo/shared";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

const TEMP_PASSWORD_LENGTH = 10;
const USERNAME_GENERATION_MAX_ATTEMPTS = 5;
const CREATE_TOKEN_EXPIRATION_YEARS = 1;
const CLASSROOM_AUTO_ARCHIVE_INACTIVE_MS =
  CLASSROOM_AUTO_ARCHIVE_INACTIVE_DAYS * 24 * 60 * 60 * 1000;
const CHESS_LEARN_TOTAL_LEVELS = CHESS_LEARN_STAGES.reduce(
  (sum, stage) => sum + stage.levels.length,
  0,
);
const CLASSROOM_PROGRESS_NOT_ENROLLED = "not_enrolled";

@Injectable()
export class ClassroomService {
  constructor(
    @Inject("DB") private readonly db: DatabasePg,
    @Inject(DB_ADMIN) private readonly dbAdmin: DatabasePg,
    private readonly repository: ClassroomRepository,
    private readonly settingsService: SettingsService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly userService: UserService,
    private readonly announcementsSchedulerService: AnnouncementsSchedulerService,
    private readonly chessStudyService: ChessStudyService,
    private readonly outboxPublisher: OutboxPublisher,
    @Inject(forwardRef(() => CourseService)) private readonly courseService: CourseService,
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

  /** Đợt C7: the roster's `realName` is teacher-entered PII for identifying the child, not a
   * profile field the account owner needs echoed back to them — hide a viewer's own row instead
   * of leaking it through a serializer meant for looking at *other* people. */
  private maskOwnRealName<T extends { userId: UUIDType; realName: string }>(
    row: T,
    viewerUserId: UUIDType,
  ): Omit<T, "realName"> & { realName: string | null } {
    return row.userId === viewerUserId ? { ...row, realName: null } : row;
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
    const students = await this.repository.listClassroomStudents(classroomId, includeArchived);
    return students.map((student) => this.maskOwnRealName(student, user.userId));
  }

  async getStudentDetail(classroomId: UUIDType, user: CurrentUserType, targetUserId: UUIDType) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const student = await this.repository.getClassroomStudent(classroomId, targetUserId);
    if (!student) {
      throw new NotFoundException("classroom.error.studentNotFound");
    }
    return this.maskOwnRealName(student, user.userId);
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

  // ---------------------------------------------------------------------------------------
  // Bulletin & announcements (Đợt C4)
  // ---------------------------------------------------------------------------------------

  /** Broadcasts a short message to every teacher and active student of the classroom, via the
   * existing generic announcements pipeline (in-app only — `sendEmail: false` — the classroom
   * link is auto-appended so recipients can jump straight to the class). */
  async sendAnnouncement(
    classroomId: UUIDType,
    user: CurrentUserType,
    message: string,
    language: SupportedLanguages,
  ) {
    const classroom = await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const activeStudentCount = await this.repository.countActiveStudents(classroomId);
    if (activeStudentCount > classroom.maxStudents) {
      throw new BadRequestException("classroom.error.tooManyStudentsForAnnouncement");
    }

    const tenantOrigin = await resolveTenantOrigin(this.dbAdmin, user.tenantId);
    const classroomLink = `${tenantOrigin}/classrooms/${classroomId}`;
    const content = `${message}\n\n${classroomLink}`;

    const announcement = await this.announcementsSchedulerService.createSystemAnnouncement({
      translations: [{ language, title: classroom.name, content }],
      baseLanguage: language,
      authorId: user.userId,
      scheduledAt: null,
      sendEmail: false,
      emailTemplate: ANNOUNCEMENT_EMAIL_TEMPLATES.DEFAULT,
      sourceType: ANNOUNCEMENT_SOURCE_TYPES.CLASSROOM,
      sourceId: classroomId,
    });

    await this.activityLogsService.recordActivity({
      actor: user,
      operation: ACTIVITY_LOG_ACTION_TYPES.CREATE,
      resourceType: ACTIVITY_LOG_RESOURCE_TYPES.ANNOUNCEMENT,
      resourceId: announcement.id,
      context: { classroomId },
    });

    return announcement;
  }

  // ---------------------------------------------------------------------------------------
  // Auto-archive cron (Đợt C4)
  // ---------------------------------------------------------------------------------------

  /** Always computes the candidate list (so a dry run still logs a meaningful count); only
   * writes when CLASSROOM_AUTO_ARCHIVE_ENABLED=true. Off by default on purpose — the cron
   * ships in dry-run mode until an operator has watched a few days of log output. */
  async autoArchiveInactiveClassrooms(): Promise<{ candidateCount: number }> {
    const cutoffIso = new Date(Date.now() - CLASSROOM_AUTO_ARCHIVE_INACTIVE_MS).toISOString();
    const candidateIds = await this.repository.findInactiveClassroomIds(cutoffIso);

    if (!candidateIds.length) return { candidateCount: 0 };

    if (process.env.CLASSROOM_AUTO_ARCHIVE_ENABLED === "true") {
      await this.repository.archiveClassroomsByIds(candidateIds);
    }

    return { candidateCount: candidateIds.length };
  }

  // ---------------------------------------------------------------------------------------
  // Teacher self-registration (Đợt C4)
  // ---------------------------------------------------------------------------------------

  /** Lets a user without classroom.create grant themselves the trainer role, additively (their
   * existing roles are untouched) — off by default, an admin must opt the tenant in via
   * CLASSROOM_TEACHER_SELF_REGISTRATION_ENABLED. */
  async becomeTeacher(user: CurrentUserType): Promise<void> {
    if (process.env.CLASSROOM_TEACHER_SELF_REGISTRATION_ENABLED !== "true") {
      throw new BadRequestException("classroom.error.selfRegistrationDisabled");
    }

    if (hasPermission(user.permissions, PERMISSIONS.CLASSROOM_CREATE)) {
      throw new BadRequestException("classroom.error.alreadyTeacher");
    }

    const trainerRoleId = await this.repository.findRoleIdBySlug(
      user.tenantId,
      SYSTEM_ROLE_SLUGS.TRAINER,
    );
    if (!trainerRoleId) {
      throw new BadRequestException("classroom.error.trainerRoleUnavailable");
    }

    await this.repository.addUserRole(user.userId, trainerRoleId);

    await this.activityLogsService.recordActivity({
      actor: user,
      operation: ACTIVITY_LOG_ACTION_TYPES.UPDATE,
      resourceType: ACTIVITY_LOG_RESOURCE_TYPES.USER,
      resourceId: user.userId,
      context: { action: "classroom-self-register-teacher" },
    });
  }

  // ---------------------------------------------------------------------------------------
  // Admin oversight (Đợt C4)
  // ---------------------------------------------------------------------------------------

  async listAllClassroomsForAdmin(includeArchived: boolean) {
    return this.repository.listAllClassroomsForAdmin(includeArchived);
  }

  // ---------------------------------------------------------------------------------------
  // Nối lớp với LMS — course assignment (Đợt C5)
  // ---------------------------------------------------------------------------------------

  /** Same security bar as CourseService.enrollGroupsToCourse: being the classroom's teacher is
   * not enough on its own — the caller also needs course.enrollment or to author the course.
   * Otherwise any trainer could enroll their whole class into someone else's paid course for
   * free by creating a classroom and pointing it at that course. */
  private async assertCanAssignCourse(user: CurrentUserType, courseId: UUIDType) {
    if (hasPermission(user.permissions, PERMISSIONS.COURSE_ENROLLMENT)) return;

    const authorId = await this.repository.getCourseAuthorId(courseId);
    if (authorId === null) throw new NotFoundException("classroom.error.courseNotFound");
    if (!canUpdateCourseByAuthor(user, authorId)) {
      throw new ForbiddenException("classroom.error.courseAssignNotAllowed");
    }
  }

  async assignCourse(
    classroomId: UUIDType,
    user: CurrentUserType,
    courseId: UUIDType,
    isMandatory: boolean,
    dueDate: string | null,
  ) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);
    await this.assertCanAssignCourse(user, courseId);

    const { newStudentIds } = await this.repository.assignCourse(
      classroomId,
      courseId,
      { isMandatory, dueDate },
      user.userId,
    );

    if (newStudentIds.length) {
      // Mirrors CourseService.enrollGroupsToCourse: chapter/lesson progress rows must exist
      // before the student can open the course. Not wrapped in the same DB transaction as the
      // student_courses insert (that already committed) — same eventual-consistency shape as
      // the rest of this multi-step flow (e.g. the outbox publish right below).
      await Promise.all(
        newStudentIds.map((studentId) =>
          this.courseService.createCourseDependencies(courseId, studentId),
        ),
      );

      await this.outboxPublisher.publish(
        new UsersAssignedToCourseEvent({ studentIds: newStudentIds, courseId }),
      );
    }

    await this.activityLogsService.recordActivity({
      actor: user,
      operation: ACTIVITY_LOG_ACTION_TYPES.ENROLL_COURSE,
      resourceType: ACTIVITY_LOG_RESOURCE_TYPES.COURSE,
      resourceId: courseId,
      context: { classroomId, newStudentCount: String(newStudentIds.length) },
    });

    return this.repository.listClassroomCourses(classroomId);
  }

  async unassignCourse(classroomId: UUIDType, user: CurrentUserType, courseId: UUIDType) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const result = await this.repository.unassignCourse(classroomId, courseId);
    if (!result) {
      throw new NotFoundException("classroom.error.courseNotAssigned");
    }

    return this.repository.listClassroomCourses(classroomId);
  }

  async listCourses(classroomId: UUIDType, user: CurrentUserType) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanRead(classroomId, user);
    return this.repository.listClassroomCourses(classroomId);
  }

  // ---------------------------------------------------------------------------------------
  // Nối lớp với LMS — chess Study (Đợt C5)
  // ---------------------------------------------------------------------------------------

  /** Bulk-shares a Study with every active student of the classroom by inserting into the
   * existing per-user chess_study_members table (read-only) — no new schema, no change to the
   * chess module. Authorization is delegated entirely to ChessStudyService.addMember (study
   * owner or chess.study.manage), same as a teacher sharing one-by-one. */
  async assignStudy(classroomId: UUIDType, user: CurrentUserType, studyId: UUIDType) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const students = await this.repository.listClassroomStudents(classroomId, false);

    let assignedCount = 0;
    for (const student of students) {
      try {
        await this.chessStudyService.addMember(
          studyId,
          { userId: student.userId, role: CHESS_STUDY_MEMBER_ROLES.READ },
          user,
        );
        assignedCount++;
      } catch (error) {
        // The study's own author can be a classroom student in some other context —
        // addMember rejects adding the owner as a member. Skip just that one student
        // rather than aborting the whole bulk assignment; any other failure (not found,
        // forbidden) is the same for every student, so it surfaces on the first iteration.
        if (!(error instanceof BadRequestException)) throw error;
      }
    }

    return { studentCount: assignedCount };
  }

  // ---------------------------------------------------------------------------------------
  // Báo cáo tiến độ (Đợt C6)
  // ---------------------------------------------------------------------------------------

  /** Teacher-only (like chess-class's CHESS_CLASS_PROGRESS-gated equivalent it supersedes) —
   * reveals every student's rating/win-rate/course-completion, not just their own. */
  async getProgressReport(classroomId: UUIDType, user: CurrentUserType, days: number) {
    await this.getClassroomOrThrow(classroomId);
    await this.assertCanManage(classroomId, user);

    const students = await this.repository.listClassroomStudents(classroomId, false);
    const userIds = students.map((student) => student.userId);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      ratings,
      ratingHistory,
      matches,
      puzzleAttempts,
      playDurations,
      learnCounts,
      courseRows,
    ] = await Promise.all([
      this.repository.getRatingsForUsers(userIds),
      this.repository.getRatingHistoryForUsers(userIds, since),
      this.repository.getFinishedMatchesForUsers(userIds, since),
      this.repository.getPuzzleAttemptsForUsers(userIds, since),
      this.repository.getPlayDurationForUsers(userIds, since),
      this.repository.getLearnCompletedCountsForUsers(userIds),
      this.repository.getClassroomCourseProgress(classroomId),
    ]);

    const chessStudents = students.map((student) => {
      const memberRatings = ratings.filter((rating) => rating.userId === student.userId);
      const memberHistory = ratingHistory.filter((row) => row.userId === student.userId);

      const memberMatches = matches.filter(
        (match) => match.whiteUserId === student.userId || match.blackUserId === student.userId,
      );
      const matchesWon = memberMatches.filter((match) => {
        const isWhite = match.whiteUserId === student.userId;
        return (
          (isWhite && match.result === "white_win") || (!isWhite && match.result === "black_win")
        );
      }).length;

      const memberPuzzles = puzzleAttempts.filter((row) => row.userId === student.userId);
      const puzzlesCorrect = memberPuzzles.filter((row) => row.correct).length;

      const learnCompleted =
        learnCounts.find((row) => row.userId === student.userId)?.completed ?? 0;

      return {
        userId: student.userId,
        username: student.username,
        realName: student.realName,
        isManaged: student.isManaged,
        ratings: memberRatings.map((rating) => {
          const categoryHistory = memberHistory.filter((row) => row.category === rating.category);
          return {
            category: rating.category,
            current: rating.rating,
            gamesPlayed: rating.gamesPlayed,
            ratingStart: categoryHistory[0]?.rating ?? rating.rating,
            ratingEnd: categoryHistory[categoryHistory.length - 1]?.rating ?? rating.rating,
          };
        }),
        matchesPlayed: memberMatches.length,
        matchesWon,
        winRate: memberMatches.length > 0 ? matchesWon / memberMatches.length : 0,
        puzzlesAttempted: memberPuzzles.length,
        puzzlesCorrect,
        puzzleAccuracy: memberPuzzles.length > 0 ? puzzlesCorrect / memberPuzzles.length : 0,
        playDurationMs: playDurations.find((row) => row.userId === student.userId)?.durationMs ?? 0,
        learnCompletedLevels: learnCompleted,
        learnTotalLevels: CHESS_LEARN_TOTAL_LEVELS,
        learnCompletionPercentage:
          CHESS_LEARN_TOTAL_LEVELS > 0
            ? Math.round((learnCompleted / CHESS_LEARN_TOTAL_LEVELS) * 100)
            : 0,
      };
    });

    const withMatches = chessStudents.filter((student) => student.matchesPlayed > 0);
    const withPuzzles = chessStudents.filter((student) => student.puzzlesAttempted > 0);

    const classAverage = {
      winRate:
        withMatches.length > 0
          ? withMatches.reduce((sum, student) => sum + student.winRate, 0) / withMatches.length
          : 0,
      puzzleAccuracy:
        withPuzzles.length > 0
          ? withPuzzles.reduce((sum, student) => sum + student.puzzleAccuracy, 0) /
            withPuzzles.length
          : 0,
      learnCompletionPercentage:
        chessStudents.length > 0
          ? Math.round(
              chessStudents.reduce((sum, student) => sum + student.learnCompletionPercentage, 0) /
                chessStudents.length,
            )
          : 0,
    };

    type CourseProgressAccumulator = {
      courseId: UUIDType;
      title: Record<string, string>;
      isMandatory: boolean;
      dueDate: string | null;
      totalChapterCount: number;
      students: Array<{
        userId: UUIDType;
        progress: string;
        finishedChapterCount: number;
        completionPercentage: number;
      }>;
    };

    const courseMap = new Map<UUIDType, CourseProgressAccumulator>();
    for (const row of courseRows) {
      let course = courseMap.get(row.courseId);
      if (!course) {
        course = {
          courseId: row.courseId,
          title: row.title,
          isMandatory: row.isMandatory,
          dueDate: row.dueDate,
          totalChapterCount: row.chapterCount,
          students: [],
        };
        courseMap.set(row.courseId, course);
      }

      const finishedChapterCount = row.finishedChapterCount ?? 0;
      const completionPercentage =
        row.progress !== null && course.totalChapterCount > 0
          ? Math.round((finishedChapterCount / course.totalChapterCount) * 100)
          : 0;

      course.students.push({
        userId: row.studentId,
        progress: row.progress ?? CLASSROOM_PROGRESS_NOT_ENROLLED,
        finishedChapterCount,
        completionPercentage,
      });
    }

    const courses = Array.from(courseMap.values()).map((course) => {
      const enrolledStudents = course.students.filter(
        (student) => student.progress !== CLASSROOM_PROGRESS_NOT_ENROLLED,
      );
      const completedCount = course.students.filter(
        (student) => student.progress === "completed",
      ).length;

      return {
        ...course,
        enrolledCount: enrolledStudents.length,
        completedCount,
        averageCompletionPercentage:
          course.students.length > 0
            ? Math.round(
                course.students.reduce((sum, student) => sum + student.completionPercentage, 0) /
                  course.students.length,
              )
            : 0,
      };
    });

    return {
      classroomId,
      days,
      chess: { students: chessStudents, classAverage },
      courses,
    };
  }
}
