import { Inject, Injectable } from "@nestjs/common";
import { LESSON_TYPES, type SupportedLanguages } from "@repo/shared";
import { and, asc, eq, getTableColumns, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { buildJsonbField } from "src/common/helpers/sqlHelpers";
import {
  assignments,
  assignmentTasks,
  assignmentTaskSubmissions,
  assignmentUserSubmissions,
  lessons,
  users,
} from "src/storage/schema";

import type {
  AssignmentRecord,
  AssignmentTaskRecord,
  AssignmentTaskSubmissionRecord,
  AssignmentUserSubmissionRecord,
  AssignmentUserSubmissionWithUserRecord,
} from "./assignments.types";
import type {
  CreateAssignmentBody,
  CreateAssignmentTaskBody,
  UpdateAssignmentBody,
  UpdateAssignmentTaskBody,
} from "./schemas/assignment.schema";
import type { AssignmentSubmissionContents } from "src/storage/schema";

@Injectable()
export class AssignmentsRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  /**
   * Insert the curriculum-tree `lessons` row for a new assignment lesson.
   * Uses the same `buildJsonbField` helper other lesson creators use so
   * `lessons.title`/`description` stay in the shared `{lang: text}` shape
   * the rest of the lesson system already reads (see
   * src/lesson/repositories/adminLesson.repository.ts#createLessonForChapter).
   */
  async createLessonRow(
    chapterId: UUIDType,
    language: SupportedLanguages,
    title: string,
    description: string | undefined,
    displayOrder: number,
    dbInstance: DatabasePg = this.db,
  ): Promise<{ id: UUIDType; chapterId: UUIDType; displayOrder: number | null }> {
    const [row] = await dbInstance
      .insert(lessons)
      .values({
        chapterId,
        type: LESSON_TYPES.ASSIGNMENT,
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

  async createAssignment(
    body: CreateAssignmentBody,
    dbInstance: DatabasePg = this.db,
  ): Promise<AssignmentRecord> {
    const [row] = await dbInstance
      .insert(assignments)
      .values({
        lessonId: body.lessonId,
        title: body.title,
        description: body.description ?? null,
        dueDate: body.dueDate ?? null,
        gradingType: body.gradingType,
        autoGrading: body.autoGrading,
        showCorrectAnswers: body.showCorrectAnswers,
        allowRetries: body.allowRetries,
        maxRetries: body.maxRetries,
        passThresholdPercentage: body.passThresholdPercentage ?? null,
        antiCopyPaste: body.antiCopyPaste,
        published: body.published ?? false,
      })
      .returning();

    return row as AssignmentRecord;
  }

  async updateAssignment(
    id: UUIDType,
    body: UpdateAssignmentBody,
    dbInstance: DatabasePg = this.db,
  ): Promise<AssignmentRecord | null> {
    const [row] = await dbInstance
      .update(assignments)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.dueDate !== undefined ? { dueDate: body.dueDate } : {}),
        ...(body.gradingType !== undefined ? { gradingType: body.gradingType } : {}),
        ...(body.autoGrading !== undefined ? { autoGrading: body.autoGrading } : {}),
        ...(body.showCorrectAnswers !== undefined
          ? { showCorrectAnswers: body.showCorrectAnswers }
          : {}),
        ...(body.allowRetries !== undefined ? { allowRetries: body.allowRetries } : {}),
        ...(body.maxRetries !== undefined ? { maxRetries: body.maxRetries } : {}),
        ...(body.passThresholdPercentage !== undefined
          ? { passThresholdPercentage: body.passThresholdPercentage }
          : {}),
        ...(body.antiCopyPaste !== undefined ? { antiCopyPaste: body.antiCopyPaste } : {}),
        ...(body.published !== undefined ? { published: body.published } : {}),
      })
      .where(eq(assignments.id, id))
      .returning();

    return (row as AssignmentRecord | undefined) ?? null;
  }

  async deleteAssignment(id: UUIDType): Promise<boolean> {
    const deleted = await this.db
      .delete(assignments)
      .where(eq(assignments.id, id))
      .returning({ id: assignments.id });
    return deleted.length > 0;
  }

  async getAssignmentById(id: UUIDType): Promise<AssignmentRecord | null> {
    const [row] = await this.db.select().from(assignments).where(eq(assignments.id, id));
    return (row as AssignmentRecord | undefined) ?? null;
  }

  async getAssignmentByLessonId(lessonId: UUIDType): Promise<AssignmentRecord | null> {
    const [row] = await this.db
      .select()
      .from(assignments)
      .where(eq(assignments.lessonId, lessonId));
    return (row as AssignmentRecord | undefined) ?? null;
  }

  async createTask(
    assignmentId: UUIDType,
    body: CreateAssignmentTaskBody,
    dbInstance: DatabasePg = this.db,
  ): Promise<AssignmentTaskRecord> {
    const [row] = await dbInstance
      .insert(assignmentTasks)
      .values({
        assignmentId,
        title: body.title,
        description: body.description ?? null,
        hint: body.hint ?? null,
        taskType: body.taskType,
        contents: body.contents ?? {},
        referenceFileS3Key: body.referenceFileS3Key ?? null,
        maxGradeValue: body.maxGradeValue ?? 100,
        displayOrder: body.displayOrder ?? 0,
      })
      .returning();

    return row as AssignmentTaskRecord;
  }

  async updateTask(
    id: UUIDType,
    body: UpdateAssignmentTaskBody,
  ): Promise<AssignmentTaskRecord | null> {
    const [row] = await this.db
      .update(assignmentTasks)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.hint !== undefined ? { hint: body.hint } : {}),
        ...(body.taskType !== undefined ? { taskType: body.taskType } : {}),
        ...(body.contents !== undefined ? { contents: body.contents } : {}),
        ...(body.referenceFileS3Key !== undefined
          ? { referenceFileS3Key: body.referenceFileS3Key }
          : {}),
        ...(body.maxGradeValue !== undefined ? { maxGradeValue: body.maxGradeValue } : {}),
        ...(body.displayOrder !== undefined ? { displayOrder: body.displayOrder } : {}),
      })
      .where(eq(assignmentTasks.id, id))
      .returning();

    return (row as AssignmentTaskRecord | undefined) ?? null;
  }

  async deleteTask(id: UUIDType): Promise<boolean> {
    const deleted = await this.db
      .delete(assignmentTasks)
      .where(eq(assignmentTasks.id, id))
      .returning({ id: assignmentTasks.id });
    return deleted.length > 0;
  }

  async getTaskById(id: UUIDType): Promise<AssignmentTaskRecord | null> {
    const [row] = await this.db.select().from(assignmentTasks).where(eq(assignmentTasks.id, id));
    return (row as AssignmentTaskRecord | undefined) ?? null;
  }

  async listTasksByAssignmentId(assignmentId: UUIDType): Promise<AssignmentTaskRecord[]> {
    const rows = await this.db
      .select()
      .from(assignmentTasks)
      .where(eq(assignmentTasks.assignmentId, assignmentId))
      .orderBy(asc(assignmentTasks.displayOrder));
    return rows as AssignmentTaskRecord[];
  }

  /** Insert or replace this learner's submission for one task (one row per user+task, enforced by a DB unique index). */
  async upsertTaskSubmission(
    taskId: UUIDType,
    userId: UUIDType,
    submission: AssignmentSubmissionContents,
  ): Promise<AssignmentTaskSubmissionRecord> {
    const [row] = await this.db
      .insert(assignmentTaskSubmissions)
      .values({ taskId, userId, submission })
      .onConflictDoUpdate({
        target: [assignmentTaskSubmissions.taskId, assignmentTaskSubmissions.userId],
        set: {
          submission,
          // A new submission always resets any previous auto/AI grade and
          // manual override — the learner is answering again, not amending
          // a still-open attempt. Trainers re-grade explicitly afterward.
          grade: null,
          feedback: null,
          manuallyGraded: false,
          gradedByUserId: null,
          gradedAt: null,
        },
      })
      .returning();

    return row as AssignmentTaskSubmissionRecord;
  }

  async getTaskSubmission(
    taskId: UUIDType,
    userId: UUIDType,
  ): Promise<AssignmentTaskSubmissionRecord | null> {
    const [row] = await this.db
      .select()
      .from(assignmentTaskSubmissions)
      .where(
        and(
          eq(assignmentTaskSubmissions.taskId, taskId),
          eq(assignmentTaskSubmissions.userId, userId),
        ),
      );
    return (row as AssignmentTaskSubmissionRecord | undefined) ?? null;
  }

  async listTaskSubmissionsForUser(
    assignmentId: UUIDType,
    userId: UUIDType,
  ): Promise<AssignmentTaskSubmissionRecord[]> {
    const rows = await this.db
      .select({
        id: assignmentTaskSubmissions.id,
        taskId: assignmentTaskSubmissions.taskId,
        userId: assignmentTaskSubmissions.userId,
        submission: assignmentTaskSubmissions.submission,
        grade: assignmentTaskSubmissions.grade,
        feedback: assignmentTaskSubmissions.feedback,
        manuallyGraded: assignmentTaskSubmissions.manuallyGraded,
        gradedByUserId: assignmentTaskSubmissions.gradedByUserId,
        gradedAt: assignmentTaskSubmissions.gradedAt,
        createdAt: assignmentTaskSubmissions.createdAt,
        updatedAt: assignmentTaskSubmissions.updatedAt,
      })
      .from(assignmentTaskSubmissions)
      .innerJoin(assignmentTasks, eq(assignmentTasks.id, assignmentTaskSubmissions.taskId))
      .where(
        and(
          eq(assignmentTasks.assignmentId, assignmentId),
          eq(assignmentTaskSubmissions.userId, userId),
        ),
      );
    return rows as AssignmentTaskSubmissionRecord[];
  }

  async gradeTaskSubmission(
    id: UUIDType,
    data: {
      grade: number;
      feedback: string | null;
      manuallyGraded: boolean;
      gradedByUserId: UUIDType | null;
    },
  ): Promise<AssignmentTaskSubmissionRecord | null> {
    const [row] = await this.db
      .update(assignmentTaskSubmissions)
      .set({
        grade: data.grade,
        feedback: data.feedback,
        manuallyGraded: data.manuallyGraded,
        gradedByUserId: data.gradedByUserId,
        gradedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(assignmentTaskSubmissions.id, id))
      .returning();

    return (row as AssignmentTaskSubmissionRecord | undefined) ?? null;
  }

  async getUserSubmission(
    assignmentId: UUIDType,
    userId: UUIDType,
  ): Promise<AssignmentUserSubmissionRecord | null> {
    const [row] = await this.db
      .select()
      .from(assignmentUserSubmissions)
      .where(
        and(
          eq(assignmentUserSubmissions.assignmentId, assignmentId),
          eq(assignmentUserSubmissions.userId, userId),
        ),
      );
    return (row as AssignmentUserSubmissionRecord | undefined) ?? null;
  }

  /**
   * Create the row on first submission, or update it in place otherwise.
   * `attemptNumber` is decided by AssignmentsService (it only advances at
   * the start of a genuinely new attempt cycle, not on every task submit)
   * so this method never increments it implicitly.
   */
  async upsertUserSubmission(
    assignmentId: UUIDType,
    userId: UUIDType,
    data: {
      status: AssignmentUserSubmissionRecord["status"];
      grade: number | null;
      overallFeedback: string | null;
      attemptNumber: number;
      submittedAt: string | null;
      gradedAt: string | null;
    },
  ): Promise<AssignmentUserSubmissionRecord> {
    const existing = await this.getUserSubmission(assignmentId, userId);

    if (!existing) {
      const [row] = await this.db
        .insert(assignmentUserSubmissions)
        .values({
          assignmentId,
          userId,
          status: data.status,
          grade: data.grade,
          overallFeedback: data.overallFeedback,
          attemptNumber: data.attemptNumber,
          submittedAt: data.submittedAt,
          gradedAt: data.gradedAt,
        })
        .returning();
      return row as AssignmentUserSubmissionRecord;
    }

    const [row] = await this.db
      .update(assignmentUserSubmissions)
      .set({
        status: data.status,
        grade: data.grade,
        overallFeedback: data.overallFeedback,
        attemptNumber: data.attemptNumber,
        submittedAt: data.submittedAt,
        gradedAt: data.gradedAt,
      })
      .where(eq(assignmentUserSubmissions.id, existing.id))
      .returning();

    return row as AssignmentUserSubmissionRecord;
  }

  /** Joins in the learner's name/email — the grading UI needs to show who it's grading, not just a userId. */
  async listUserSubmissionsForAssignment(
    assignmentId: UUIDType,
  ): Promise<AssignmentUserSubmissionWithUserRecord[]> {
    const rows = await this.db
      .select({
        ...getTableColumns(assignmentUserSubmissions),
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(assignmentUserSubmissions)
      .innerJoin(users, eq(users.id, assignmentUserSubmissions.userId))
      .where(eq(assignmentUserSubmissions.assignmentId, assignmentId));
    return rows as AssignmentUserSubmissionWithUserRecord[];
  }
}
