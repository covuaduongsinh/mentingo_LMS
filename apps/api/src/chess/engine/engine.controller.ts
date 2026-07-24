import { Body, Controller, Get, Post } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";

import {
  engineAnalyzeBodySchema,
  engineAnalyzeResultSchema,
  engineBestMoveBodySchema,
  engineBestMoveResultSchema,
  engineStatusSchema,
  type EngineAnalyzeBody,
  type EngineBestMoveBody,
} from "../schemas/engine.schema";

import { ChessEngineService } from "./engine.service";

@Controller("chess/engine")
export class ChessEngineController {
  constructor(private readonly engineService: ChessEngineService) {}

  @Get("status")
  @RequirePermission(PERMISSIONS.CHESS_EXERCISE_READ, PERMISSIONS.CHESS_GAME_READ)
  @Validate({
    response: baseResponse(engineStatusSchema),
  })
  getStatus() {
    return new BaseResponse(this.engineService.getStatus());
  }

  @Post("bestmove")
  @RequirePermission(PERMISSIONS.CHESS_EXERCISE_READ, PERMISSIONS.CHESS_GAME_READ)
  @Validate({
    request: [{ type: "body", schema: engineBestMoveBodySchema }],
    response: baseResponse(engineBestMoveResultSchema),
  })
  async bestMove(@Body() body: EngineBestMoveBody) {
    const result = await this.engineService.bestMove({
      fen: body.fen,
      movesUci: body.movesUci,
      level: body.level,
    });
    return new BaseResponse(result);
  }

  @Post("analyze")
  @RequirePermission(PERMISSIONS.CHESS_EXERCISE_READ, PERMISSIONS.CHESS_GAME_READ)
  @Validate({
    request: [{ type: "body", schema: engineAnalyzeBodySchema }],
    response: baseResponse(engineAnalyzeResultSchema),
  })
  async analyze(@Body() body: EngineAnalyzeBody) {
    const result = await this.engineService.analyze({
      fen: body.fen,
      movesUci: body.movesUci,
      depth: body.depth,
    });
    return new BaseResponse(result);
  }
}
