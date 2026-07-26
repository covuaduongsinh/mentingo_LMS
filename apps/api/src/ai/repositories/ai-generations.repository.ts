import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { LocalizationService } from "src/localization/localization.service";
import { chapters, courses, lessons, aiGenerations } from "src/storage/schema";

import type { SupportedLanguages } from "@repo/shared";

export const AI_GENERATION_STATUS = {
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

@Injectable()
export class AiGenerationsRepository {
  constructor(
    @Inject("DB") private readonly db: DatabasePg,
    private readonly localizationService: LocalizationService,
  ) {}

  async getSourceLessonWithCourseAuthor(lessonId: UUIDType, language: SupportedLanguages) {
    const [row] = await this.db
      .select({
        lessonId: lessons.id,
        title: this.localizationService.getLocalizedSqlField(lessons.title, language),
        description: this.localizationService.getLocalizedSqlField(lessons.description, language),
        courseAuthorId: courses.authorId,
      })
      .from(lessons)
      .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
      .innerJoin(courses, eq(courses.id, chapters.courseId))
      .where(eq(lessons.id, lessonId));

    return row;
  }

  async countCompletedThisMonth() {
    const [row] = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.status, AI_GENERATION_STATUS.COMPLETED),
          gte(aiGenerations.createdAt, sql`date_trunc('month', CURRENT_DATE)`),
        ),
      );

    return row?.count ?? 0;
  }

  async logGeneration(data: {
    userId: UUIDType;
    artifactType: string;
    sourceLessonId: UUIDType | null;
    requestedCount: number;
    status: (typeof AI_GENERATION_STATUS)[keyof typeof AI_GENERATION_STATUS];
  }) {
    await this.db.insert(aiGenerations).values(data);
  }
}
