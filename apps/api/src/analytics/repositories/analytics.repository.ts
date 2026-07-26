import { Inject, Injectable } from "@nestjs/common";
import {
  ASSIGNMENT_SUBMISSION_STATUS,
  CERTIFICATE_STATUSES,
  COURSE_ENROLLMENT,
} from "@repo/shared";
import { and, countDistinct, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { DatabasePg } from "src/common";
import {
  assignmentUserSubmissions,
  certificates,
  quizAttempts,
  studentCourses,
  studentLessonProgress,
  users,
  userStatistics,
} from "src/storage/schema";

@Injectable()
export class AnalyticsRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async getActiveUsersCount() {
    return this.db
      .select({
        activeUsersCount: countDistinct(users.id),
        timestamp: sql<string>`NOW()`,
      })
      .from(users)
      .innerJoin(userStatistics, eq(userStatistics.userId, users.id))
      .where(isNull(users.deletedAt));
  }

  async getDauTrend(days: number) {
    const result = await this.db.execute(sql`
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - (${days}::int - 1), CURRENT_DATE, INTERVAL '1 day')::date AS day
      ),
      activity AS (
        SELECT us.user_id, kv.key::date AS day
        FROM user_statistics us
        JOIN users u ON u.id = us.user_id AND u.deleted_at IS NULL
        CROSS JOIN LATERAL jsonb_each_text(us.activity_history) AS kv(key, value)
        WHERE kv.value = 'true'
      )
      SELECT
        to_char(d.day, 'YYYY-MM-DD') AS date,
        COUNT(DISTINCT a.user_id)::int AS "activeUsers"
      FROM days d
      LEFT JOIN activity a ON a.day = d.day
      GROUP BY d.day
      ORDER BY d.day
    `);

    return result as unknown as { date: string; activeUsers: number }[];
  }

  async getNewVsReturning(days: number) {
    const result = await this.db.execute(sql`
      WITH activity AS (
        SELECT us.user_id, kv.key::date AS day
        FROM user_statistics us
        JOIN users u ON u.id = us.user_id AND u.deleted_at IS NULL
        CROSS JOIN LATERAL jsonb_each_text(us.activity_history) AS kv(key, value)
        WHERE kv.value = 'true'
      ),
      first_active AS (
        SELECT user_id, MIN(day) AS first_day FROM activity GROUP BY user_id
      ),
      days AS (
        SELECT generate_series(CURRENT_DATE - (${days}::int - 1), CURRENT_DATE, INTERVAL '1 day')::date AS day
      )
      SELECT
        to_char(d.day, 'YYYY-MM-DD') AS date,
        COUNT(DISTINCT CASE WHEN fa.first_day = d.day THEN a.user_id END)::int AS "newUsers",
        COUNT(DISTINCT CASE WHEN fa.first_day < d.day THEN a.user_id END)::int AS "returningUsers"
      FROM days d
      LEFT JOIN activity a ON a.day = d.day
      LEFT JOIN first_active fa ON fa.user_id = a.user_id
      GROUP BY d.day
      ORDER BY d.day
    `);

    return result as unknown as { date: string; newUsers: number; returningUsers: number }[];
  }

  async getWeekdayActivity() {
    const result = await this.db.execute(sql`
      WITH activity AS (
        SELECT kv.key::date AS day
        FROM user_statistics us
        JOIN users u ON u.id = us.user_id AND u.deleted_at IS NULL
        CROSS JOIN LATERAL jsonb_each_text(us.activity_history) AS kv(key, value)
        WHERE kv.value = 'true'
      )
      SELECT
        EXTRACT(ISODOW FROM day)::int AS weekday,
        COUNT(*)::int AS "activityCount"
      FROM activity
      GROUP BY weekday
      ORDER BY weekday
    `);

    return result as unknown as { weekday: number; activityCount: number }[];
  }

  async getCohortRetention() {
    const result = await this.db.execute(sql`
      WITH first_enrollment AS (
        SELECT sc.student_id, MIN(sc.enrolled_at) AS enrolled_at
        FROM student_courses sc
        JOIN users u ON u.id = sc.student_id AND u.deleted_at IS NULL
        GROUP BY sc.student_id
      ),
      cohorts AS (
        SELECT student_id, date_trunc('week', enrolled_at)::date AS cohort_week
        FROM first_enrollment
      ),
      activity AS (
        SELECT us.user_id, kv.key::date AS day
        FROM user_statistics us
        CROSS JOIN LATERAL jsonb_each_text(us.activity_history) AS kv(key, value)
        WHERE kv.value = 'true'
      ),
      recent_cohorts AS (
        SELECT DISTINCT cohort_week FROM cohorts ORDER BY cohort_week DESC LIMIT 12
      )
      SELECT
        to_char(c.cohort_week, 'YYYY-MM-DD') AS "cohortWeek",
        COUNT(DISTINCT c.student_id)::int AS "cohortSize",
        gs.offset_week AS "weekOffset",
        COUNT(DISTINCT CASE
          WHEN a.day BETWEEN c.cohort_week + (gs.offset_week * 7) AND c.cohort_week + (gs.offset_week * 7 + 6)
          THEN a.user_id
        END)::int AS "activeCount",
        (c.cohort_week + (gs.offset_week * 7) <= CURRENT_DATE) AS "hasData"
      FROM cohorts c
      JOIN recent_cohorts rc ON rc.cohort_week = c.cohort_week
      CROSS JOIN generate_series(0, 4) AS gs(offset_week)
      LEFT JOIN activity a ON a.user_id = c.student_id
      GROUP BY c.cohort_week, gs.offset_week
      ORDER BY c.cohort_week DESC, gs.offset_week
    `);

    return result as unknown as {
      cohortWeek: string;
      cohortSize: number;
      weekOffset: number;
      activeCount: number;
      hasData: boolean;
    }[];
  }

  async getAverageRecentActivityRatio() {
    const result = await this.db.execute(sql`
      WITH activity AS (
        SELECT us.user_id, kv.key::date AS day
        FROM user_statistics us
        JOIN users u ON u.id = us.user_id AND u.deleted_at IS NULL
        CROSS JOIN LATERAL jsonb_each_text(us.activity_history) AS kv(key, value)
        WHERE kv.value = 'true' AND kv.key::date >= CURRENT_DATE - INTERVAL '29 days'
      ),
      per_user AS (
        SELECT user_id, COUNT(DISTINCT day)::numeric / 30 AS activity_ratio
        FROM activity
        GROUP BY user_id
      )
      SELECT COALESCE(AVG(activity_ratio), 0) AS "avgActivityRatio" FROM per_user
    `);

    const [row] = result as unknown as { avgActivityRatio: string | number }[];

    return Number(row?.avgActivityRatio ?? 0);
  }

  async getQuizScores() {
    return this.db
      .select({ score: quizAttempts.score })
      .from(quizAttempts)
      .innerJoin(users, and(eq(users.id, quizAttempts.userId), isNull(users.deletedAt)));
  }

  async getAssignmentScores() {
    return this.db
      .select({ score: assignmentUserSubmissions.grade })
      .from(assignmentUserSubmissions)
      .innerJoin(
        users,
        and(eq(users.id, assignmentUserSubmissions.userId), isNull(users.deletedAt)),
      )
      .where(
        and(
          eq(assignmentUserSubmissions.status, ASSIGNMENT_SUBMISSION_STATUS.GRADED),
          isNotNull(assignmentUserSubmissions.grade),
        ),
      );
  }

  async getCertificateIssuanceRate() {
    const [row] = await this.db
      .select({
        completedCount: sql<number>`COUNT(DISTINCT (${studentCourses.studentId}, ${studentCourses.courseId}))::int`,
        certifiedCount: sql<number>`COUNT(DISTINCT CASE WHEN ${certificates.status} = ${CERTIFICATE_STATUSES.ACTIVE} THEN (${studentCourses.studentId}, ${studentCourses.courseId}) END)::int`,
      })
      .from(studentCourses)
      .innerJoin(users, and(eq(users.id, studentCourses.studentId), isNull(users.deletedAt)))
      .leftJoin(
        certificates,
        and(
          eq(certificates.userId, studentCourses.studentId),
          eq(certificates.courseId, studentCourses.courseId),
        ),
      )
      .where(isNotNull(studentCourses.completedAt));

    return row;
  }

  async getCourseCompletionRatio() {
    const [row] = await this.db
      .select({
        enrolledCount: sql<number>`COUNT(*)::int`,
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${studentCourses.progress} = 'completed')::int`,
      })
      .from(studentCourses)
      .innerJoin(users, and(eq(users.id, studentCourses.studentId), isNull(users.deletedAt)))
      .where(eq(studentCourses.status, COURSE_ENROLLMENT.ENROLLED));

    return row;
  }

  async getQuizPassRatio() {
    const [row] = await this.db
      .select({
        attemptedCount: sql<number>`COUNT(*) FILTER (WHERE ${studentLessonProgress.quizScore} IS NOT NULL)::int`,
        passedCount: sql<number>`COUNT(*) FILTER (WHERE ${studentLessonProgress.isQuizPassed} IS TRUE)::int`,
      })
      .from(studentLessonProgress)
      .innerJoin(
        users,
        and(eq(users.id, studentLessonProgress.studentId), isNull(users.deletedAt)),
      );

    return row;
  }
}
