import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Validate } from "nestjs-typebox";

import { baseResponse, BaseResponse, UUIDSchema, UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { PermissionsGuard } from "src/common/guards/permissions.guard";

import {
  chapterDropoffSchema,
  completionVelocitySchema,
  lessonCompletionFunnelSchema,
  topLearnersSchema,
} from "../schemas/course-analytics.schema";
import { CourseAnalyticsService } from "../services/course-analytics.service";

import type {
  ChapterDropoffResponse,
  CompletionVelocityResponse,
  LessonCompletionFunnelResponse,
  TopLearnersResponse,
} from "../schemas/course-analytics.schema";

@UseGuards(PermissionsGuard)
@Controller("analytics/courses/:courseId")
export class CourseAnalyticsController {
  constructor(private readonly courseAnalyticsService: CourseAnalyticsService) {}

  @Get("lesson-completion-funnel")
  @RequirePermission(PERMISSIONS.COURSE_STATISTICS)
  @Validate({
    request: [{ type: "param", name: "courseId", schema: UUIDSchema }],
    response: baseResponse(lessonCompletionFunnelSchema),
  })
  async getLessonCompletionFunnel(
    @Param("courseId") courseId: UUIDType,
  ): Promise<BaseResponse<LessonCompletionFunnelResponse>> {
    return new BaseResponse(await this.courseAnalyticsService.getLessonCompletionFunnel(courseId));
  }

  @Get("chapter-dropoff")
  @RequirePermission(PERMISSIONS.COURSE_STATISTICS)
  @Validate({
    request: [{ type: "param", name: "courseId", schema: UUIDSchema }],
    response: baseResponse(chapterDropoffSchema),
  })
  async getChapterDropoff(
    @Param("courseId") courseId: UUIDType,
  ): Promise<BaseResponse<ChapterDropoffResponse>> {
    return new BaseResponse(await this.courseAnalyticsService.getChapterDropoff(courseId));
  }

  @Get("completion-velocity")
  @RequirePermission(PERMISSIONS.COURSE_STATISTICS)
  @Validate({
    request: [{ type: "param", name: "courseId", schema: UUIDSchema }],
    response: baseResponse(completionVelocitySchema),
  })
  async getCompletionVelocity(
    @Param("courseId") courseId: UUIDType,
  ): Promise<BaseResponse<CompletionVelocityResponse>> {
    return new BaseResponse(await this.courseAnalyticsService.getCompletionVelocity(courseId));
  }

  @Get("top-learners")
  @RequirePermission(PERMISSIONS.COURSE_STATISTICS)
  @Validate({
    request: [{ type: "param", name: "courseId", schema: UUIDSchema }],
    response: baseResponse(topLearnersSchema),
  })
  async getTopLearners(
    @Param("courseId") courseId: UUIDType,
  ): Promise<BaseResponse<TopLearnersResponse>> {
    return new BaseResponse(await this.courseAnalyticsService.getTopLearners(courseId));
  }
}
