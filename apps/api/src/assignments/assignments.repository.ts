import { Inject, Injectable } from "@nestjs/common";
import { COURSE_ENROLLMENT, LESSON_TYPES, type SupportedLanguages } from "@repo/shared";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { and, asc, eq, getTableColumns, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { DatabasePg, type UUIDType } from "src/common";
import { EmailService } from "src/common/emails/emails.service";
import { buildJsonbField } from "src/common/helpers/sqlHelpers";
import { LocalizationService } from "src/localization/localization.service";
import {
  assignments,
  assignmentTasks,
  assignmentTaskSubmissions,
  assignmentUserSubmissions,
  chapters,
  courses,
  lessons,
  settings,
  studentCourses,
  tenants,
  users,
} from "src/storage/schema";

import { ASSIGNMENT_DUE_DATE_REMINDER_DAYS } from "./constants/assignment-due-date-reminders.constants";

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
import type {
  AssignmentDueDateReminderDays,
  AssignmentDueDateReminderRecipient,
} from "./types/assignment-due-date-reminder.types";
import type { AssignmentSubmissionContents } from "src/storage/schema";

@Injectable()
export class AssignmentsRepository {
  constructor(
    @Inject("DB") private readonly db: DatabasePg,
    private readonly localizationService: LocalizationService,
    private readonly emailService: EmailService,
  ) {}

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

  /**
   * A trainer rejecting a not-gradable-as-is submission — resets the row to
   * the same "never submitted" shape `upsertTaskSubmission`'s onConflict
   * branch resets to, so the learner sees this task as not-yet-submitted.
   */
  async resetTaskSubmission(id: UUIDType): Promise<AssignmentTaskSubmissionRecord | null> {
    const [row] = await this.db
      .update(assignmentTaskSubmissions)
      .set({
        submission: {},
        grade: null,
        feedback: null,
        manuallyGraded: false,
        gradedByUserId: null,
        gradedAt: null,
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

  /**
   * Recipients for the two due-date reminder windows (7 days / 1 day before
   * `assignments.dueDate`), mirroring CourseService#getCourseDueDateReminderRecipients
   * exactly (same reminder-window SQL shape, same default-email-settings
   * resolution) but joining assignment -> lesson -> chapter -> course ->
   * enrolled student instead of group_courses, since an assignment's due
   * date is on the assignment itself, not on a group-course row. A learner
   * already `graded` for this assignment is excluded from both windows.
   */
  async getAssignmentDueDateReminderRecipients(): Promise<AssignmentDueDateReminderRecipient[]> {
    const globalSettings = alias(settings, "global_settings");
    const userSettings = alias(settings, "user_settings");

    const reminderWindows = ASSIGNMENT_DUE_DATE_REMINDER_DAYS.map((daysBeforeDueDate) => {
      const reminderDate = addDays(new Date(), daysBeforeDueDate);
      return {
        daysBeforeDueDate,
        startsAt: startOfDay(reminderDate).toISOString(),
        endsAt: endOfDay(reminderDate).toISOString(),
      };
    });

    const dueDateCondition = or(
      ...reminderWindows.map(
        ({ startsAt, endsAt }) =>
          sql`${assignments.dueDate} BETWEEN ${startsAt}::timestamptz AND ${endsAt}::timestamptz`,
      ),
    );
    if (!dueDateCondition) return [];

    const rows = await this.db
      .selectDistinct({
        studentId: users.id,
        studentEmail: users.email,
        tenantId: users.tenantId,
        tenantHost: tenants.host,
        lessonId: lessons.id,
        courseId: courses.id,
        courseAuthorId: courses.authorId,
        assignmentName: this.localizationService.getLocalizedSqlField(
          assignments.title,
          sql<SupportedLanguages>`${userSettings.settings}->>'language'`,
        ),
        dueDate: sql<string>`${assignments.dueDate}`,
        daysBeforeDueDate: sql<AssignmentDueDateReminderDays>`CASE ${sql.join(
          reminderWindows.map(
            ({ daysBeforeDueDate, startsAt, endsAt }) =>
              sql`WHEN ${assignments.dueDate} BETWEEN ${startsAt}::timestamptz AND ${endsAt}::timestamptz THEN ${daysBeforeDueDate}`,
          ),
          sql` `,
        )} END`,
        defaultEmailSettings: this.emailService.getDefaultEmailPropertiesSql(
          userSettings.settings,
          globalSettings.settings,
        ),
      })
      .from(assignments)
      .innerJoin(lessons, eq(lessons.id, assignments.lessonId))
      .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
      .innerJoin(courses, eq(courses.id, chapters.courseId))
      .innerJoin(
        studentCourses,
        and(
          eq(studentCourses.courseId, courses.id),
          eq(studentCourses.status, COURSE_ENROLLMENT.ENROLLED),
        ),
      )
      .innerJoin(users, eq(users.id, studentCourses.studentId))
      .innerJoin(userSettings, eq(userSettings.userId, users.id))
      .leftJoin(globalSettings, isNull(globalSettings.userId))
      .innerJoin(tenants, eq(tenants.id, users.tenantId))
      .leftJoin(
        assignmentUserSubmissions,
        and(
          eq(assignmentUserSubmissions.assignmentId, assignments.id),
          eq(assignmentUserSubmissions.userId, users.id),
        ),
      )
      .where(
        and(
          isNotNull(assignments.dueDate),
          eq(assignments.published, true),
          dueDateCondition,
          isNull(users.deletedAt),
          or(
            isNull(assignmentUserSubmissions.status),
            sql`${assignmentUserSubmissions.status} != 'graded'`,
          ),
        ),
      );

    return rows as AssignmentDueDateReminderRecipient[];
  }
}
