import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { classrooms, classroomStudents, classroomTeachers, users } from "src/storage/schema";

import type { CreateClassroomInput, UpdateClassroomInput } from "./classroom.types";

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
}
