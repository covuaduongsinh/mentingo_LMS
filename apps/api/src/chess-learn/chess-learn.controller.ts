import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";

import { ChessLearnService } from "./chess-learn.service";
import {
  chessLearnAttemptResultSchema,
  chessLearnLevelContentSchema,
  chessLearnStagesResponseSchema,
  submitChessLearnAttemptBodySchema,
  type SubmitChessLearnAttemptBody,
} from "./schemas/chess-learn.schema";

@Controller("chess-learn")
export class ChessLearnController {
  constructor(private readonly chessLearnService: ChessLearnService) {}

  @Get("stages")
  @RequirePermission(PERMISSIONS.CHESS_LEARN_READ)
  @Validate({
    response: baseResponse(chessLearnStagesResponseSchema),
  })
  async getStages(@CurrentUser() user: CurrentUserType) {
    return new BaseResponse({ stages: await this.chessLearnService.getStages(user.userId) });
  }

  @Get("stages/:stageId/levels/:levelId")
  @RequirePermission(PERMISSIONS.CHESS_LEARN_READ)
  @Validate({
    request: [
      { type: "param", name: "stageId", schema: Type.String() },
      { type: "param", name: "levelId", schema: Type.String() },
    ],
    response: baseResponse(chessLearnLevelContentSchema),
  })
  async getLevel(
    @Param("stageId") stageId: string,
    @Param("levelId") levelId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.chessLearnService.getLevelContent(stageId, levelId, user.userId),
    );
  }

  @Post("stages/:stageId/levels/:levelId/attempt")
  @RequirePermission(PERMISSIONS.CHESS_LEARN_READ)
  @Validate({
    request: [
      { type: "param", name: "stageId", schema: Type.String() },
      { type: "param", name: "levelId", schema: Type.String() },
      { type: "body", schema: submitChessLearnAttemptBodySchema },
    ],
    response: baseResponse(chessLearnAttemptResultSchema),
  })
  async submitLearnAttempt(
    @Param("stageId") stageId: string,
    @Param("levelId") levelId: string,
    @Body() body: SubmitChessLearnAttemptBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.chessLearnService.submitAttempt(user.userId, stageId, levelId, body.movesUci),
    );
  }
}
