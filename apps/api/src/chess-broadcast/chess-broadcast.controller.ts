import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema, type UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";

import { ChessBroadcastService } from "./chess-broadcast.service";
import {
  chessBroadcastDetailSchema,
  chessBroadcastGameSchema,
  chessBroadcastGameViewSchema,
  chessBroadcastRoundSchema,
  chessBroadcastSchema,
  chessBroadcastStandingsResponseSchema,
  chessBroadcastTeamSchema,
  createBroadcastBodySchema,
  createGameBodySchema,
  createRoundBodySchema,
  createTeamBodySchema,
  pastePgnBodySchema,
  pastePgnResponseSchema,
  updateBroadcastBodySchema,
  updateGameBodySchema,
  type CreateBroadcastBody,
  type CreateGameBody,
  type CreateRoundBody,
  type CreateTeamBody,
  type PastePgnBody,
  type UpdateBroadcastBody,
  type UpdateGameBody,
} from "./schemas/chess-broadcast.schema";

/** Query strings arrive as strings; accept true/false literals like other controllers. */
const queryBooleanSchema = Type.Optional(
  Type.Union([Type.Boolean(), Type.Literal("true"), Type.Literal("false")]),
);

const parseQueryBoolean = (value?: boolean | "true" | "false"): boolean => {
  return value === true || value === "true";
};

@Controller("chess/broadcast")
export class ChessBroadcastController {
  constructor(private readonly chessBroadcastService: ChessBroadcastService) {}

  @Post()
  @RequirePermission(PERMISSIONS.CHESS_BROADCAST_MANAGE)
  @Validate({
    request: [{ type: "body", schema: createBroadcastBodySchema }],
    response: baseResponse(chessBroadcastSchema),
  })
  async createBroadcast(@Body() body: CreateBroadcastBody, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessBroadcastService.createBroadcast(user, body));
  }

  @Get()
  @RequirePermission(PERMISSIONS.CHESS_BROADCAST_READ)
  @Validate({ response: baseResponse(Type.Array(chessBroadcastSchema)) })
  async listBroadcasts() {
    return new BaseResponse(await this.chessBroadcastService.listBroadcasts());
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.CHESS_BROADCAST_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessBroadcastDetailSchema),
  })
  async getBroadcastDetail(@Param("id") id: UUIDType) {
    return new BaseResponse(await this.chessBroadcastService.getBroadcastDetail(id));
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.CHESS_BROADCAST_MANAGE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: updateBroadcastBodySchema },
    ],
    response: baseResponse(chessBroadcastSchema),
  })
  async updateBroadcast(@Param("id") id: UUIDType, @Body() body: UpdateBroadcastBody) {
    return new BaseResponse(await this.chessBroadcastService.updateBroadcast(id, body));
  }

  @Post(":id/rounds")
  @RequirePermission(PERMISSIONS.CHESS_BROADCAST_MANAGE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: createRoundBodySchema },
    ],
    response: baseResponse(chessBroadcastRoundSchema),
  })
  async createRound(@Param("id") id: UUIDType, @Body() body: CreateRoundBody) {
    return new BaseResponse(await this.chessBroadcastService.createRound(id, body));
  }

  @Post(":id/teams")
  @RequirePermission(PERMISSIONS.CHESS_BROADCAST_MANAGE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: createTeamBodySchema },
    ],
    response: baseResponse(chessBroadcastTeamSchema),
  })
  async createTeam(@Param("id") id: UUIDType, @Body() body: CreateTeamBody) {
    return new BaseResponse(await this.chessBroadcastService.createTeam(id, body));
  }

  @Get(":id/standings")
  @RequirePermission(PERMISSIONS.CHESS_BROADCAST_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessBroadcastStandingsResponseSchema),
  })
  async getBroadcastStandings(@Param("id") id: UUIDType) {
    return new BaseResponse(await this.chessBroadcastService.getStandings(id));
  }

  @Post("rounds/:roundId/games")
  @RequirePermission(PERMISSIONS.CHESS_BROADCAST_MANAGE)
  @Validate({
    request: [
      { type: "param", name: "roundId", schema: UUIDSchema },
      { type: "body", schema: createGameBodySchema },
    ],
    response: baseResponse(chessBroadcastGameSchema),
  })
  async createBroadcastGame(@Param("roundId") roundId: UUIDType, @Body() body: CreateGameBody) {
    return new BaseResponse(await this.chessBroadcastService.createGame(roundId, body));
  }

  @Patch("games/:id")
  @RequirePermission(PERMISSIONS.CHESS_BROADCAST_MANAGE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: updateGameBodySchema },
    ],
    response: baseResponse(chessBroadcastGameSchema),
  })
  async updateBroadcastGame(@Param("id") id: UUIDType, @Body() body: UpdateGameBody) {
    return new BaseResponse(await this.chessBroadcastService.updateGame(id, body));
  }

  @Patch("games/:id/pgn")
  @RequirePermission(PERMISSIONS.CHESS_BROADCAST_MANAGE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: pastePgnBodySchema },
    ],
    response: baseResponse(pastePgnResponseSchema),
  })
  async pastePgn(@Param("id") id: UUIDType, @Body() body: PastePgnBody) {
    return new BaseResponse(await this.chessBroadcastService.pastePgn(id, body.pgn));
  }

  @Get("games/:id")
  @RequirePermission(PERMISSIONS.CHESS_BROADCAST_READ)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "query", name: "live", schema: queryBooleanSchema },
    ],
    response: baseResponse(chessBroadcastGameViewSchema),
  })
  async getGameView(
    @Param("id") id: UUIDType,
    @Query("live") live: boolean | "true" | "false" | undefined,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.chessBroadcastService.getGameView(user, id, parseQueryBoolean(live)),
    );
  }
}
