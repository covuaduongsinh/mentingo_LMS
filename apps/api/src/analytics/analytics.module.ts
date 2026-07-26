import { Module } from "@nestjs/common";

import { AnalyticsSecretGuard } from "src/analytics/decorators/analytics-secret.decorator";
import { AnalyticsRepository } from "src/analytics/repositories/analytics.repository";
import { CourseAnalyticsRepository } from "src/analytics/repositories/course-analytics.repository";
import { AnalyticsService } from "src/analytics/services/analytics.service";
import { CourseAnalyticsService } from "src/analytics/services/course-analytics.service";

import { AnalyticsController } from "./analytics.controller";
import { CourseAnalyticsController } from "./controllers/course-analytics.controller";
import { OrgAnalyticsController } from "./controllers/org-analytics.controller";

@Module({
  controllers: [AnalyticsController, CourseAnalyticsController, OrgAnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsRepository,
    AnalyticsSecretGuard,
    CourseAnalyticsService,
    CourseAnalyticsRepository,
  ],
})
export class AnalyticsModule {}
