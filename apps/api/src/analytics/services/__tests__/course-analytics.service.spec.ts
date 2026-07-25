import { CourseAnalyticsService } from "../course-analytics.service";

import type { CourseAnalyticsRepository } from "src/analytics/repositories/course-analytics.repository";

const COURSE_ID = "course-1";

describe("CourseAnalyticsService", () => {
  let repo: jest.Mocked<CourseAnalyticsRepository>;
  let service: CourseAnalyticsService;

  beforeEach(() => {
    repo = {
      getLessonCompletionFunnel: jest.fn(),
      getChapterCompletion: jest.fn(),
      getCourseCompletionDurationsInDays: jest.fn(),
      getTopLearners: jest.fn(),
    } as unknown as jest.Mocked<CourseAnalyticsRepository>;

    service = new CourseAnalyticsService(repo);
  });

  describe("getLessonCompletionFunnel", () => {
    it("computes completion percentage per lesson", async () => {
      repo.getLessonCompletionFunnel.mockResolvedValue([
        {
          lessonId: "l1",
          chapterId: "c1",
          lessonTitle: "Lesson 1",
          chapterOrder: 1,
          lessonOrder: 1,
          enrolledCount: 10,
          completedCount: 5,
        },
        {
          lessonId: "l2",
          chapterId: "c1",
          lessonTitle: "Lesson 2",
          chapterOrder: 1,
          lessonOrder: 2,
          enrolledCount: 0,
          completedCount: 0,
        },
      ] as never);

      const result = await service.getLessonCompletionFunnel(COURSE_ID);

      expect(result[0].completionPercentage).toBe(50);
      expect(result[1].completionPercentage).toBe(0);
    });
  });

  describe("getChapterDropoff", () => {
    it("computes dropoff relative to the previous chapter's completers, not enrollment", async () => {
      repo.getChapterCompletion.mockResolvedValue([
        {
          chapterId: "c1",
          chapterTitle: "Ch1",
          chapterOrder: 1,
          enrolledCount: 100,
          completedCount: 80,
        },
        {
          chapterId: "c2",
          chapterTitle: "Ch2",
          chapterOrder: 2,
          enrolledCount: 100,
          completedCount: 40,
        },
      ] as never);

      const result = await service.getChapterDropoff(COURSE_ID);

      expect(result[0].dropoffPercentage).toBe(20);
      expect(result[1].dropoffPercentage).toBe(50);
    });

    it("does not divide by zero when enrolledCount is 0", async () => {
      repo.getChapterCompletion.mockResolvedValue([
        {
          chapterId: "c1",
          chapterTitle: "Ch1",
          chapterOrder: 1,
          enrolledCount: 0,
          completedCount: 0,
        },
      ] as never);

      const result = await service.getChapterDropoff(COURSE_ID);

      expect(result[0].dropoffPercentage).toBe(0);
      expect(result[0].completionPercentage).toBe(0);
    });
  });

  describe("getCompletionVelocity", () => {
    it("buckets completion durations and computes average/median", async () => {
      repo.getCourseCompletionDurationsInDays.mockResolvedValue([
        { studentId: "s1", days: 0.5 },
        { studentId: "s2", days: 2 },
        { studentId: "s3", days: 40 },
      ] as never);

      const result = await service.getCompletionVelocity(COURSE_ID);

      expect(result.completedCount).toBe(3);
      expect(result.medianDays).toBe(2);
      expect(result.distribution.find((b) => b.bucket === "0-1")?.count).toBe(1);
      expect(result.distribution.find((b) => b.bucket === "1-3")?.count).toBe(1);
      expect(result.distribution.find((b) => b.bucket === "30+")?.count).toBe(1);
    });

    it("returns zeroed stats when no one has completed the course", async () => {
      repo.getCourseCompletionDurationsInDays.mockResolvedValue([]);

      const result = await service.getCompletionVelocity(COURSE_ID);

      expect(result).toEqual({
        completedCount: 0,
        averageDays: 0,
        medianDays: 0,
        distribution: expect.arrayContaining([expect.objectContaining({ count: 0 })]),
      });
    });
  });

  describe("getTopLearners", () => {
    it("delegates to the repository with the fixed limit", async () => {
      repo.getTopLearners.mockResolvedValue([]);

      await service.getTopLearners(COURSE_ID);

      expect(repo.getTopLearners).toHaveBeenCalledWith(COURSE_ID, 10);
    });
  });
});
