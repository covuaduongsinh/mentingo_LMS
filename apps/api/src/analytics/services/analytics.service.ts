import { Injectable } from "@nestjs/common";
import writeXlsxFile from "write-excel-file/node";

import { AnalyticsRepository } from "src/analytics/repositories/analytics.repository";

import type {
  CertificateIssuanceRateResponse,
  CohortRetentionResponse,
  DauTrendResponse,
  EngagementScoreResponse,
  NewVsReturningResponse,
  ScoreDistributionResponse,
  WeekdayActivityResponse,
} from "src/analytics/schemas/org-analytics.schema";
import type { Schema } from "write-excel-file";

const DEFAULT_TREND_DAYS = 30;
const COHORT_RETENTION_WEEK_OFFSETS = [0, 1, 2, 3, 4];
const SCORE_BUCKETS = [
  "0-9",
  "10-19",
  "20-29",
  "30-39",
  "40-49",
  "50-59",
  "60-69",
  "70-79",
  "80-89",
  "90-100",
];

function toPercentage(numerator: number, denominator: number): number {
  if (!denominator) return 0;

  return Math.round((numerator / denominator) * 10000) / 100;
}

function bucketScores(scores: number[]): { bucket: string; count: number }[] {
  const buckets = SCORE_BUCKETS.map((bucket) => ({ bucket, count: 0 }));

  for (const score of scores) {
    const clamped = Math.min(Math.max(score, 0), 100);
    const bucketIndex = Math.min(Math.floor(clamped / 10), buckets.length - 1);

    buckets[bucketIndex].count += 1;
  }

  return buckets;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  /**
   * Retrieves the count of all active users and the timestamp of the fetch.
   * An active user is defined as a non-deleted account that has logged in at least once.
   * Returns: The number of active users and the current timestamp.
   */
  async getActiveUsersCount() {
    const [activeUsersCount] = await this.analyticsRepository.getActiveUsersCount();

    return activeUsersCount;
  }

  async getDauTrend(days: number = DEFAULT_TREND_DAYS): Promise<DauTrendResponse> {
    return this.analyticsRepository.getDauTrend(days);
  }

  async getNewVsReturning(days: number = DEFAULT_TREND_DAYS): Promise<NewVsReturningResponse> {
    return this.analyticsRepository.getNewVsReturning(days);
  }

  async getWeekdayActivity(): Promise<WeekdayActivityResponse> {
    const rows = await this.analyticsRepository.getWeekdayActivity();
    const rowsByWeekday = new Map(rows.map((row) => [row.weekday, row.activityCount]));

    return Array.from({ length: 7 }, (_, index) => {
      const weekday = index + 1;

      return { weekday, activityCount: rowsByWeekday.get(weekday) ?? 0 };
    });
  }

  async getCohortRetention(): Promise<CohortRetentionResponse> {
    const rows = await this.analyticsRepository.getCohortRetention();
    const cohortsByWeek = new Map<string, (typeof rows)[number][]>();

    for (const row of rows) {
      const existing = cohortsByWeek.get(row.cohortWeek) ?? [];
      existing.push(row);
      cohortsByWeek.set(row.cohortWeek, existing);
    }

    return Array.from(cohortsByWeek.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([cohortWeek, cohortRows]) => ({
        cohortWeek,
        cohortSize: cohortRows[0].cohortSize,
        retention: COHORT_RETENTION_WEEK_OFFSETS.map((weekOffset) => {
          const row = cohortRows.find((r) => r.weekOffset === weekOffset);

          if (!row || !row.hasData) return { weekOffset, percentage: null };

          return {
            weekOffset,
            percentage: toPercentage(row.activeCount, row.cohortSize),
          };
        }),
      }));
  }

  async getScoreDistribution(): Promise<ScoreDistributionResponse> {
    const [quizRows, assignmentRows] = await Promise.all([
      this.analyticsRepository.getQuizScores(),
      this.analyticsRepository.getAssignmentScores(),
    ]);

    return {
      quiz: bucketScores(quizRows.map((row) => row.score ?? 0)),
      assignment: bucketScores(assignmentRows.map((row) => row.score ?? 0)),
    };
  }

  async getCertificateIssuanceRate(): Promise<CertificateIssuanceRateResponse> {
    const row = await this.analyticsRepository.getCertificateIssuanceRate();
    const completedCount = row?.completedCount ?? 0;
    const certifiedCount = row?.certifiedCount ?? 0;

    return {
      completedCount,
      certifiedCount,
      percentage: toPercentage(certifiedCount, completedCount),
    };
  }

  async getEngagementScore(): Promise<EngagementScoreResponse> {
    const [recentActivityRatio, completionRow, quizPassRow] = await Promise.all([
      this.analyticsRepository.getAverageRecentActivityRatio(),
      this.analyticsRepository.getCourseCompletionRatio(),
      this.analyticsRepository.getQuizPassRatio(),
    ]);

    const courseCompletionRatio = completionRow
      ? (completionRow.completedCount ?? 0) / (completionRow.enrolledCount || 1)
      : 0;
    const quizPassRatio = quizPassRow
      ? (quizPassRow.passedCount ?? 0) / (quizPassRow.attemptedCount || 1)
      : 0;

    const score = Math.round(
      ((recentActivityRatio + courseCompletionRatio + quizPassRatio) / 3) * 100,
    );

    return {
      score,
      components: {
        recentActivityRatio: Math.round(recentActivityRatio * 10000) / 100,
        courseCompletionRatio: Math.round(courseCompletionRatio * 10000) / 100,
        quizPassRatio: Math.round(quizPassRatio * 10000) / 100,
      },
    };
  }

  async generateAdvancedAnalyticsReport(): Promise<Buffer> {
    const [dauTrend, cohortRetention, scoreDistribution, certificateIssuanceRate] =
      await Promise.all([
        this.getDauTrend(),
        this.getCohortRetention(),
        this.getScoreDistribution(),
        this.getCertificateIssuanceRate(),
      ]);

    const dauSchema: Schema<DauTrendResponse[number]> = [
      { column: "Date", type: String, value: (row) => row.date, width: 15 },
      { column: "Active users", type: Number, value: (row) => row.activeUsers, width: 15 },
    ];

    const cohortRows = cohortRetention.flatMap((cohort) =>
      cohort.retention.map((r) => ({
        cohortWeek: cohort.cohortWeek,
        cohortSize: cohort.cohortSize,
        weekOffset: r.weekOffset,
        percentage: r.percentage,
      })),
    );
    const cohortSchema: Schema<(typeof cohortRows)[number]> = [
      { column: "Cohort week", type: String, value: (row) => row.cohortWeek, width: 15 },
      { column: "Cohort size", type: Number, value: (row) => row.cohortSize, width: 15 },
      { column: "Week offset", type: Number, value: (row) => row.weekOffset, width: 12 },
      {
        column: "Retention %",
        type: String,
        value: (row) => (row.percentage === null ? "n/a" : `${row.percentage}%`),
        width: 15,
      },
    ];

    const scoreRows = [
      ...scoreDistribution.quiz.map((b) => ({ type: "Quiz", ...b })),
      ...scoreDistribution.assignment.map((b) => ({ type: "Assignment", ...b })),
    ];
    const scoreSchema: Schema<(typeof scoreRows)[number]> = [
      { column: "Type", type: String, value: (row) => row.type, width: 15 },
      { column: "Score range", type: String, value: (row) => row.bucket, width: 15 },
      { column: "Count", type: Number, value: (row) => row.count, width: 12 },
    ];

    const certificateRows = [certificateIssuanceRate];
    const certificateSchema: Schema<CertificateIssuanceRateResponse> = [
      { column: "Completed courses", type: Number, value: (row) => row.completedCount, width: 20 },
      { column: "Certified", type: Number, value: (row) => row.certifiedCount, width: 15 },
      { column: "Rate %", type: String, value: (row) => `${row.percentage}%`, width: 12 },
    ];

    const buffer = await writeXlsxFile([dauTrend, cohortRows, scoreRows, certificateRows], {
      schema: [dauSchema, cohortSchema, scoreSchema, certificateSchema],
      sheets: ["DAU Trend", "Cohort Retention", "Score Distribution", "Certificate Rate"],
      buffer: true,
      fontFamily: "Calibri",
      fontSize: 11,
      getHeaderStyle: () => ({
        fontWeight: "bold",
        height: 25,
        backgroundColor: "#E2E8F0",
      }),
    });

    return Buffer.from(buffer);
  }
}
