import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Response } from "express";
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
import { QUEUE_NAMES, QueueService } from "src/queue";

import { ChessAnalysisService } from "./chess-analysis.service";
import { ChessInsightService } from "./chess-insight.service";
import { ChessMatchService } from "./chess-match.service";
import { ChessPuzzleService } from "./chess-puzzle.service";
import { ChessStudyService } from "./chess-study.service";
import { ChessService } from "./chess.service";
import {
  createChessAnalysisSessionBodySchema,
  createChessAnalysisSessionResponseSchema,
  chessAnalysisSessionSchema,
  type CreateChessAnalysisSessionBody,
} from "./schemas/chess-analysis.schema";
import {
  chessInsightReportResponseSchema,
  chessMatchInsightReportResponseSchema,
} from "./schemas/chess-insight.schema";
import {
  chessMatchSchema,
  chessSeekSchema,
  createChessSeekBodySchema,
  type CreateChessSeekBody,
} from "./schemas/chess-match.schema";
import {
  chessPuzzleDashboardResponseSchema,
  chessPuzzleSchema,
  chessPuzzleDifficultySchema,
  chessMotifSchema,
  importChessPuzzlesBodySchema,
  importChessPuzzlesResponseSchema,
  submitChessPuzzleAttemptBodySchema,
  submitChessPuzzleAttemptResponseSchema,
  type ChessPuzzleDifficulty,
  type ImportChessPuzzlesBody,
  type SubmitChessPuzzleAttemptBody,
} from "./schemas/chess-puzzle.schema";
import {
  addChessStudyMemberBodySchema,
  chessStudyContinueResponseSchema,
  createChessStudyBodySchema,
  createChessStudyChapterBodySchema,
  chessStudyChapterSchema,
  chessStudyDetailSchema,
  chessStudySchema,
  importStudyPgnBodySchema,
  practiceAttemptResultSchema,
  reorderChessStudyChaptersBodySchema,
  submitPracticeAttemptBodySchema,
  updateChessStudyBodySchema,
  updateChessStudyChapterBodySchema,
  type AddChessStudyMemberBody,
  type CreateChessStudyBody,
  type CreateChessStudyChapterBody,
  type ImportStudyPgnBody,
  type ReorderChessStudyChaptersBody,
  type SubmitPracticeAttemptBody,
  type UpdateChessStudyBody,
  type UpdateChessStudyChapterBody,
} from "./schemas/chess-study.schema";
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
    private readonly chessStudyService: ChessStudyService,
    private readonly chessPuzzleService: ChessPuzzleService,
    private readonly chessMatchService: ChessMatchService,
    private readonly chessInsightService: ChessInsightService,
    private readonly queueService: QueueService,
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

  @Get("studies")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [
      { type: "query", name: "page", schema: Type.Optional(Type.Number({ minimum: 1 })) },
      { type: "query", name: "perPage", schema: Type.Optional(Type.Number({ minimum: 1 })) },
      { type: "query", name: "search", schema: Type.Optional(Type.String()) },
      { type: "query", name: "topic", schema: Type.Optional(chessTopicSchema) },
      { type: "query", name: "mine", schema: queryBooleanSchema },
      { type: "query", name: "shared", schema: queryBooleanSchema },
    ],
    response: paginatedResponse(Type.Array(chessStudySchema)),
  })
  async listStudies(
    @Query("page") page: number,
    @Query("perPage") perPage: number,
    @Query("search") search: string,
    @Query("topic") topic: string,
    @Query("mine") mine: boolean | "true" | "false",
    @Query("shared") shared: boolean | "true" | "false",
    @CurrentUser() user: CurrentUserType,
  ) {
    const result = await this.chessStudyService.listStudies(user, {
      page,
      perPage,
      search,
      topic,
      mineOnly: parseQueryBoolean(mine),
      sharedOnly: parseQueryBoolean(shared),
    });
    return new PaginatedResponse({
      data: result.data.map((study) => ({ ...study, canWrite: study.authorId === user.userId })),
      pagination: result.pagination,
    });
  }

  @Post("studies")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_CREATE)
  @Validate({
    request: [{ type: "body", schema: createChessStudyBodySchema }],
    response: baseResponse(chessStudySchema),
  })
  async createStudy(@Body() body: CreateChessStudyBody, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessStudyService.createStudy(body, user));
  }

  @Get("studies/:id")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessStudyDetailSchema),
  })
  async getStudy(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessStudyService.getStudyDetail(id, user));
  }

  @Patch("studies/:id")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: updateChessStudyBodySchema },
    ],
    response: baseResponse(chessStudySchema),
  })
  async updateStudy(
    @Param("id") id: UUIDType,
    @Body() body: UpdateChessStudyBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.chessStudyService.updateStudy(id, body, user));
  }

  @Delete("studies/:id")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(Type.Object({ id: UUIDSchema })),
  })
  async deleteStudy(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    await this.chessStudyService.deleteStudy(id, user);
    return new BaseResponse({ id });
  }

  @Post("studies/:id/clone")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_CREATE)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessStudySchema),
  })
  async cloneStudy(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessStudyService.cloneStudy(id, user));
  }

  @Post("studies/:id/import-pgn")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: importStudyPgnBodySchema },
    ],
    response: baseResponse(Type.Array(chessStudyChapterSchema)),
  })
  async importStudyPgn(
    @Param("id") id: UUIDType,
    @Body() body: ImportStudyPgnBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.chessStudyService.importStudyPgn(id, body, user));
  }

  @Get("studies/:id/export.pgn")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Header("Content-Type", "text/plain; charset=utf-8")
  async exportStudyPgn(
    @Param("id") id: UUIDType,
    @CurrentUser() user: CurrentUserType,
    @Res() res: Response,
  ) {
    const pgn = await this.chessStudyService.exportStudyPgn(id, user);
    res.setHeader("Content-Disposition", `attachment; filename="study-${id}.pgn"`);
    res.send(pgn);
  }

  @Get("studies/:id/chapters/:chapterId/export.pgn")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Header("Content-Type", "text/plain; charset=utf-8")
  async exportStudyChapterPgn(
    @Param("id") id: UUIDType,
    @Param("chapterId") chapterId: UUIDType,
    @CurrentUser() user: CurrentUserType,
    @Res() res: Response,
  ) {
    const pgn = await this.chessStudyService.exportStudyChapterPgn(id, chapterId, user);
    res.setHeader("Content-Disposition", `attachment; filename="chapter-${chapterId}.pgn"`);
    res.send(pgn);
  }

  @Post("studies/:id/chapters")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: createChessStudyChapterBodySchema },
    ],
    response: baseResponse(chessStudyChapterSchema),
  })
  async createStudyChapter(
    @Param("id") id: UUIDType,
    @Body() body: CreateChessStudyChapterBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.chessStudyService.createChapter(id, body, user));
  }

  @Patch("studies/:id/chapters/:chapterId")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "param", name: "chapterId", schema: UUIDSchema },
      { type: "body", schema: updateChessStudyChapterBodySchema },
    ],
    response: baseResponse(chessStudyChapterSchema),
  })
  async updateStudyChapter(
    @Param("id") id: UUIDType,
    @Param("chapterId") chapterId: UUIDType,
    @Body() body: UpdateChessStudyChapterBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.chessStudyService.updateChapter(id, chapterId, body, user));
  }

  @Delete("studies/:id/chapters/:chapterId")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "param", name: "chapterId", schema: UUIDSchema },
    ],
    response: baseResponse(Type.Object({ id: UUIDSchema })),
  })
  async deleteStudyChapter(
    @Param("id") id: UUIDType,
    @Param("chapterId") chapterId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.chessStudyService.deleteChapter(id, chapterId, user);
    return new BaseResponse({ id: chapterId });
  }

  @Patch("studies/:id/chapters/reorder")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: reorderChessStudyChaptersBodySchema },
    ],
    response: baseResponse(Type.Object({ success: Type.Boolean() })),
  })
  async reorderStudyChapters(
    @Param("id") id: UUIDType,
    @Body() body: ReorderChessStudyChaptersBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.chessStudyService.reorderChapters(id, body, user);
    return new BaseResponse({ success: true });
  }

  @Post("studies/:id/chapters/:chapterId/practice-attempt")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "param", name: "chapterId", schema: UUIDSchema },
      { type: "body", schema: submitPracticeAttemptBodySchema },
    ],
    response: baseResponse(practiceAttemptResultSchema),
  })
  async submitPracticeAttempt(
    @Param("id") id: UUIDType,
    @Param("chapterId") chapterId: UUIDType,
    @Body() body: SubmitPracticeAttemptBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.chessStudyService.submitPracticeAttempt(id, chapterId, body, user),
    );
  }

  @Get("studies/:id/continue")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessStudyContinueResponseSchema),
  })
  async getContinueChapter(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    const chapterId = await this.chessStudyService.getContinueChapterId(id, user);
    return new BaseResponse({ chapterId });
  }

  @Post("studies/:id/members")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: addChessStudyMemberBodySchema },
    ],
    response: baseResponse(Type.Object({ success: Type.Boolean() })),
  })
  async addMember(
    @Param("id") id: UUIDType,
    @Body() body: AddChessStudyMemberBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.chessStudyService.addMember(id, body, user);
    return new BaseResponse({ success: true });
  }

  @Delete("studies/:id/members/:userId")
  @RequirePermission(PERMISSIONS.CHESS_STUDY_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "param", name: "userId", schema: UUIDSchema },
    ],
    response: baseResponse(Type.Object({ success: Type.Boolean() })),
  })
  async removeMember(
    @Param("id") id: UUIDType,
    @Param("userId") userId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.chessStudyService.removeMember(id, userId, user);
    return new BaseResponse({ success: true });
  }

  @Get("puzzles/next")
  @RequirePermission(PERMISSIONS.CHESS_PUZZLE_READ)
  @Validate({
    request: [
      { type: "query", name: "difficulty", schema: Type.Optional(chessPuzzleDifficultySchema) },
      { type: "query", name: "motif", schema: Type.Optional(chessMotifSchema) },
    ],
    response: baseResponse(Type.Union([chessPuzzleSchema, Type.Null()])),
  })
  async getNextPuzzle(
    @Query("difficulty") difficulty: ChessPuzzleDifficulty | undefined,
    @Query("motif")
    motif: ImportChessPuzzlesBody["motifs"] extends (infer T)[] | undefined ? T : never,
    @CurrentUser() user: CurrentUserType,
  ) {
    const puzzle = await this.chessPuzzleService.getNextPuzzle(user, difficulty ?? "NORMAL", motif);
    return new BaseResponse(puzzle);
  }

  @Get("puzzles/daily")
  @RequirePermission(PERMISSIONS.CHESS_PUZZLE_READ)
  @Validate({
    response: baseResponse(Type.Union([chessPuzzleSchema, Type.Null()])),
  })
  async getDailyPuzzle() {
    const puzzle = await this.chessPuzzleService.getDailyPuzzle();
    return new BaseResponse(puzzle);
  }

  @Get("puzzles/mistakes")
  @RequirePermission(PERMISSIONS.CHESS_PUZZLE_READ)
  @Validate({
    response: baseResponse(Type.Array(chessPuzzleSchema)),
  })
  async getPuzzleMistakes(@CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessPuzzleService.getMistakes(user));
  }

  @Get("puzzles/dashboard")
  @RequirePermission(PERMISSIONS.CHESS_PUZZLE_READ)
  @Validate({
    response: baseResponse(chessPuzzleDashboardResponseSchema),
  })
  async getPuzzleDashboard(@CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessPuzzleService.getDashboard(user.userId));
  }

  @Post("puzzles/:id/attempts")
  @RequirePermission(PERMISSIONS.CHESS_PUZZLE_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: submitChessPuzzleAttemptBodySchema },
    ],
    response: baseResponse(submitChessPuzzleAttemptResponseSchema),
  })
  async submitPuzzleAttempt(
    @Param("id") id: UUIDType,
    @Body() body: SubmitChessPuzzleAttemptBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.chessPuzzleService.submitAttempt(user, id, body.movesUci));
  }

  @Post("puzzles/import")
  @RequirePermission(PERMISSIONS.CHESS_PUZZLE_MANAGE)
  @Validate({
    request: [{ type: "body", schema: importChessPuzzlesBodySchema }],
    response: baseResponse(importChessPuzzlesResponseSchema),
  })
  async importPuzzles(@Body() body: ImportChessPuzzlesBody, @CurrentUser() user: CurrentUserType) {
    const job = await this.queueService
      .getQueue(QUEUE_NAMES.CHESS_PUZZLE_IMPORT)
      .add("import-puzzles", {
        tenantId: user.tenantId,
        csv: body.csv,
        minRating: body.minRating,
        maxRating: body.maxRating,
        motifs: body.motifs,
        maxCount: body.maxCount,
      });
    return new BaseResponse({ jobId: job.id ?? "" });
  }

  @Get("seeks")
  @RequirePermission(PERMISSIONS.CHESS_MATCH_PLAY)
  @Validate({
    response: baseResponse(Type.Array(chessSeekSchema)),
  })
  async listSeeks(@CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessMatchService.listOpenSeeks(user));
  }

  @Post("seeks")
  @RequirePermission(PERMISSIONS.CHESS_MATCH_PLAY)
  @Validate({
    request: [{ type: "body", schema: createChessSeekBodySchema }],
    response: baseResponse(chessSeekSchema),
  })
  async createSeek(@Body() body: CreateChessSeekBody, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessMatchService.createSeek(user, body));
  }

  @Post("seeks/:id/cancel")
  @RequirePermission(PERMISSIONS.CHESS_MATCH_PLAY)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(Type.Object({ success: Type.Boolean() })),
  })
  async cancelSeek(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    await this.chessMatchService.cancelSeek(user, id);
    return new BaseResponse({ success: true });
  }

  @Post("seeks/:id/accept")
  @RequirePermission(PERMISSIONS.CHESS_MATCH_PLAY)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessMatchSchema),
  })
  async acceptSeek(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    const match = await this.chessMatchService.acceptSeek(user, id);
    return new BaseResponse({ ...match, moves: [] });
  }

  @Get("matches/:id")
  @RequirePermission(PERMISSIONS.CHESS_MATCH_WATCH)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessMatchSchema),
  })
  async getMatch(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessMatchService.getMatchState(user, id));
  }

  @Get("insight/report")
  @RequirePermission(PERMISSIONS.CHESS_INSIGHT_READ)
  @Validate({
    response: baseResponse(chessInsightReportResponseSchema),
  })
  async getOwnInsightReport(@CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessInsightService.getReport(user, user.userId));
  }

  @Get("insight/users/:userId/report")
  @RequirePermission(PERMISSIONS.CHESS_INSIGHT_READ)
  @Validate({
    request: [{ type: "param", name: "userId", schema: UUIDSchema }],
    response: baseResponse(chessInsightReportResponseSchema),
  })
  async getUserInsightReport(
    @Param("userId") userId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.chessInsightService.getReport(user, userId));
  }

  @Get("insight/matches/:id/report")
  @RequirePermission(PERMISSIONS.CHESS_MATCH_WATCH)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessMatchInsightReportResponseSchema),
  })
  async getMatchInsightReport(@Param("id") id: UUIDType) {
    return new BaseResponse(await this.chessInsightService.getMatchReport(id));
  }

  @Post("insight/matches/:id/analyze")
  @RequirePermission(PERMISSIONS.CHESS_INSIGHT_READ_ALL)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(Type.Object({ jobId: Type.String() })),
  })
  async requestMatchInsightAnalysis(
    @Param("id") id: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    const job = await this.queueService
      .getQueue(QUEUE_NAMES.CHESS_MATCH_INSIGHT_ANALYSIS)
      .add("analyze-match", { tenantId: user.tenantId, matchId: id });
    return new BaseResponse({ jobId: job.id ?? "" });
  }
}
