import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";

import { ChessLearnService } from "./chess-learn.service";
import {
  chessLearnAttemptResultSchema,
  chessLearnCompletionSummarySchema,
  chessLearnLevelContentSchema,
  chessLearnStagesResponseSchema,
  coordinateHighScoresResponseSchema,
  submitChessLearnAttemptBodySchema,
  submitCoordinateScoreBodySchema,
  submitCoordinateScoreResultSchema,
  type SubmitChessLearnAttemptBody,
  type SubmitCoordinateScoreBody,
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
    return new BaseResponse(await this.chessLearnService.getStages(user.userId));
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

  @Post("reset")
  @RequirePermission(PERMISSIONS.CHESS_LEARN_READ)
  @Validate({
    response: baseResponse(Type.Object({ ok: Type.Literal(true) })),
  })
  async resetLearnProgress(@CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessLearnService.resetProgress(user.userId));
  }

  @Get("completion")
  @RequirePermission(PERMISSIONS.CHESS_LEARN_READ)
  @Validate({
    request: [
      {
        type: "query",
        name: "userIds",
        schema: Type.Optional(Type.Array(UUIDSchema)),
      },
    ],
    response: baseResponse(chessLearnCompletionSummarySchema),
  })
  async getLearnCompletion(
    @CurrentUser() user: CurrentUserType,
    @Query("userIds") userIds?: string | string[],
  ) {
    const ids = !userIds ? [user.userId] : Array.isArray(userIds) ? userIds : [userIds];
    const summary = await this.chessLearnService.getCompletionForUsers(ids);
    const self = summary.byUserId.find((row) => row.userId === user.userId);
    return new BaseResponse({
      ...summary,
      completedLevels: self?.completedLevels ?? 0,
      percent: self?.percent ?? 0,
    });
  }

  @Get("coordinate-scores")
  @RequirePermission(PERMISSIONS.CHESS_LEARN_READ)
  @Validate({
    response: baseResponse(coordinateHighScoresResponseSchema),
  })
  async getCoordinateScores(@CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessLearnService.getCoordinateHighScores(user.userId));
  }

  @Post("coordinate-scores")
  @RequirePermission(PERMISSIONS.CHESS_LEARN_READ)
  @Validate({
    request: [{ type: "body", schema: submitCoordinateScoreBodySchema }],
    response: baseResponse(submitCoordinateScoreResultSchema),
  })
  async submitCoordinateHighScore(
    @Body() body: SubmitCoordinateScoreBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.chessLearnService.submitCoordinateScore(
        user.userId,
        body.mode,
        body.orientation,
        body.score,
      ),
    );
  }
}
