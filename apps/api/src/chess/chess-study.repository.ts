import { Inject, Injectable } from "@nestjs/common";
import {
  CHESS_STUDY_MEMBER_ROLES,
  CHESS_STUDY_VISIBILITY,
  COURSE_ENROLLMENT,
  LESSON_TYPES,
  type SupportedLanguages,
} from "@repo/shared";
import { and, count, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { buildJsonbField } from "src/common/helpers/sqlHelpers";
import {
  chapters,
  chessPracticeAttempts,
  chessStudies,
  chessStudyChapters,
  chessStudyMembers,
  courses,
  lessonChessStudies,
  lessons,
  studentCourses,
  users,
} from "src/storage/schema";

import type {
  CreateChessStudyBody,
  CreateChessStudyChapterBody,
  UpdateChessStudyBody,
  UpdateChessStudyChapterBody,
} from "./schemas/chess-study.schema";

export type ListChessStudiesParams = {
  page?: number;
  perPage?: number;
  search?: string;
  topic?: string;
  /** When set, only studies visible to this user: public ones, their own, or ones they're a member of. */
  viewerId: UUIDType;
  /** When true, restrict to studies authored by viewerId. */
  mineOnly?: boolean;
  /** When true, only studies where viewer is a member (not the author). */
  sharedOnly?: boolean;
};

@Injectable()
export class ChessStudyRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async listStudies(params: ListChessStudiesParams) {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const offset = (page - 1) * perPage;

    const conditions = [];
    if (params.mineOnly) {
      conditions.push(eq(chessStudies.authorId, params.viewerId));
    } else if (params.sharedOnly) {
      conditions.push(
        and(
          ne(chessStudies.authorId, params.viewerId),
          sql`EXISTS (
            SELECT 1 FROM ${chessStudyMembers}
            WHERE ${chessStudyMembers.studyId} = ${chessStudies.id}
              AND ${chessStudyMembers.userId} = ${params.viewerId}
          )`,
        ),
      );
    } else {
      conditions.push(
        or(
          eq(chessStudies.visibility, CHESS_STUDY_VISIBILITY.PUBLIC),
          eq(chessStudies.authorId, params.viewerId),
          sql`EXISTS (
            SELECT 1 FROM ${chessStudyMembers}
            WHERE ${chessStudyMembers.studyId} = ${chessStudies.id}
              AND ${chessStudyMembers.userId} = ${params.viewerId}
          )`,
        ),
      );
    }
    if (params.search) {
      conditions.push(ilike(chessStudies.title, `%${params.search}%`));
    }
    if (params.topic) {
      conditions.push(sql`${params.topic} = ANY(${chessStudies.topics})`);
    }

    const where = and(...conditions);

    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(chessStudies)
        .where(where)
        .orderBy(desc(chessStudies.updatedAt))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(chessStudies).where(where),
    ]);

    return {
      data: rows,
      pagination: { totalItems: Number(totalRow[0]?.total ?? 0), page, perPage },
    };
  }

  async getStudyById(id: UUIDType) {
    const [row] = await this.db.select().from(chessStudies).where(eq(chessStudies.id, id));
    return row ?? null;
  }

  async getChaptersByStudyId(studyId: UUIDType) {
    return this.db
      .select()
      .from(chessStudyChapters)
      .where(eq(chessStudyChapters.studyId, studyId))
      .orderBy(chessStudyChapters.displayOrder);
  }

  async getChapterById(chapterId: UUIDType) {
    const [row] = await this.db
      .select()
      .from(chessStudyChapters)
      .where(eq(chessStudyChapters.id, chapterId));
    return row ?? null;
  }

  async getMembersByStudyId(studyId: UUIDType) {
    return this.db
      .select({
        userId: chessStudyMembers.userId,
        role: chessStudyMembers.role,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(chessStudyMembers)
      .innerJoin(users, eq(users.id, chessStudyMembers.userId))
      .where(eq(chessStudyMembers.studyId, studyId));
  }

  async getMemberRole(studyId: UUIDType, userId: UUIDType) {
    const [row] = await this.db
      .select({ role: chessStudyMembers.role })
      .from(chessStudyMembers)
      .where(and(eq(chessStudyMembers.studyId, studyId), eq(chessStudyMembers.userId, userId)));
    return row?.role ?? null;
  }

  async findUserIdByIdentity(identity: string): Promise<UUIDType | null> {
    const trimmed = identity.trim();
    if (!trimmed) return null;
    const [byEmail] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, trimmed), isNull(users.deletedAt)))
      .limit(1);
    if (byEmail) return byEmail.id;
    const [byUsername] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, trimmed), isNull(users.deletedAt)))
      .limit(1);
    return byUsername?.id ?? null;
  }

  async createStudy(body: CreateChessStudyBody, authorId: UUIDType) {
    const [row] = await this.db
      .insert(chessStudies)
      .values({
        title: body.title,
        description: body.description ?? null,
        visibility: body.visibility ?? CHESS_STUDY_VISIBILITY.PRIVATE,
        topics: body.topics ?? [],
        allowClone: body.allowClone ?? true,
        authorId,
      })
      .returning();
    return row;
  }

  async updateStudy(id: UUIDType, body: UpdateChessStudyBody) {
    const [row] = await this.db
      .update(chessStudies)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
        ...(body.topics !== undefined ? { topics: body.topics } : {}),
        ...(body.allowClone !== undefined ? { allowClone: body.allowClone } : {}),
      })
      .where(eq(chessStudies.id, id))
      .returning();
    return row ?? null;
  }

  async deleteStudy(id: UUIDType) {
    const deleted = await this.db
      .delete(chessStudies)
      .where(eq(chessStudies.id, id))
      .returning({ id: chessStudies.id });
    return deleted.length > 0;
  }

  /** Copies a study and every one of its chapters; the clone always starts out private. */
  async cloneStudy(sourceId: UUIDType, newAuthorId: UUIDType) {
    return this.db.transaction(async (trx) => {
      const [source] = await trx.select().from(chessStudies).where(eq(chessStudies.id, sourceId));
      if (!source) return null;

      const [clone] = await trx
        .insert(chessStudies)
        .values({
          title: source.title,
          description: source.description,
          visibility: CHESS_STUDY_VISIBILITY.PRIVATE,
          topics: source.topics,
          sourceStudyId: source.id,
          authorId: newAuthorId,
          chapterCount: source.chapterCount,
        })
        .returning();

      const sourceChapters = await trx
        .select()
        .from(chessStudyChapters)
        .where(eq(chessStudyChapters.studyId, sourceId))
        .orderBy(chessStudyChapters.displayOrder);

      if (sourceChapters.length > 0) {
        await trx.insert(chessStudyChapters).values(
          sourceChapters.map((chapter) => ({
            studyId: clone.id,
            title: chapter.title,
            rootFen: chapter.rootFen,
            moveNodes: chapter.moveNodes,
            mode: chapter.mode,
            concealFromPly: chapter.concealFromPly,
            practiceGoal: chapter.practiceGoal,
            practiceGoalType: chapter.practiceGoalType,
            practiceGoalTargetValue: chapter.practiceGoalTargetValue,
            orientation: chapter.orientation,
            description: chapter.description,
            pgnTags: chapter.pgnTags,
            displayOrder: chapter.displayOrder,
          })),
        );
      }

      return clone;
    });
  }

  async createChapter(studyId: UUIDType, body: CreateChessStudyChapterBody) {
    return this.db.transaction(async (trx) => {
      const [{ maxOrder }] = await trx
        .select({ maxOrder: sql<number>`COALESCE(MAX(${chessStudyChapters.displayOrder}), -1)` })
        .from(chessStudyChapters)
        .where(eq(chessStudyChapters.studyId, studyId));

      const [row] = await trx
        .insert(chessStudyChapters)
        .values({
          studyId,
          title: body.title,
          rootFen: body.rootFen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          moveNodes: body.moveNodes ?? [],
          mode: body.mode,
          concealFromPly: body.concealFromPly ?? null,
          practiceGoal: body.practiceGoal ?? null,
          practiceGoalType: body.practiceGoalType ?? null,
          practiceGoalTargetValue: body.practiceGoalTargetValue ?? null,
          orientation: body.orientation ?? "white",
          description: body.description ?? null,
          pgnTags: body.pgnTags ?? {},
          displayOrder: Number(maxOrder) + 1,
        })
        .returning();

      await trx
        .update(chessStudies)
        .set({ chapterCount: sql`${chessStudies.chapterCount} + 1` })
        .where(eq(chessStudies.id, studyId));

      return row;
    });
  }

  async updateChapter(chapterId: UUIDType, body: UpdateChessStudyChapterBody) {
    const [row] = await this.db
      .update(chessStudyChapters)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.rootFen !== undefined ? { rootFen: body.rootFen } : {}),
        ...(body.moveNodes !== undefined ? { moveNodes: body.moveNodes } : {}),
        ...(body.mode !== undefined ? { mode: body.mode } : {}),
        ...(body.concealFromPly !== undefined ? { concealFromPly: body.concealFromPly } : {}),
        ...(body.practiceGoal !== undefined ? { practiceGoal: body.practiceGoal } : {}),
        ...(body.practiceGoalType !== undefined ? { practiceGoalType: body.practiceGoalType } : {}),
        ...(body.practiceGoalTargetValue !== undefined
          ? { practiceGoalTargetValue: body.practiceGoalTargetValue }
          : {}),
        ...(body.orientation !== undefined ? { orientation: body.orientation } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.pgnTags !== undefined ? { pgnTags: body.pgnTags } : {}),
      })
      .where(eq(chessStudyChapters.id, chapterId))
      .returning();
    return row ?? null;
  }

  /** Bulk-insert chapters produced by a PGN import (S1). */
  async createChaptersFromImport(studyId: UUIDType, chapters: CreateChessStudyChapterBody[]) {
    return this.db.transaction(async (trx) => {
      const [{ maxOrder }] = await trx
        .select({ maxOrder: sql<number>`COALESCE(MAX(${chessStudyChapters.displayOrder}), -1)` })
        .from(chessStudyChapters)
        .where(eq(chessStudyChapters.studyId, studyId));

      let order = Number(maxOrder);
      const created = [];
      for (const body of chapters) {
        order += 1;
        const [row] = await trx
          .insert(chessStudyChapters)
          .values({
            studyId,
            title: body.title,
            rootFen: body.rootFen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            moveNodes: body.moveNodes ?? [],
            mode: body.mode,
            concealFromPly: body.concealFromPly ?? null,
            practiceGoal: body.practiceGoal ?? null,
            practiceGoalType: body.practiceGoalType ?? null,
            practiceGoalTargetValue: body.practiceGoalTargetValue ?? null,
            orientation: body.orientation ?? "white",
            description: body.description ?? null,
            pgnTags: body.pgnTags ?? {},
            displayOrder: order,
          })
          .returning();
        created.push(row);
      }

      if (created.length > 0) {
        await trx
          .update(chessStudies)
          .set({ chapterCount: sql`${chessStudies.chapterCount} + ${created.length}` })
          .where(eq(chessStudies.id, studyId));
      }

      return created;
    });
  }

  async deleteChapter(studyId: UUIDType, chapterId: UUIDType) {
    return this.db.transaction(async (trx) => {
      const deleted = await trx
        .delete(chessStudyChapters)
        .where(eq(chessStudyChapters.id, chapterId))
        .returning({ id: chessStudyChapters.id });

      if (deleted.length > 0) {
        await trx
          .update(chessStudies)
          .set({ chapterCount: sql`GREATEST(${chessStudies.chapterCount} - 1, 0)` })
          .where(eq(chessStudies.id, studyId));
      }

      return deleted.length > 0;
    });
  }

  async reorderChapters(studyId: UUIDType, chapterIds: UUIDType[]) {
    await this.db.transaction(async (trx) => {
      for (const [index, chapterId] of chapterIds.entries()) {
        await trx
          .update(chessStudyChapters)
          .set({ displayOrder: index })
          .where(
            and(eq(chessStudyChapters.id, chapterId), eq(chessStudyChapters.studyId, studyId)),
          );
      }
    });
  }

  async addMember(
    studyId: UUIDType,
    userId: UUIDType,
    role: (typeof CHESS_STUDY_MEMBER_ROLES)[keyof typeof CHESS_STUDY_MEMBER_ROLES] = CHESS_STUDY_MEMBER_ROLES.READ,
  ) {
    await this.db
      .insert(chessStudyMembers)
      .values({
        studyId,
        userId,
        role,
      })
      .onConflictDoUpdate({
        target: [chessStudyMembers.studyId, chessStudyMembers.userId],
        set: { role },
      });
  }

  async removeMember(studyId: UUIDType, userId: UUIDType) {
    await this.db
      .delete(chessStudyMembers)
      .where(and(eq(chessStudyMembers.studyId, studyId), eq(chessStudyMembers.userId, userId)));
  }

  async insertPracticeAttempt(data: {
    chapterId: UUIDType;
    userId: UUIDType;
    movesUsed: number;
    achievedGoal: boolean;
  }) {
    const [row] = await this.db.insert(chessPracticeAttempts).values(data).returning();
    return row;
  }

  async getBestMovesUsed(chapterId: UUIDType, userId: UUIDType): Promise<number | null> {
    const [row] = await this.db
      .select({ best: sql<number | null>`MIN(${chessPracticeAttempts.movesUsed})` })
      .from(chessPracticeAttempts)
      .where(
        and(
          eq(chessPracticeAttempts.chapterId, chapterId),
          eq(chessPracticeAttempts.userId, userId),
          eq(chessPracticeAttempts.achievedGoal, true),
        ),
      );
    return row?.best ?? null;
  }

  async hasAchievedGoal(chapterId: UUIDType, userId: UUIDType): Promise<boolean> {
    const [row] = await this.db
      .select({ total: count() })
      .from(chessPracticeAttempts)
      .where(
        and(
          eq(chessPracticeAttempts.chapterId, chapterId),
          eq(chessPracticeAttempts.userId, userId),
          eq(chessPracticeAttempts.achievedGoal, true),
        ),
      );
    return (row?.total ?? 0) > 0;
  }

  /** First practice-goal chapter (by displayOrder) in the study the user hasn't achieved yet. */
  async findNextIncompletePracticeChapter(
    studyId: UUIDType,
    userId: UUIDType,
  ): Promise<UUIDType | null> {
    const practiceChapters = await this.db
      .select({ id: chessStudyChapters.id })
      .from(chessStudyChapters)
      .where(
        and(
          eq(chessStudyChapters.studyId, studyId),
          sql`${chessStudyChapters.practiceGoalType} IS NOT NULL`,
        ),
      )
      .orderBy(chessStudyChapters.displayOrder);

    for (const chapter of practiceChapters) {
      const achieved = await this.hasAchievedGoal(chapter.id, userId);
      if (!achieved) return chapter.id;
    }

    return null;
  }

  // --- S4: lesson embed ---

  async createChessStudyLessonRow(
    chapterId: UUIDType,
    language: SupportedLanguages,
    title: string,
    description: string | undefined,
    displayOrder: number,
  ) {
    const [row] = await this.db
      .insert(lessons)
      .values({
        chapterId,
        type: LESSON_TYPES.CHESS_STUDY,
        title: buildJsonbField(language, title),
        description: description ? buildJsonbField(language, description) : sql`'{}'::jsonb`,
        displayOrder,
      })
      .returning({
        id: lessons.id,
        chapterId: lessons.chapterId,
        displayOrder: lessons.displayOrder,
      });
    return row;
  }

  async createLessonChessStudyLink(data: {
    lessonId: UUIDType;
    studyId: UUIDType;
    studyChapterId?: UUIDType | null;
  }) {
    const [row] = await this.db
      .insert(lessonChessStudies)
      .values({
        lessonId: data.lessonId,
        studyId: data.studyId,
        studyChapterId: data.studyChapterId ?? null,
      })
      .returning();
    return row;
  }

  async getLessonChessStudyLink(lessonId: UUIDType) {
    const [row] = await this.db
      .select()
      .from(lessonChessStudies)
      .where(eq(lessonChessStudies.lessonId, lessonId));
    return row ?? null;
  }

  async updateLessonChessStudyLink(
    lessonId: UUIDType,
    data: { studyId?: UUIDType; studyChapterId?: UUIDType | null },
  ) {
    const [row] = await this.db
      .update(lessonChessStudies)
      .set({
        ...(data.studyId !== undefined ? { studyId: data.studyId } : {}),
        ...(data.studyChapterId !== undefined ? { studyChapterId: data.studyChapterId } : {}),
      })
      .where(eq(lessonChessStudies.lessonId, lessonId))
      .returning();
    return row ?? null;
  }

  /**
   * Whether the user may open a chess_study lesson: course author, admin permission,
   * freemium chapter, or enrolled student.
   */
  async canAccessChessStudyLesson(lessonId: UUIDType, userId: UUIDType): Promise<boolean> {
    const [row] = await this.db
      .select({
        courseAuthorId: courses.authorId,
        isFreemium: chapters.isFreemium,
        enrolled: sql<boolean>`CASE WHEN ${studentCourses.status} = ${COURSE_ENROLLMENT.ENROLLED} THEN TRUE ELSE FALSE END`,
      })
      .from(lessons)
      .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
      .innerJoin(courses, eq(courses.id, chapters.courseId))
      .leftJoin(
        studentCourses,
        and(eq(studentCourses.courseId, courses.id), eq(studentCourses.studentId, userId)),
      )
      .where(and(eq(lessons.id, lessonId), eq(lessons.type, LESSON_TYPES.CHESS_STUDY)));

    if (!row) return false;
    if (row.courseAuthorId === userId) return true;
    if (row.isFreemium) return true;
    return Boolean(row.enrolled);
  }
}
