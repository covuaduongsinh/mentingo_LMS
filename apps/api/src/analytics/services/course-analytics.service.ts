import { Injectable } from "@nestjs/common";

import { CourseAnalyticsRepository } from "src/analytics/repositories/course-analytics.repository";

import type {
  ChapterDropoffResponse,
  CompletionVelocityResponse,
  LessonCompletionFunnelResponse,
  TopLearnersResponse,
} from "src/analytics/schemas/course-analytics.schema";
import type { UUIDType } from "src/common";

const TOP_LEARNERS_LIMIT = 10;

const VELOCITY_BUCKETS = [
  { bucket: "0-1", maxDays: 1 },
  { bucket: "1-3", maxDays: 3 },
  { bucket: "3-7", maxDays: 7 },
  { bucket: "7-14", maxDays: 14 },
  { bucket: "14-30", maxDays: 30 },
  { bucket: "30+", maxDays: Infinity },
];

function toPercentage(numerator: number, denominator: number): number {
  if (!denominator) return 0;

  return Math.round((numerator / denominator) * 10000) / 100;
}

function median(values: number[]): number {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

@Injectable()
export class CourseAnalyticsService {
  constructor(private readonly courseAnalyticsRepository: CourseAnalyticsRepository) {}

  async getLessonCompletionFunnel(courseId: UUIDType): Promise<LessonCompletionFunnelResponse> {
    const rows = await this.courseAnalyticsRepository.getLessonCompletionFunnel(courseId);

    return rows.map((row) => ({
      ...row,
      completionPercentage: toPercentage(row.completedCount, row.enrolledCount),
    }));
  }

  async getChapterDropoff(courseId: UUIDType): Promise<ChapterDropoffResponse> {
    const rows = await this.courseAnalyticsRepository.getChapterCompletion(courseId);

    let previousCompletedCount: number | null = null;

    return rows.map((row) => {
      const completionPercentage = toPercentage(row.completedCount, row.enrolledCount);
      const dropoffBaseline = previousCompletedCount ?? row.enrolledCount;
      const dropoffPercentage = toPercentage(
        Math.max(dropoffBaseline - row.completedCount, 0),
        dropoffBaseline,
      );

      previousCompletedCount = row.completedCount;

      return { ...row, completionPercentage, dropoffPercentage };
    });
  }

  async getCompletionVelocity(courseId: UUIDType): Promise<CompletionVelocityResponse> {
    const rows = await this.courseAnalyticsRepository.getCourseCompletionDurationsInDays(courseId);
    const days = rows.map((row) => Math.max(row.days, 0));

    const distribution = VELOCITY_BUCKETS.map(({ bucket }) => ({ bucket, count: 0 }));

    for (const value of days) {
      const bucketIndex = VELOCITY_BUCKETS.findIndex(({ maxDays }) => value <= maxDays);
      const resolvedIndex = bucketIndex === -1 ? VELOCITY_BUCKETS.length - 1 : bucketIndex;

      distribution[resolvedIndex].count += 1;
    }

    return {
      completedCount: days.length,
      averageDays: days.length
        ? Math.round((days.reduce((sum, value) => sum + value, 0) / days.length) * 100) / 100
        : 0,
      medianDays: Math.round(median(days) * 100) / 100,
      distribution,
    };
  }

  async getTopLearners(courseId: UUIDType): Promise<TopLearnersResponse> {
    return this.courseAnalyticsRepository.getTopLearners(courseId, TOP_LEARNERS_LIMIT);
  }
}
