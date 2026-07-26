import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Response } from "express";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema, type UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";

import { ChessTournamentService } from "./chess-tournament.service";
import {
  arenaPairNextResponseSchema,
  bulkPairingResponseSchema,
  joinTournamentResponseSchema,
} from "./schemas/chess-tournament-response.schema";
import {
  bulkPairingBodySchema,
  chessTournamentSchema,
  chessTournamentStandingsResponseSchema,
  createTournamentBodySchema,
  type BulkPairingBody,
  type CreateTournamentBody,
} from "./schemas/chess-tournament.schema";

@Controller("chess-tournament")
export class ChessTournamentController {
  constructor(private readonly chessTournamentService: ChessTournamentService) {}

  @Post("bulk-pairing")
  @RequirePermission(PERMISSIONS.CHESS_TOURNAMENT_CREATE)
  @Validate({
    request: [{ type: "body", schema: bulkPairingBodySchema }],
    response: baseResponse(bulkPairingResponseSchema),
  })
  async bulkPairing(@Body() body: BulkPairingBody, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessTournamentService.bulkPairing(user, body));
  }

  @Post()
  @RequirePermission(PERMISSIONS.CHESS_TOURNAMENT_CREATE)
  @Validate({
    request: [{ type: "body", schema: createTournamentBodySchema }],
    response: baseResponse(chessTournamentSchema),
  })
  async createTournament(@Body() body: CreateTournamentBody, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessTournamentService.createTournament(user, body));
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.CHESS_TOURNAMENT_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessTournamentSchema),
  })
  async getTournament(@Param("id") id: UUIDType) {
    return new BaseResponse(await this.chessTournamentService.getTournament(id));
  }

  @Post(":id/join")
  @RequirePermission(PERMISSIONS.CHESS_TOURNAMENT_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(joinTournamentResponseSchema),
  })
  async joinTournament(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    await this.chessTournamentService.joinTournament(user, id);
    return new BaseResponse({ success: true });
  }

  @Post(":id/start")
  @RequirePermission(PERMISSIONS.CHESS_TOURNAMENT_MANAGE)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessTournamentSchema),
  })
  async startTournament(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessTournamentService.startTournament(user, id));
  }

  @Post(":id/next-round")
  @RequirePermission(PERMISSIONS.CHESS_TOURNAMENT_MANAGE)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessTournamentSchema),
  })
  async generateNextRound(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessTournamentService.generateNextRound(user, id));
  }

  @Post(":id/arena/pair-next")
  @RequirePermission(PERMISSIONS.CHESS_TOURNAMENT_MANAGE)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(arenaPairNextResponseSchema),
  })
  async pairNextArena(@Param("id") id: UUIDType, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.chessTournamentService.pairNextArena(user, id));
  }

  @Get(":id/standings")
  @RequirePermission(PERMISSIONS.CHESS_TOURNAMENT_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(chessTournamentStandingsResponseSchema),
  })
  async getStandings(@Param("id") id: UUIDType) {
    return new BaseResponse(await this.chessTournamentService.getStandings(id));
  }

  @Get(":id/export/trf")
  @RequirePermission(PERMISSIONS.CHESS_TOURNAMENT_MANAGE)
  async exportTrf(
    @Param("id") id: UUIDType,
    @CurrentUser() user: CurrentUserType,
    @Res() res: Response,
  ): Promise<void> {
    const trf = await this.chessTournamentService.exportTrf(user, id);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="tournament-${id}.trf.txt"`);
    res.send(trf);
  }
}
