import { Inject, Injectable } from "@nestjs/common";
import { COURSE_ENROLLMENT } from "@repo/shared";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { DatabasePg } from "src/common";
import {
  chapters,
  courses,
  lessonLearningTime,
  lessons,
  studentChapterProgress,
  studentCourses,
  studentLessonProgress,
  users,
} from "src/storage/schema";

import type { UUIDType } from "src/common";

@Injectable()
export class CourseAnalyticsRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async getLessonCompletionFunnel(courseId: UUIDType) {
    return this.db
      .select({
        lessonId: lessons.id,
        chapterId: chapters.id,
        lessonTitle: sql<string>`${lessons.title}->>${courses.baseLanguage}`,
        chapterOrder: chapters.displayOrder,
        lessonOrder: lessons.displayOrder,
        enrolledCount: sql<number>`COUNT(DISTINCT ${studentCourses.studentId})::int`,
        completedCount: sql<number>`COUNT(DISTINCT CASE WHEN ${studentLessonProgress.completedAt} IS NOT NULL THEN ${studentLessonProgress.studentId} END)::int`,
      })
      .from(lessons)
      .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
      .innerJoin(courses, eq(chapters.courseId, courses.id))
      .innerJoin(
        studentCourses,
        and(
          eq(studentCourses.courseId, chapters.courseId),
          eq(studentCourses.status, COURSE_ENROLLMENT.ENROLLED),
        ),
      )
      .innerJoin(users, and(eq(users.id, studentCourses.studentId), isNull(users.deletedAt)))
      .leftJoin(
        studentLessonProgress,
        and(
          eq(studentLessonProgress.lessonId, lessons.id),
          eq(studentLessonProgress.studentId, studentCourses.studentId),
        ),
      )
      .where(eq(chapters.courseId, courseId))
      .groupBy(
        lessons.id,
        chapters.id,
        lessons.title,
        courses.baseLanguage,
        chapters.displayOrder,
        lessons.displayOrder,
      )
      .orderBy(chapters.displayOrder, lessons.displayOrder);
  }

  async getChapterCompletion(courseId: UUIDType) {
    return this.db
      .select({
        chapterId: chapters.id,
        chapterTitle: sql<string>`${chapters.title}->>${courses.baseLanguage}`,
        chapterOrder: chapters.displayOrder,
        enrolledCount: sql<number>`COUNT(DISTINCT ${studentCourses.studentId})::int`,
        completedCount: sql<number>`COUNT(DISTINCT CASE WHEN ${studentChapterProgress.completedAt} IS NOT NULL THEN ${studentChapterProgress.studentId} END)::int`,
      })
      .from(chapters)
      .innerJoin(courses, eq(chapters.courseId, courses.id))
      .innerJoin(
        studentCourses,
        and(
          eq(studentCourses.courseId, chapters.courseId),
          eq(studentCourses.status, COURSE_ENROLLMENT.ENROLLED),
        ),
      )
      .innerJoin(users, and(eq(users.id, studentCourses.studentId), isNull(users.deletedAt)))
      .leftJoin(
        studentChapterProgress,
        and(
          eq(studentChapterProgress.chapterId, chapters.id),
          eq(studentChapterProgress.studentId, studentCourses.studentId),
        ),
      )
      .where(eq(chapters.courseId, courseId))
      .groupBy(chapters.id, chapters.title, courses.baseLanguage, chapters.displayOrder)
      .orderBy(chapters.displayOrder);
  }

  async getCourseCompletionDurationsInDays(courseId: UUIDType) {
    return this.db
      .select({
        studentId: studentCourses.studentId,
        days: sql<number>`EXTRACT(EPOCH FROM (${studentCourses.completedAt} - ${studentCourses.enrolledAt})) / 86400`,
      })
      .from(studentCourses)
      .innerJoin(users, and(eq(users.id, studentCourses.studentId), isNull(users.deletedAt)))
      .where(
        and(
          eq(studentCourses.courseId, courseId),
          eq(studentCourses.status, COURSE_ENROLLMENT.ENROLLED),
          isNotNull(studentCourses.completedAt),
          isNotNull(studentCourses.enrolledAt),
        ),
      );
  }

  async getTopLearners(courseId: UUIDType, limit: number) {
    return this.db
      .select({
        studentId: lessonLearningTime.userId,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        totalSeconds: sql<number>`SUM(${lessonLearningTime.totalSeconds})::int`,
        completedLessonCount: sql<number>`COUNT(DISTINCT ${studentLessonProgress.lessonId}) FILTER (WHERE ${studentLessonProgress.completedAt} IS NOT NULL)::int`,
      })
      .from(lessonLearningTime)
      .innerJoin(users, and(eq(users.id, lessonLearningTime.userId), isNull(users.deletedAt)))
      .leftJoin(
        studentLessonProgress,
        and(
          eq(studentLessonProgress.studentId, lessonLearningTime.userId),
          eq(studentLessonProgress.lessonId, lessonLearningTime.lessonId),
        ),
      )
      .where(eq(lessonLearningTime.courseId, courseId))
      .groupBy(lessonLearningTime.userId, users.firstName, users.lastName)
      .orderBy(desc(sql`SUM(${lessonLearningTime.totalSeconds})`))
      .limit(limit);
  }
}
