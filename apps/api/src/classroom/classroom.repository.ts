import { Inject, Injectable } from "@nestjs/common";
import {
  CHESS_MATCH_STATUSES,
  COURSE_ENROLLMENT,
  PERMISSIONS,
  SYSTEM_ROLE_SLUGS,
} from "@repo/shared";
import { and, asc, desc, eq, gte, inArray, isNull, not, or, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { userHasAnyPermissionsCondition } from "src/common/permissions/permission-sql.utils";
import {
  chessClassLoginCodes,
  chessLearnProgress,
  chessMatches,
  chessPlaySessions,
  chessPuzzleAttempts,
  chessRatingHistory,
  chessRatings,
  classroomCourses,
  classroomInvites,
  classrooms,
  classroomStudents,
  classroomTeachers,
  courses,
  createTokens,
  credentials,
  permissionRoles,
  permissionUserRoles,
  studentCourses,
  userOnboarding,
  users,
} from "src/storage/schema";

import type {
  CreateClassroomInput,
  UpdateClassroomInput,
  UpdateClassroomStudentInput,
} from "./classroom.types";
import type { ClassroomInviteStatus, LocalizedText } from "@repo/shared";

export type NewClassroomManagedUserRow = {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  realName: string;
  managedByUserId: UUIDType;
};

@Injectable()
export class ClassroomRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async createClassroom(data: CreateClassroomInput, ownerId: UUIDType) {
    return this.db.transaction(async (trx) => {
      const [classroom] = await trx
        .insert(classrooms)
        .values({
          name: data.name,
          description: data.description,
          canMsg: data.canMsg ?? false,
          ownerId,
        })
        .returning();

      await trx.insert(classroomTeachers).values({
        classroomId: classroom.id,
        userId: ownerId,
        addedBy: ownerId,
      });

      return classroom;
    });
  }

  async getClassroomById(classroomId: UUIDType) {
    const [classroom] = await this.db
      .select()
      .from(classrooms)
      .where(eq(classrooms.id, classroomId));

    return classroom ?? null;
  }

  /** Đợt C2 backward-compat bridge only — resolves a pre-existing `groups`-based chess-class
   * to the `classrooms` row backfilled from it (0204_backfill_classrooms_from_groups), so the
   * old /admin/chess/classes/:groupId page can link to its new counterpart. Not used by any
   * other Classroom feature. */
  async getClassroomIdBySourceGroupId(groupId: UUIDType) {
    const [row] = await this.db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(eq(classrooms.sourceGroupId, groupId));

    return row?.id ?? null;
  }

  async updateClassroom(classroomId: UUIDType, data: UpdateClassroomInput) {
    const [updated] = await this.db
      .update(classrooms)
      .set(data)
      .where(eq(classrooms.id, classroomId))
      .returning();

    return updated ?? null;
  }

  async touchViewedAt(classroomId: UUIDType) {
    await this.db
      .update(classrooms)
      .set({ viewedAt: new Date().toISOString() })
      .where(eq(classrooms.id, classroomId));
  }

  async setArchived(classroomId: UUIDType, archivedBy: UUIDType | null) {
    const [updated] = await this.db
      .update(classrooms)
      .set({
        archivedAt: archivedBy ? new Date().toISOString() : null,
        archivedBy,
      })
      .where(eq(classrooms.id, classroomId))
      .returning();

    return updated ?? null;
  }

  async isTeacher(classroomId: UUIDType, userId: UUIDType): Promise<boolean> {
    const [row] = await this.db
      .select({ id: classroomTeachers.id })
      .from(classroomTeachers)
      .where(
        and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.userId, userId)),
      );

    return !!row;
  }

  async isActiveStudent(classroomId: UUIDType, userId: UUIDType): Promise<boolean> {
    const [row] = await this.db
      .select({ id: classroomStudents.id })
      .from(classroomStudents)
      .where(
        and(
          eq(classroomStudents.classroomId, classroomId),
          eq(classroomStudents.userId, userId),
          isNull(classroomStudents.archivedAt),
        ),
      );

    return !!row;
  }

  async countTeachers(classroomId: UUIDType): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(classroomTeachers)
      .where(eq(classroomTeachers.classroomId, classroomId));

    return row?.count ?? 0;
  }

  async listTeachers(classroomId: UUIDType) {
    return this.db
      .select({
        userId: classroomTeachers.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        addedBy: classroomTeachers.addedBy,
      })
      .from(classroomTeachers)
      .innerJoin(users, eq(classroomTeachers.userId, users.id))
      .where(eq(classroomTeachers.classroomId, classroomId));
  }

  async addTeacher(classroomId: UUIDType, userId: UUIDType, addedBy: UUIDType) {
    const [row] = await this.db
      .insert(classroomTeachers)
      .values({ classroomId, userId, addedBy })
      .onConflictDoNothing()
      .returning();

    return row ?? null;
  }

  async removeTeacher(classroomId: UUIDType, userId: UUIDType) {
    await this.db
      .delete(classroomTeachers)
      .where(
        and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.userId, userId)),
      );
  }

  async findUserByIdEnabled(userId: UUIDType) {
    const [user] = await this.db
      .select({ id: users.id, archived: users.archived })
      .from(users)
      .where(eq(users.id, userId));

    return user ?? null;
  }

  /** Classrooms taught by this user — active classes first, ordered by last viewed. */
  async listTeachingClassrooms(userId: UUIDType) {
    return this.db
      .select({ classroom: classrooms })
      .from(classroomTeachers)
      .innerJoin(classrooms, eq(classroomTeachers.classroomId, classrooms.id))
      .where(eq(classroomTeachers.userId, userId))
      .orderBy(asc(sql`(${classrooms.archivedAt} is not null)`), desc(classrooms.viewedAt))
      .limit(100)
      .then((rows) => rows.map((row) => row.classroom));
  }

  /** Classrooms this user is an active (non-archived) student of. */
  async listLearningClassrooms(userId: UUIDType) {
    return this.db
      .select({ classroom: classrooms })
      .from(classroomStudents)
      .innerJoin(classrooms, eq(classroomStudents.classroomId, classrooms.id))
      .where(
        and(
          eq(classroomStudents.userId, userId),
          isNull(classroomStudents.archivedAt),
          isNull(classrooms.archivedAt),
        ),
      )
      .orderBy(desc(classrooms.createdAt))
      .limit(20)
      .then((rows) => rows.map((row) => row.classroom));
  }

  // ---------------------------------------------------------------------------------------
  // Auto-archive cron (Đợt C4)
  // ---------------------------------------------------------------------------------------

  /** Candidates for the auto-archive cron — no teacher has opened the classroom since
   * `cutoffIso`. Always computed (even in dry-run mode) so the cron can log a candidate
   * count before any write happens. */
  async findInactiveClassroomIds(cutoffIso: string): Promise<UUIDType[]> {
    const rows = await this.db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(and(isNull(classrooms.archivedAt), sql`${classrooms.viewedAt} < ${cutoffIso}`));

    return rows.map((row) => row.id);
  }

  /** Bulk system archive — `archivedBy` stays null (unlike a teacher-initiated archive) so the
   * admin list can tell the two apart. */
  async archiveClassroomsByIds(classroomIds: UUIDType[]) {
    if (!classroomIds.length) return [];

    return this.db
      .update(classrooms)
      .set({ archivedAt: new Date().toISOString() })
      .where(and(inArray(classrooms.id, classroomIds), isNull(classrooms.archivedAt)))
      .returning({ id: classrooms.id });
  }

  // ---------------------------------------------------------------------------------------
  // Admin oversight (Đợt C4)
  // ---------------------------------------------------------------------------------------

  async listAllClassroomsForAdmin(includeArchived: boolean) {
    const teacherCounts = this.db
      .select({
        classroomId: classroomTeachers.classroomId,
        count: sql<number>`count(*)::int`.as("teacher_count"),
      })
      .from(classroomTeachers)
      .groupBy(classroomTeachers.classroomId)
      .as("teacher_counts");

    const studentCounts = this.db
      .select({
        classroomId: classroomStudents.classroomId,
        count: sql<number>`count(*)::int`.as("student_count"),
      })
      .from(classroomStudents)
      .where(isNull(classroomStudents.archivedAt))
      .groupBy(classroomStudents.classroomId)
      .as("student_counts");

    return this.db
      .select({
        id: classrooms.id,
        name: classrooms.name,
        ownerId: classrooms.ownerId,
        teacherCount: sql<number>`coalesce(${teacherCounts.count}, 0)::int`,
        activeStudentCount: sql<number>`coalesce(${studentCounts.count}, 0)::int`,
        viewedAt: classrooms.viewedAt,
        archivedAt: classrooms.archivedAt,
        createdAt: classrooms.createdAt,
      })
      .from(classrooms)
      .leftJoin(teacherCounts, eq(teacherCounts.classroomId, classrooms.id))
      .leftJoin(studentCounts, eq(studentCounts.classroomId, classrooms.id))
      .where(includeArchived ? undefined : isNull(classrooms.archivedAt))
      .orderBy(asc(classrooms.name));
  }

  // ---------------------------------------------------------------------------------------
  // Students (Đợt C3)
  // ---------------------------------------------------------------------------------------

  async countActiveStudents(classroomId: UUIDType): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(classroomStudents)
      .where(
        and(eq(classroomStudents.classroomId, classroomId), isNull(classroomStudents.archivedAt)),
      );

    return row?.count ?? 0;
  }

  async listClassroomStudents(classroomId: UUIDType, includeArchived: boolean) {
    return this.db
      .select({
        userId: classroomStudents.userId,
        realName: classroomStudents.realName,
        notes: classroomStudents.notes,
        isManaged: classroomStudents.isManaged,
        archivedAt: classroomStudents.archivedAt,
        username: users.username,
      })
      .from(classroomStudents)
      .innerJoin(users, eq(classroomStudents.userId, users.id))
      .where(
        and(
          eq(classroomStudents.classroomId, classroomId),
          includeArchived ? undefined : isNull(classroomStudents.archivedAt),
        ),
      )
      .orderBy(asc(classroomStudents.realName));
  }

  async getClassroomStudent(classroomId: UUIDType, userId: UUIDType) {
    const [row] = await this.db
      .select({
        userId: classroomStudents.userId,
        classroomId: classroomStudents.classroomId,
        realName: classroomStudents.realName,
        notes: classroomStudents.notes,
        isManaged: classroomStudents.isManaged,
        archivedAt: classroomStudents.archivedAt,
        username: users.username,
      })
      .from(classroomStudents)
      .innerJoin(users, eq(classroomStudents.userId, users.id))
      .where(
        and(eq(classroomStudents.classroomId, classroomId), eq(classroomStudents.userId, userId)),
      );

    return row ?? null;
  }

  async insertClassroomStudent(
    classroomId: UUIDType,
    userId: UUIDType,
    realName: string,
    isManaged: boolean,
    addedBy: UUIDType,
    preserve?: { notes?: string; archivedAt?: string | null; archivedBy?: UUIDType | null },
  ) {
    const [row] = await this.db
      .insert(classroomStudents)
      .values({
        classroomId,
        userId,
        realName,
        isManaged,
        addedBy,
        notes: preserve?.notes,
        archivedAt: preserve?.archivedAt,
        archivedBy: preserve?.archivedBy,
      })
      .onConflictDoNothing()
      .returning();

    return row ?? null;
  }

  async updateClassroomStudent(
    classroomId: UUIDType,
    userId: UUIDType,
    data: UpdateClassroomStudentInput,
  ) {
    const [row] = await this.db
      .update(classroomStudents)
      .set(data)
      .where(
        and(eq(classroomStudents.classroomId, classroomId), eq(classroomStudents.userId, userId)),
      )
      .returning();

    return row ?? null;
  }

  async setClassroomStudentArchived(
    classroomId: UUIDType,
    userId: UUIDType,
    archivedBy: UUIDType | null,
  ) {
    const [row] = await this.db
      .update(classroomStudents)
      .set({
        archivedAt: archivedBy ? new Date().toISOString() : null,
        archivedBy,
      })
      .where(
        and(eq(classroomStudents.classroomId, classroomId), eq(classroomStudents.userId, userId)),
      )
      .returning();

    return row ?? null;
  }

  async deleteClassroomStudent(classroomId: UUIDType, userId: UUIDType) {
    await this.db
      .delete(classroomStudents)
      .where(
        and(eq(classroomStudents.classroomId, classroomId), eq(classroomStudents.userId, userId)),
      );
  }

  async setClassroomStudentManagedFlagFalse(userId: UUIDType) {
    await this.db
      .update(classroomStudents)
      .set({ isManaged: false })
      .where(eq(classroomStudents.userId, userId));
  }

  async findExistingUsernames(candidates: string[]): Promise<Set<string>> {
    if (!candidates.length) return new Set();

    const rows = await this.db
      .select({ username: users.username })
      .from(users)
      .where(inArray(users.username, candidates));

    return new Set(
      rows.map((row) => row.username).filter((username): username is string => !!username),
    );
  }

  async findUserByUsername(username: string) {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user ?? null;
  }

  async findUserByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async findStudentRoleId(tenantId: UUIDType): Promise<UUIDType | null> {
    return this.findRoleIdBySlug(tenantId, SYSTEM_ROLE_SLUGS.STUDENT);
  }

  async findRoleIdBySlug(tenantId: UUIDType, slug: string): Promise<UUIDType | null> {
    const [role] = await this.db
      .select({ id: permissionRoles.id })
      .from(permissionRoles)
      .where(and(eq(permissionRoles.tenantId, tenantId), eq(permissionRoles.slug, slug)));

    return role?.id ?? null;
  }

  /** Additive role grant — unlike UserService's role-replace flow, this never touches the
   * user's other roles (Đợt C4 teacher self-registration only ever adds trainer). */
  async addUserRole(userId: UUIDType, roleId: UUIDType) {
    await this.db.insert(permissionUserRoles).values({ userId, roleId }).onConflictDoNothing();
  }

  async insertManagedUsers(rows: NewClassroomManagedUserRow[], trx: DatabasePg) {
    if (!rows.length) return [];

    return trx
      .insert(users)
      .values(rows.map((row) => ({ ...row, isManagedAccount: true })))
      .returning();
  }

  async insertCredentials(
    rows: Array<{ userId: UUIDType; hashedPassword: string }>,
    trx: DatabasePg,
  ) {
    if (!rows.length) return;

    await trx
      .insert(credentials)
      .values(rows.map(({ userId, hashedPassword }) => ({ userId, password: hashedPassword })));
  }

  async insertOnboardingRows(userIds: UUIDType[], trx: DatabasePg) {
    if (!userIds.length) return;

    await trx.insert(userOnboarding).values(userIds.map((userId) => ({ userId })));
  }

  async insertRoleAssignments(
    rows: Array<{ userId: UUIDType; roleId: UUIDType }>,
    trx: DatabasePg,
  ) {
    if (!rows.length) return;

    await trx.insert(permissionUserRoles).values(rows);
  }

  async insertClassroomStudentsBulk(
    rows: Array<{ classroomId: UUIDType; userId: UUIDType; realName: string; addedBy: UUIDType }>,
    trx: DatabasePg,
  ) {
    if (!rows.length) return [];

    return trx
      .insert(classroomStudents)
      .values(rows.map((row) => ({ ...row, isManaged: true })))
      .returning();
  }

  async updatePassword(userId: UUIDType, hashedPassword: string) {
    await this.db
      .update(credentials)
      .set({ password: hashedPassword })
      .where(eq(credentials.userId, userId));
  }

  async releaseUserAccount(userId: UUIDType, email: string) {
    await this.db
      .update(users)
      .set({ email, isManagedAccount: false, managedByUserId: null })
      .where(eq(users.id, userId));
  }

  async insertCreateToken(userId: UUIDType, tokenHash: string, expiryDate: Date) {
    await this.db.insert(createTokens).values({ userId, tokenHash, expiryDate });
  }

  // ---------------------------------------------------------------------------------------
  // Invites (Đợt C3)
  // ---------------------------------------------------------------------------------------

  async findPendingInvite(classroomId: UUIDType, userId: UUIDType) {
    const [row] = await this.db
      .select()
      .from(classroomInvites)
      .where(
        and(
          eq(classroomInvites.classroomId, classroomId),
          eq(classroomInvites.userId, userId),
          eq(classroomInvites.status, "pending"),
        ),
      );

    return row ?? null;
  }

  async createInvite(
    classroomId: UUIDType,
    userId: UUIDType,
    realName: string,
    createdBy: UUIDType,
  ) {
    const [row] = await this.db
      .insert(classroomInvites)
      .values({ classroomId, userId, realName, createdBy })
      .returning();

    return row;
  }

  async listClassroomInvites(classroomId: UUIDType) {
    return this.db
      .select({
        id: classroomInvites.id,
        userId: classroomInvites.userId,
        realName: classroomInvites.realName,
        status: classroomInvites.status,
        createdAt: classroomInvites.createdAt,
        username: users.username,
      })
      .from(classroomInvites)
      .innerJoin(users, eq(classroomInvites.userId, users.id))
      .where(eq(classroomInvites.classroomId, classroomId))
      .orderBy(desc(classroomInvites.createdAt));
  }

  async listMyInvites(userId: UUIDType) {
    return this.db
      .select({
        id: classroomInvites.id,
        classroomId: classroomInvites.classroomId,
        realName: classroomInvites.realName,
        status: classroomInvites.status,
        createdAt: classroomInvites.createdAt,
        classroomName: classrooms.name,
      })
      .from(classroomInvites)
      .innerJoin(classrooms, eq(classroomInvites.classroomId, classrooms.id))
      .where(and(eq(classroomInvites.userId, userId), eq(classroomInvites.status, "pending")))
      .orderBy(desc(classroomInvites.createdAt));
  }

  async getInviteById(inviteId: UUIDType) {
    const [row] = await this.db
      .select()
      .from(classroomInvites)
      .where(eq(classroomInvites.id, inviteId));

    return row ?? null;
  }

  async setInviteStatus(inviteId: UUIDType, status: ClassroomInviteStatus) {
    const [row] = await this.db
      .update(classroomInvites)
      .set({ status })
      .where(eq(classroomInvites.id, inviteId))
      .returning();

    return row ?? null;
  }

  async deleteInvite(inviteId: UUIDType) {
    await this.db.delete(classroomInvites).where(eq(classroomInvites.id, inviteId));
  }

  // ---------------------------------------------------------------------------------------
  // Nối lớp với LMS — course assignment (Đợt C5)
  // ---------------------------------------------------------------------------------------

  async getCourseAuthorId(courseId: UUIDType): Promise<UUIDType | null> {
    const [course] = await this.db
      .select({ authorId: courses.authorId })
      .from(courses)
      .where(eq(courses.id, courseId));

    return course?.authorId ?? null;
  }

  /** Mirrors CourseService.enrollGroupsToCourse's two-pass shape (backfill provenance for
   * students already enrolled some other way, then insert fresh rows for the rest), scoped to
   * classroom_students/classroom_courses instead of group_users/group_courses — kept as an
   * independent path rather than generalizing the group version, to avoid touching that
   * well-exercised flow (see classroom-business-spec.md C5 rationale). No calendar-event
   * integration in this pass (classroom_courses has no calendarEventId column). */
  async assignCourse(
    classroomId: UUIDType,
    courseId: UUIDType,
    data: { isMandatory: boolean; dueDate: string | null },
    enrolledBy: UUIDType,
  ): Promise<{ newStudentIds: UUIDType[] }> {
    let newStudentIds: UUIDType[] = [];

    await this.db.transaction(async (trx) => {
      await trx
        .insert(classroomCourses)
        .values({
          classroomId,
          courseId,
          enrolledBy,
          isMandatory: data.isMandatory,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        })
        .onConflictDoUpdate({
          target: [classroomCourses.classroomId, classroomCourses.courseId],
          set: {
            isMandatory: sql`EXCLUDED.is_mandatory`,
            enrolledBy: sql`EXCLUDED.enrolled_by`,
            dueDate: sql`EXCLUDED.due_date`,
          },
        });

      const excludeCourseStaff = not(
        userHasAnyPermissionsCondition(
          this.db,
          classroomStudents.userId,
          classroomStudents.tenantId,
          [PERMISSIONS.COURSE_UPDATE, PERMISSIONS.COURSE_UPDATE_OWN],
        ),
      );

      const studentsToAttachProvenance = await trx
        .select({ studentId: classroomStudents.userId })
        .from(classroomStudents)
        .innerJoin(
          studentCourses,
          and(
            eq(studentCourses.studentId, classroomStudents.userId),
            eq(studentCourses.courseId, courseId),
            eq(studentCourses.status, COURSE_ENROLLMENT.ENROLLED),
          ),
        )
        .where(
          and(
            eq(classroomStudents.classroomId, classroomId),
            isNull(classroomStudents.archivedAt),
            excludeCourseStaff,
            isNull(studentCourses.enrolledByClassroomId),
          ),
        );

      if (studentsToAttachProvenance.length) {
        await trx
          .update(studentCourses)
          .set({ enrolledByClassroomId: classroomId })
          .where(
            and(
              eq(studentCourses.courseId, courseId),
              eq(studentCourses.status, COURSE_ENROLLMENT.ENROLLED),
              isNull(studentCourses.enrolledByClassroomId),
              inArray(
                studentCourses.studentId,
                studentsToAttachProvenance.map((row) => row.studentId),
              ),
            ),
          );
      }

      const eligibleStudents = await trx
        .select({ studentId: classroomStudents.userId })
        .from(classroomStudents)
        .leftJoin(
          studentCourses,
          and(
            eq(studentCourses.studentId, classroomStudents.userId),
            eq(studentCourses.courseId, courseId),
            eq(studentCourses.status, COURSE_ENROLLMENT.ENROLLED),
          ),
        )
        .where(
          and(
            eq(classroomStudents.classroomId, classroomId),
            isNull(classroomStudents.archivedAt),
            excludeCourseStaff,
            isNull(studentCourses.id),
          ),
        );

      if (eligibleStudents.length) {
        const inserted = await trx
          .insert(studentCourses)
          .values(
            eligibleStudents.map(({ studentId }) => ({
              studentId,
              courseId,
              enrolledByClassroomId: classroomId,
              status: COURSE_ENROLLMENT.ENROLLED,
            })),
          )
          .onConflictDoUpdate({
            target: [studentCourses.courseId, studentCourses.studentId],
            set: {
              enrolledAt: sql`EXCLUDED.enrolled_at`,
              status: sql`EXCLUDED.status`,
              enrolledByClassroomId: sql`EXCLUDED.enrolled_by_classroom_id`,
            },
          })
          .returning({ studentId: studentCourses.studentId });

        newStudentIds = inserted.map((row) => row.studentId);
      }
    });

    return { newStudentIds };
  }

  /** Mirrors CourseService.unenrollGroupsFromCourse: removes the classroom_courses link, then
   * for each student whose enrollment provenance was exactly this classroom — reassigns
   * provenance to another still-assigned classroom for the same course if one exists, otherwise
   * soft-unenrolls (status flip, row kept so progress history survives). */
  async unassignCourse(classroomId: UUIDType, courseId: UUIDType) {
    const [link] = await this.db
      .select({ id: classroomCourses.id })
      .from(classroomCourses)
      .where(
        and(eq(classroomCourses.classroomId, classroomId), eq(classroomCourses.courseId, courseId)),
      );

    if (!link) return null;

    const studentsToUnenroll = await this.db
      .select({ studentId: studentCourses.studentId })
      .from(studentCourses)
      .where(
        and(
          eq(studentCourses.courseId, courseId),
          eq(studentCourses.enrolledByClassroomId, classroomId),
          not(
            userHasAnyPermissionsCondition(
              this.db,
              studentCourses.studentId,
              studentCourses.tenantId,
              [PERMISSIONS.COURSE_UPDATE, PERMISSIONS.COURSE_UPDATE_OWN],
            ),
          ),
        ),
      );
    const studentIdsToUnenroll = studentsToUnenroll.map((row) => row.studentId);

    await this.db.transaction(async (trx) => {
      await trx
        .delete(classroomCourses)
        .where(
          and(
            eq(classroomCourses.classroomId, classroomId),
            eq(classroomCourses.courseId, courseId),
          ),
        );

      if (!studentIdsToUnenroll.length) return;

      const studentsInOtherClassrooms = await trx
        .select({
          studentId: classroomStudents.userId,
          classroomId: classroomCourses.classroomId,
        })
        .from(classroomStudents)
        .innerJoin(
          classroomCourses,
          eq(classroomCourses.classroomId, classroomStudents.classroomId),
        )
        .where(
          and(
            inArray(classroomStudents.userId, studentIdsToUnenroll),
            isNull(classroomStudents.archivedAt),
            eq(classroomCourses.courseId, courseId),
            not(eq(classroomCourses.classroomId, classroomId)),
          ),
        )
        .orderBy(classroomStudents.createdAt);

      const reassignments = new Map(
        studentsInOtherClassrooms.map((row) => [row.studentId, row.classroomId]),
      );

      await Promise.all(
        [...reassignments.entries()].map(([studentId, newClassroomId]) =>
          trx
            .update(studentCourses)
            .set({ enrolledByClassroomId: newClassroomId })
            .where(
              and(eq(studentCourses.courseId, courseId), eq(studentCourses.studentId, studentId)),
            ),
        ),
      );

      const studentsToCompletelyUnenroll = studentIdsToUnenroll.filter(
        (studentId) => !reassignments.has(studentId),
      );

      if (studentsToCompletelyUnenroll.length) {
        await trx
          .update(studentCourses)
          .set({
            status: COURSE_ENROLLMENT.NOT_ENROLLED,
            enrolledAt: null,
            enrolledByClassroomId: null,
          })
          .where(
            and(
              eq(studentCourses.courseId, courseId),
              inArray(studentCourses.studentId, studentsToCompletelyUnenroll),
            ),
          );
      }
    });

    return { unenrolledStudentIds: studentIdsToUnenroll };
  }

  async listClassroomCourses(classroomId: UUIDType) {
    return this.db
      .select({
        courseId: classroomCourses.courseId,
        title: sql<LocalizedText>`${courses.title}`,
        isMandatory: classroomCourses.isMandatory,
        dueDate: sql<
          string | null
        >`TO_CHAR(${classroomCourses.dueDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        assignedAt: classroomCourses.createdAt,
      })
      .from(classroomCourses)
      .innerJoin(courses, eq(courses.id, classroomCourses.courseId))
      .where(eq(classroomCourses.classroomId, classroomId))
      .orderBy(desc(classroomCourses.createdAt));
  }

  // ---------------------------------------------------------------------------------------
  // Báo cáo tiến độ (Đợt C6)
  // ---------------------------------------------------------------------------------------

  async getRatingsForUsers(userIds: UUIDType[]) {
    if (!userIds.length) return [];

    return this.db
      .select({
        userId: chessRatings.userId,
        category: chessRatings.category,
        rating: chessRatings.rating,
        gamesPlayed: chessRatings.gamesPlayed,
      })
      .from(chessRatings)
      .where(inArray(chessRatings.userId, userIds));
  }

  /** Ordered ascending so the service can take the first/last row per category as start/end. */
  async getRatingHistoryForUsers(userIds: UUIDType[], since: Date) {
    if (!userIds.length) return [];

    return this.db
      .select({
        userId: chessRatingHistory.userId,
        category: chessRatingHistory.category,
        rating: chessRatingHistory.rating,
        createdAt: chessRatingHistory.createdAt,
      })
      .from(chessRatingHistory)
      .where(
        and(
          inArray(chessRatingHistory.userId, userIds),
          gte(chessRatingHistory.createdAt, since.toISOString()),
        ),
      )
      .orderBy(asc(chessRatingHistory.createdAt));
  }

  async getFinishedMatchesForUsers(userIds: UUIDType[], since: Date) {
    if (!userIds.length) return [];

    return this.db
      .select({
        whiteUserId: chessMatches.whiteUserId,
        blackUserId: chessMatches.blackUserId,
        result: chessMatches.result,
      })
      .from(chessMatches)
      .where(
        and(
          eq(chessMatches.status, CHESS_MATCH_STATUSES.FINISHED),
          gte(chessMatches.createdAt, since.toISOString()),
          or(
            inArray(chessMatches.whiteUserId, userIds),
            inArray(chessMatches.blackUserId, userIds),
          ),
        ),
      );
  }

  async getPuzzleAttemptsForUsers(userIds: UUIDType[], since: Date) {
    if (!userIds.length) return [];

    return this.db
      .select({ userId: chessPuzzleAttempts.userId, correct: chessPuzzleAttempts.correct })
      .from(chessPuzzleAttempts)
      .where(
        and(
          inArray(chessPuzzleAttempts.userId, userIds),
          gte(chessPuzzleAttempts.createdAt, since.toISOString()),
        ),
      );
  }

  /** Vs-engine play only (chess_play_sessions) — PvP matches have no duration column to sum. */
  async getPlayDurationForUsers(userIds: UUIDType[], since: Date) {
    if (!userIds.length) return [];

    return this.db
      .select({
        userId: chessPlaySessions.userId,
        durationMs: sql<number>`COALESCE(SUM(${chessPlaySessions.durationMs}), 0)::int`,
      })
      .from(chessPlaySessions)
      .where(
        and(
          inArray(chessPlaySessions.userId, userIds),
          gte(chessPlaySessions.createdAt, since.toISOString()),
        ),
      )
      .groupBy(chessPlaySessions.userId);
  }

  /** Cumulative, not windowed by `since` — a Learn level is completed once, ever. */
  async getLearnCompletedCountsForUsers(userIds: UUIDType[]) {
    if (!userIds.length) return [];

    return this.db
      .select({ userId: chessLearnProgress.userId, completed: sql<number>`COUNT(*)::int` })
      .from(chessLearnProgress)
      .where(inArray(chessLearnProgress.userId, userIds))
      .groupBy(chessLearnProgress.userId);
  }

  /** One row per (course, active student); `progress`/`finishedChapterCount` are null when the
   * student was never enrolled in that course — the service reports that as "not_enrolled"
   * rather than silently treating it the same as "not_started". */
  async getClassroomCourseProgress(classroomId: UUIDType) {
    return this.db
      .select({
        courseId: classroomCourses.courseId,
        title: sql<LocalizedText>`${courses.title}`,
        isMandatory: classroomCourses.isMandatory,
        dueDate: sql<
          string | null
        >`TO_CHAR(${classroomCourses.dueDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        chapterCount: courses.chapterCount,
        studentId: classroomStudents.userId,
        progress: studentCourses.progress,
        finishedChapterCount: studentCourses.finishedChapterCount,
      })
      .from(classroomCourses)
      .innerJoin(courses, eq(courses.id, classroomCourses.courseId))
      .innerJoin(
        classroomStudents,
        and(
          eq(classroomStudents.classroomId, classroomCourses.classroomId),
          isNull(classroomStudents.archivedAt),
        ),
      )
      .leftJoin(
        studentCourses,
        and(
          eq(studentCourses.courseId, classroomCourses.courseId),
          eq(studentCourses.studentId, classroomStudents.userId),
          eq(studentCourses.status, COURSE_ENROLLMENT.ENROLLED),
        ),
      )
      .where(eq(classroomCourses.classroomId, classroomId))
      .orderBy(desc(classroomCourses.createdAt));
  }

  // ---------------------------------------------------------------------------------------
  // Mã đăng nhập nhanh (Đợt C8 — ported from the deleted chess-class module)
  // ---------------------------------------------------------------------------------------

  async invalidateActiveLoginCodes(userIds: UUIDType[]) {
    if (!userIds.length) return;

    await this.db
      .update(chessClassLoginCodes)
      .set({ consumedAt: new Date() })
      .where(
        and(inArray(chessClassLoginCodes.userId, userIds), isNull(chessClassLoginCodes.consumedAt)),
      );
  }

  async insertLoginCodes(
    rows: Array<{ userId: UUIDType; classroomId: UUIDType; codeHash: string; expiresAt: Date }>,
  ) {
    if (!rows.length) return [];

    return this.db.insert(chessClassLoginCodes).values(rows).returning();
  }
}
