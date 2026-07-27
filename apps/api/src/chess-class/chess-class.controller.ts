import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { PERMISSIONS } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema, type UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";

import { ChessClassService } from "./chess-class.service";
import {
  bulkCreateStudentsBodySchema,
  bulkCreateStudentsResponseSchema,
  chessClassProgressResponseSchema,
  generateLoginCodesResponseSchema,
  releaseStudentAccountBodySchema,
  releaseStudentAccountResponseSchema,
  resetStudentPasswordResponseSchema,
  type BulkCreateStudentsBody,
  type ReleaseStudentAccountBody,
} from "./schemas/chess-class.schema";

@Controller("chess-class")
export class ChessClassController {
  constructor(private readonly chessClassService: ChessClassService) {}

  @ApiOperation({
    deprecated: true,
    summary:
      "Deprecated — superseded by the Classroom module (docs/specs/classroom-business-spec.md), scheduled for removal in Đợt C8",
  })
  @Post("groups/:groupId/students/bulk")
  @RequirePermission(PERMISSIONS.CHESS_CLASS_MANAGE_STUDENTS)
  @Validate({
    request: [
      { type: "param", name: "groupId", schema: UUIDSchema },
      { type: "body", schema: bulkCreateStudentsBodySchema },
    ],
    response: baseResponse(bulkCreateStudentsResponseSchema),
  })
  async bulkCreateStudents(
    @Param("groupId") groupId: UUIDType,
    @Body() body: BulkCreateStudentsBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    const students = await this.chessClassService.bulkCreateStudents(user, groupId, body.names);
    return new BaseResponse({ students });
  }

  @ApiOperation({
    deprecated: true,
    summary:
      "Deprecated — superseded by the Classroom module (docs/specs/classroom-business-spec.md), scheduled for removal in Đợt C8",
  })
  @Post("students/:userId/reset-password")
  @RequirePermission(PERMISSIONS.CHESS_CLASS_RESET_PASSWORD)
  @Validate({
    request: [{ type: "param", name: "userId", schema: UUIDSchema }],
    response: baseResponse(resetStudentPasswordResponseSchema),
  })
  async resetStudentPassword(
    @Param("userId") userId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    const temporaryPassword = await this.chessClassService.resetStudentPassword(user, userId);
    return new BaseResponse({ temporaryPassword });
  }

  @ApiOperation({
    deprecated: true,
    summary:
      "Deprecated — superseded by the Classroom module (docs/specs/classroom-business-spec.md), scheduled for removal in Đợt C8",
  })
  @Post("students/:userId/release")
  @RequirePermission(PERMISSIONS.CHESS_CLASS_MANAGE_STUDENTS)
  @Validate({
    request: [
      { type: "param", name: "userId", schema: UUIDSchema },
      { type: "body", schema: releaseStudentAccountBodySchema },
    ],
    response: baseResponse(releaseStudentAccountResponseSchema),
  })
  async releaseStudentAccount(
    @Param("userId") userId: UUIDType,
    @Body() body: ReleaseStudentAccountBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    const createToken = await this.chessClassService.releaseStudentAccount(
      user,
      userId,
      body.email,
    );
    return new BaseResponse({ createToken });
  }

  @ApiOperation({
    deprecated: true,
    summary:
      "Deprecated — superseded by the Classroom module (docs/specs/classroom-business-spec.md), scheduled for removal in Đợt C8",
  })
  @Post("groups/:groupId/login-codes")
  @RequirePermission(PERMISSIONS.CHESS_CLASS_MANAGE_STUDENTS)
  @Validate({
    request: [{ type: "param", name: "groupId", schema: UUIDSchema }],
    response: baseResponse(generateLoginCodesResponseSchema),
  })
  async generateLoginCodes(
    @Param("groupId") groupId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.chessClassService.generateLoginCodes(user, groupId));
  }

  @ApiOperation({
    deprecated: true,
    summary:
      "Deprecated — superseded by the Classroom module (docs/specs/classroom-business-spec.md), scheduled for removal in Đợt C8",
  })
  @Get("groups/:groupId/progress")
  @RequirePermission(PERMISSIONS.CHESS_CLASS_PROGRESS)
  @Validate({
    request: [
      { type: "param", name: "groupId", schema: UUIDSchema },
      { type: "query", name: "days", schema: Type.Optional(Type.Number()) },
    ],
    response: baseResponse(chessClassProgressResponseSchema),
  })
  async getClassProgress(@Param("groupId") groupId: UUIDType, @Query("days") days?: number) {
    return new BaseResponse(await this.chessClassService.getClassProgress(groupId, days ?? 30));
  }
}
