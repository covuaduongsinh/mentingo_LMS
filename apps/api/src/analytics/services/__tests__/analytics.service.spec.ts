import { AnalyticsService } from "../analytics.service";

import type { AnalyticsRepository } from "src/analytics/repositories/analytics.repository";

describe("AnalyticsService", () => {
  let repo: jest.Mocked<AnalyticsRepository>;
  let service: AnalyticsService;

  beforeEach(() => {
    repo = {
      getActiveUsersCount: jest.fn(),
      getDauTrend: jest.fn(),
      getNewVsReturning: jest.fn(),
      getWeekdayActivity: jest.fn(),
      getCohortRetention: jest.fn(),
      getAverageRecentActivityRatio: jest.fn(),
      getQuizScores: jest.fn(),
      getAssignmentScores: jest.fn(),
      getCertificateIssuanceRate: jest.fn(),
      getCourseCompletionRatio: jest.fn(),
      getQuizPassRatio: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsRepository>;

    service = new AnalyticsService(repo);
  });

  describe("getWeekdayActivity", () => {
    it("fills in zero counts for weekdays with no recorded activity", async () => {
      repo.getWeekdayActivity.mockResolvedValue([
        { weekday: 1, activityCount: 10 },
        { weekday: 3, activityCount: 4 },
      ] as never);

      const result = await service.getWeekdayActivity();

      expect(result).toEqual([
        { weekday: 1, activityCount: 10 },
        { weekday: 2, activityCount: 0 },
        { weekday: 3, activityCount: 4 },
        { weekday: 4, activityCount: 0 },
        { weekday: 5, activityCount: 0 },
        { weekday: 6, activityCount: 0 },
        { weekday: 7, activityCount: 0 },
      ]);
    });
  });

  describe("getCohortRetention", () => {
    it("computes retention percentage per week offset and returns null for weeks that haven't arrived yet", async () => {
      repo.getCohortRetention.mockResolvedValue([
        {
          cohortWeek: "2026-06-01",
          cohortSize: 10,
          weekOffset: 0,
          activeCount: 10,
          hasData: true,
        },
        {
          cohortWeek: "2026-06-01",
          cohortSize: 10,
          weekOffset: 1,
          activeCount: 5,
          hasData: true,
        },
        {
          cohortWeek: "2026-06-01",
          cohortSize: 10,
          weekOffset: 2,
          activeCount: 0,
          hasData: false,
        },
      ] as never);

      const result = await service.getCohortRetention();

      expect(result).toEqual([
        {
          cohortWeek: "2026-06-01",
          cohortSize: 10,
          retention: [
            { weekOffset: 0, percentage: 100 },
            { weekOffset: 1, percentage: 50 },
            { weekOffset: 2, percentage: null },
            { weekOffset: 3, percentage: null },
            { weekOffset: 4, percentage: null },
          ],
        },
      ]);
    });

    it("sorts cohorts newest first", async () => {
      repo.getCohortRetention.mockResolvedValue([
        { cohortWeek: "2026-05-01", cohortSize: 5, weekOffset: 0, activeCount: 5, hasData: true },
        { cohortWeek: "2026-06-01", cohortSize: 8, weekOffset: 0, activeCount: 8, hasData: true },
      ] as never);

      const result = await service.getCohortRetention();

      expect(result.map((c) => c.cohortWeek)).toEqual(["2026-06-01", "2026-05-01"]);
    });
  });

  describe("getScoreDistribution", () => {
    it("buckets quiz and assignment scores into 10-point ranges", async () => {
      repo.getQuizScores.mockResolvedValue([{ score: 5 }, { score: 95 }, { score: 50 }] as never);
      repo.getAssignmentScores.mockResolvedValue([{ score: 100 }] as never);

      const result = await service.getScoreDistribution();

      expect(result.quiz.find((b) => b.bucket === "0-9")?.count).toBe(1);
      expect(result.quiz.find((b) => b.bucket === "90-100")?.count).toBe(1);
      expect(result.quiz.find((b) => b.bucket === "50-59")?.count).toBe(1);
      expect(result.assignment.find((b) => b.bucket === "90-100")?.count).toBe(1);
    });
  });

  describe("getCertificateIssuanceRate", () => {
    it("computes the percentage of completed courses that have an active certificate", async () => {
      repo.getCertificateIssuanceRate.mockResolvedValue({
        completedCount: 20,
        certifiedCount: 5,
      } as never);

      const result = await service.getCertificateIssuanceRate();

      expect(result).toEqual({ completedCount: 20, certifiedCount: 5, percentage: 25 });
    });

    it("returns 0% when nobody has completed a course yet", async () => {
      repo.getCertificateIssuanceRate.mockResolvedValue({
        completedCount: 0,
        certifiedCount: 0,
      } as never);

      const result = await service.getCertificateIssuanceRate();

      expect(result.percentage).toBe(0);
    });
  });

  describe("getEngagementScore", () => {
    it("averages the three components into a single 0-100 score", async () => {
      repo.getAverageRecentActivityRatio.mockResolvedValue(0.5);
      repo.getCourseCompletionRatio.mockResolvedValue({
        enrolledCount: 10,
        completedCount: 4,
      } as never);
      repo.getQuizPassRatio.mockResolvedValue({
        attemptedCount: 10,
        passedCount: 6,
      } as never);

      const result = await service.getEngagementScore();

      // (0.5 + 0.4 + 0.6) / 3 = 0.5 -> 50
      expect(result.score).toBe(50);
      expect(result.components).toEqual({
        recentActivityRatio: 50,
        courseCompletionRatio: 40,
        quizPassRatio: 60,
      });
    });

    it("does not divide by zero when there are no enrollments or quiz attempts", async () => {
      repo.getAverageRecentActivityRatio.mockResolvedValue(0);
      repo.getCourseCompletionRatio.mockResolvedValue({
        enrolledCount: 0,
        completedCount: 0,
      } as never);
      repo.getQuizPassRatio.mockResolvedValue({
        attemptedCount: 0,
        passedCount: 0,
      } as never);

      const result = await service.getEngagementScore();

      expect(result.score).toBe(0);
    });
  });
});
