import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import {
  BaseResponse,
  baseResponse,
  PaginatedResponse,
  paginatedResponse,
  UUIDSchema,
  type UUIDType,
} from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";

import { ChessAnalysisService } from "./chess-analysis.service";
import { ChessService } from "./chess.service";
import {
  createChessAnalysisSessionBodySchema,
  createChessAnalysisSessionResponseSchema,
  chessAnalysisSessionSchema,
  type CreateChessAnalysisSessionBody,
} from "./schemas/chess-analysis.schema";
import {
  chessAudienceSchema,
  chessExerciseAttemptResultSchema,
  chessExerciseFormatSchema,
  chessExerciseSchema,
  chessGameLevelSchema,
  chessGameSchema,
  chessPlaySessionSchema,
  chessTopicSchema,
  createChessExerciseBodySchema,
  createChessGameBodySchema,
  createChessPlaySessionBodySchema,
  submitChessExerciseAttemptBodySchema,
  updateChessExerciseBodySchema,
  updateChessGameBodySchema,
  type CreateChessExerciseBody,
  type CreateChessGameBody,
  type CreateChessPlaySessionBody,
  type SubmitChessExerciseAttemptBody,
  type UpdateChessExerciseBody,
  type UpdateChessGameBody,
} from "./schemas/chess.schema";

/** Query strings arrive as strings; accept true/false literals like other controllers. */
const queryBooleanSchema = Type.Optional(
  Type.Union([Type.Boolean(), Type.Literal("true"), Type.Literal("false")]),
);

const parseQueryBoolean = (value?: boolean | "true" | "false"): boolean | undefined => {
  if (value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
};

@Controller("chess")
export class ChessController {
  constructor(
    private readonly chessService: ChessService,
    private readonly chessAnalysisService: ChessAnalysisService,
  ) {}

  @Get("topics")
  @RequirePermission(PERMISSIONS.CHESS_EXERCISE_READ, PERMISSIONS.CHESS_GAME_READ)
  @Validate({
    response: baseResponse(
      Type.Array(
        Type.Object({
          id: chessTopicSchema,
          labelKey: Type.String(),
        }),
      ),
    ),
  })
  async getTopics() {
    return new BaseResponse(this.chessService.getTopics());
  }

  @Get("exercises")
  @RequirePermission(PERMISSIONS.CHESS_EXERCISE_READ)
  @Validate({
    request: [
      { type: "query", name: "page", schema: Type.Optional(Type.Number({ minimum: 1 })) },
      { type: "query", name: "perPage", schema: Type.Optional(Type.Number({ minimum: 1 })) },
      { type: "query", name: "search", schema: Type.Optional(Type.String()) },
      { type: "query", name: "topic", schema: Type.Optional(chessTopicSchema) },
      { type: "query", name: "audience", schema: Type.Optional(chessAudienceSchema) },
      { type: "query", name: "format", schema: Type.Optional(chessExerciseFormatSchema) },
      { type: "query", name: "publishedOnly", schema: queryBooleanSchema },
    ],
    response: paginatedResponse(Type.Array(chessExerciseSchema)),
  })
  async listExercises(
    @Query("page") page?: number,
    @Query("perPage") perPage?: number,
    @Query("search") search?: string,
    @Query("topic")
    topic?: CreateChessExerciseBody["topics"] extends (infer T)[] | undefined ? T : never,
    @Query("audience") audience?: CreateChessExerciseBody["audience"],
    @Query("format") format?: CreateChessExerciseBody["format"],
    @Query("publishedOnly") publishedOnly?: boolean | "true" | "false",
  ) {
    const result = await this.chessService.listExercises({
      page,
      perPage,
      search,
      topic,
      audience,
      format,
      publishedOnly: parseQueryBoolean(publishedOnly),
    });
    return new PaginatedResponse(result);
  }

  @Get("exercises/:id")
  @RequirePermission(PERMISSIONS.CHESS_EXERCISE_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessExerciseSchema),
  })
  async getExercise(@Param("id") id: UUIDType) {
    return new BaseResponse(await this.chessService.getExercise(id));
  }

  @Post("exercises")
  @RequirePermission(PERMISSIONS.CHESS_EXERCISE_MANAGE)
  @Validate({
    request: [{ type: "body", schema: createChessExerciseBodySchema }],
    response: baseResponse(chessExerciseSchema),
  })
  async createExercise(
    @Body() body: CreateChessExerciseBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.chessService.createExercise(body, user.userId));
  }

  @Patch("exercises/:id")
  @RequirePermission(PERMISSIONS.CHESS_EXERCISE_MANAGE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: updateChessExerciseBodySchema },
    ],
    response: baseResponse(chessExerciseSchema),
  })
  async updateExercise(@Param("id") id: UUIDType, @Body() body: UpdateChessExerciseBody) {
    return new BaseResponse(await this.chessService.updateExercise(id, body));
  }

  @Delete("exercises/:id")
  @RequirePermission(PERMISSIONS.CHESS_EXERCISE_MANAGE)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(Type.Object({ id: UUIDSchema })),
  })
  async deleteExercise(@Param("id") id: UUIDType) {
    return new BaseResponse(await this.chessService.deleteExercise(id));
  }

  @Post("exercises/:id/attempts")
  @RequirePermission(PERMISSIONS.CHESS_EXERCISE_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: submitChessExerciseAttemptBodySchema },
    ],
    response: baseResponse(chessExerciseAttemptResultSchema),
  })
  async submitAttempt(
    @Param("id") id: UUIDType,
    @Body() body: SubmitChessExerciseAttemptBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.chessService.submitExerciseAttempt(id, user.userId, body));
  }

  @Get("games")
  @RequirePermission(PERMISSIONS.CHESS_GAME_READ)
  @Validate({
    request: [
      { type: "query", name: "page", schema: Type.Optional(Type.Number({ minimum: 1 })) },
      { type: "query", name: "perPage", schema: Type.Optional(Type.Number({ minimum: 1 })) },
      { type: "query", name: "search", schema: Type.Optional(Type.String()) },
      { type: "query", name: "topic", schema: Type.Optional(chessTopicSchema) },
      { type: "query", name: "level", schema: Type.Optional(chessGameLevelSchema) },
      { type: "query", name: "publishedOnly", schema: queryBooleanSchema },
    ],
    response: paginatedResponse(Type.Array(chessGameSchema)),
  })
  async listGames(
    @Query("page") page?: number,
    @Query("perPage") perPage?: number,
    @Query("search") search?: string,
    @Query("topic")
    topic?: CreateChessGameBody["topics"] extends (infer T)[] | undefined ? T : never,
    @Query("level") level?: CreateChessGameBody["level"],
    @Query("publishedOnly") publishedOnly?: boolean | "true" | "false",
  ) {
    const result = await this.chessService.listGames({
      page,
      perPage,
      search,
      topic,
      level,
      publishedOnly: parseQueryBoolean(publishedOnly),
    });
    return new PaginatedResponse(result);
  }

  @Get("games/:id")
  @RequirePermission(PERMISSIONS.CHESS_GAME_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessGameSchema),
  })
  async getGame(@Param("id") id: UUIDType) {
    return new BaseResponse(await this.chessService.getGame(id));
  }

  @Post("games")
  @RequirePermission(PERMISSIONS.CHESS_GAME_MANAGE)
  @Validate({
    request: [{ type: "body", schema: createChessGameBodySchema }],
    response: baseResponse(chessGameSchema),
  })
  async createGame(@Body() body: CreateChessGameBody, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessService.createGame(body, user.userId));
  }

  @Patch("games/:id")
  @RequirePermission(PERMISSIONS.CHESS_GAME_MANAGE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: updateChessGameBodySchema },
    ],
    response: baseResponse(chessGameSchema),
  })
  async updateGame(@Param("id") id: UUIDType, @Body() body: UpdateChessGameBody) {
    return new BaseResponse(await this.chessService.updateGame(id, body));
  }

  @Delete("games/:id")
  @RequirePermission(PERMISSIONS.CHESS_GAME_MANAGE)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(Type.Object({ id: UUIDSchema })),
  })
  async deleteGame(@Param("id") id: UUIDType) {
    return new BaseResponse(await this.chessService.deleteGame(id));
  }

  @Post("play-sessions")
  @RequirePermission(PERMISSIONS.CHESS_GAME_READ)
  @Validate({
    request: [{ type: "body", schema: createChessPlaySessionBodySchema }],
    response: baseResponse(chessPlaySessionSchema),
  })
  async createPlaySession(
    @Body() body: CreateChessPlaySessionBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.chessService.createPlaySession(user.userId, body));
  }

  @Get("play-sessions")
  @RequirePermission(PERMISSIONS.CHESS_GAME_READ)
  @Validate({
    request: [
      { type: "query", name: "page", schema: Type.Optional(Type.Number({ minimum: 1 })) },
      { type: "query", name: "perPage", schema: Type.Optional(Type.Number({ minimum: 1 })) },
    ],
    response: paginatedResponse(Type.Array(chessPlaySessionSchema)),
  })
  async listPlaySessions(
    @Query("page") page: number,
    @Query("perPage") perPage: number,
    @CurrentUser() user: CurrentUserType,
  ) {
    const result = await this.chessService.listPlaySessions(user.userId, { page, perPage });
    return new PaginatedResponse(result);
  }

  @Get("play-sessions/:id")
  @RequirePermission(PERMISSIONS.CHESS_GAME_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessPlaySessionSchema),
  })
  async getPlaySession(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessService.getPlaySession(id, user.userId));
  }

  @Post("analysis-sessions")
  @RequirePermission(PERMISSIONS.CHESS_GAME_MANAGE)
  @Validate({
    request: [{ type: "body", schema: createChessAnalysisSessionBodySchema }],
    response: baseResponse(createChessAnalysisSessionResponseSchema),
  })
  async createAnalysisSession(
    @Body() body: CreateChessAnalysisSessionBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.chessAnalysisService.createSession(user, body));
  }

  @Get("analysis-sessions/:id")
  @RequirePermission(PERMISSIONS.CHESS_GAME_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessAnalysisSessionSchema),
  })
  async getAnalysisSession(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessAnalysisService.getSessionState(id, user));
  }
}
