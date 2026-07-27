import { Inject, Injectable } from "@nestjs/common";
import { SYSTEM_ROLE_SLUGS } from "@repo/shared";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import {
  classroomInvites,
  classrooms,
  classroomStudents,
  classroomTeachers,
  createTokens,
  credentials,
  permissionRoles,
  permissionUserRoles,
  userOnboarding,
  users,
} from "src/storage/schema";

import type {
  CreateClassroomInput,
  UpdateClassroomInput,
  UpdateClassroomStudentInput,
} from "./classroom.types";
import type { ClassroomInviteStatus } from "@repo/shared";

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
    const [role] = await this.db
      .select({ id: permissionRoles.id })
      .from(permissionRoles)
      .where(
        and(
          eq(permissionRoles.tenantId, tenantId),
          eq(permissionRoles.slug, SYSTEM_ROLE_SLUGS.STUDENT),
        ),
      );

    return role?.id ?? null;
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
}
