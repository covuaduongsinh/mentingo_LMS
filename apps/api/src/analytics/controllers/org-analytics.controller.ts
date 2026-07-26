import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Response } from "express";
import { Validate } from "nestjs-typebox";

import { baseResponse, BaseResponse } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { PermissionsGuard } from "src/common/guards/permissions.guard";

import {
  certificateIssuanceRateSchema,
  cohortRetentionSchema,
  dauTrendSchema,
  engagementScoreSchema,
  newVsReturningSchema,
  scoreDistributionSchema,
  weekdayActivitySchema,
} from "../schemas/org-analytics.schema";
import { AnalyticsService } from "../services/analytics.service";

import type {
  CertificateIssuanceRateResponse,
  CohortRetentionResponse,
  DauTrendResponse,
  EngagementScoreResponse,
  NewVsReturningResponse,
  ScoreDistributionResponse,
  WeekdayActivityResponse,
} from "../schemas/org-analytics.schema";

const daysQuerySchema = Type.Optional(Type.Number({ minimum: 1, maximum: 90 }));

@UseGuards(PermissionsGuard)
@Controller("analytics/org")
export class OrgAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dau-trend")
  @RequirePermission(PERMISSIONS.STATISTICS_READ)
  @Validate({
    request: [{ type: "query", name: "days", schema: daysQuerySchema }],
    response: baseResponse(dauTrendSchema),
  })
  async getDauTrend(@Query("days") days?: number): Promise<BaseResponse<DauTrendResponse>> {
    return new BaseResponse(await this.analyticsService.getDauTrend(days));
  }

  @Get("new-vs-returning")
  @RequirePermission(PERMISSIONS.STATISTICS_READ)
  @Validate({
    request: [{ type: "query", name: "days", schema: daysQuerySchema }],
    response: baseResponse(newVsReturningSchema),
  })
  async getNewVsReturning(
    @Query("days") days?: number,
  ): Promise<BaseResponse<NewVsReturningResponse>> {
    return new BaseResponse(await this.analyticsService.getNewVsReturning(days));
  }

  @Get("weekday-activity")
  @RequirePermission(PERMISSIONS.STATISTICS_READ)
  @Validate({
    response: baseResponse(weekdayActivitySchema),
  })
  async getWeekdayActivity(): Promise<BaseResponse<WeekdayActivityResponse>> {
    return new BaseResponse(await this.analyticsService.getWeekdayActivity());
  }

  @Get("cohort-retention")
  @RequirePermission(PERMISSIONS.STATISTICS_READ)
  @Validate({
    response: baseResponse(cohortRetentionSchema),
  })
  async getCohortRetention(): Promise<BaseResponse<CohortRetentionResponse>> {
    return new BaseResponse(await this.analyticsService.getCohortRetention());
  }

  @Get("score-distribution")
  @RequirePermission(PERMISSIONS.STATISTICS_READ)
  @Validate({
    response: baseResponse(scoreDistributionSchema),
  })
  async getScoreDistribution(): Promise<BaseResponse<ScoreDistributionResponse>> {
    return new BaseResponse(await this.analyticsService.getScoreDistribution());
  }

  @Get("certificate-issuance-rate")
  @RequirePermission(PERMISSIONS.STATISTICS_READ)
  @Validate({
    response: baseResponse(certificateIssuanceRateSchema),
  })
  async getCertificateIssuanceRate(): Promise<BaseResponse<CertificateIssuanceRateResponse>> {
    return new BaseResponse(await this.analyticsService.getCertificateIssuanceRate());
  }

  @Get("engagement-score")
  @RequirePermission(PERMISSIONS.STATISTICS_READ)
  @Validate({
    response: baseResponse(engagementScoreSchema),
  })
  async getEngagementScore(): Promise<BaseResponse<EngagementScoreResponse>> {
    return new BaseResponse(await this.analyticsService.getEngagementScore());
  }

  @Get("export")
  @RequirePermission(PERMISSIONS.STATISTICS_READ)
  async exportAdvancedAnalytics(@Res() res: Response): Promise<void> {
    const buffer = await this.analyticsService.generateAdvancedAnalyticsReport();
    const filename = `advanced-analytics-${new Date().toISOString().split("T")[0]}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
  }
}
