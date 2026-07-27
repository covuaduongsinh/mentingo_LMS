import { Inject, Injectable } from "@nestjs/common";
import { asc, eq, inArray, isNotNull } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import {
  chessBroadcastGameMoves,
  chessBroadcastGames,
  chessBroadcastRounds,
  chessBroadcastTeams,
  chessBroadcasts,
} from "src/storage/schema";

import type { ChessBroadcastStatus } from "@repo/shared";

export type NewBroadcastRow = {
  name: string;
  description?: string;
  delayMinutes?: number;
  createdByUserId: UUIDType;
  tenantId: UUIDType;
};

export type NewRoundRow = {
  broadcastId: UUIDType;
  name: string;
  displayOrder?: number;
  tenantId: UUIDType;
};

export type NewTeamRow = {
  broadcastId: UUIDType;
  name: string;
  tenantId: UUIDType;
};

export type NewGameRow = {
  roundId: UUIDType;
  boardNumber: number;
  whiteName: string;
  blackName: string;
  whiteTeamId?: UUIDType;
  blackTeamId?: UUIDType;
  pgnSourceUrl?: string;
  tenantId: UUIDType;
};

export type NewGameMoveRow = {
  gameId: UUIDType;
  ply: number;
  uci: string;
  san: string;
  fenAfter: string;
  tenantId: UUIDType;
};

@Injectable()
export class ChessBroadcastRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async createBroadcast(data: NewBroadcastRow) {
    const [broadcast] = await this.db.insert(chessBroadcasts).values(data).returning();
    return broadcast;
  }

  async listBroadcasts() {
    return this.db.select().from(chessBroadcasts).orderBy(asc(chessBroadcasts.createdAt));
  }

  async getBroadcastById(id: UUIDType) {
    const [broadcast] = await this.db
      .select()
      .from(chessBroadcasts)
      .where(eq(chessBroadcasts.id, id));
    return broadcast;
  }

  async updateBroadcast(
    id: UUIDType,
    fields: Partial<{
      name: string;
      description: string | null;
      delayMinutes: number;
      status: ChessBroadcastStatus;
    }>,
  ) {
    const [broadcast] = await this.db
      .update(chessBroadcasts)
      .set(fields)
      .where(eq(chessBroadcasts.id, id))
      .returning();
    return broadcast;
  }

  async createRound(data: NewRoundRow) {
    const [round] = await this.db.insert(chessBroadcastRounds).values(data).returning();
    return round;
  }

  async listRoundsByBroadcast(broadcastId: UUIDType) {
    return this.db
      .select()
      .from(chessBroadcastRounds)
      .where(eq(chessBroadcastRounds.broadcastId, broadcastId))
      .orderBy(asc(chessBroadcastRounds.displayOrder));
  }

  async getRoundById(id: UUIDType) {
    const [round] = await this.db
      .select()
      .from(chessBroadcastRounds)
      .where(eq(chessBroadcastRounds.id, id));
    return round;
  }

  async createTeam(data: NewTeamRow) {
    const [team] = await this.db.insert(chessBroadcastTeams).values(data).returning();
    return team;
  }

  async listTeamsByBroadcast(broadcastId: UUIDType) {
    return this.db
      .select()
      .from(chessBroadcastTeams)
      .where(eq(chessBroadcastTeams.broadcastId, broadcastId));
  }

  async createGame(data: NewGameRow) {
    const [game] = await this.db.insert(chessBroadcastGames).values(data).returning();
    return game;
  }

  async getGameById(id: UUIDType) {
    const [game] = await this.db
      .select()
      .from(chessBroadcastGames)
      .where(eq(chessBroadcastGames.id, id));
    return game;
  }

  async updateGame(
    id: UUIDType,
    fields: Partial<{
      whiteName: string;
      blackName: string;
      whiteTeamId: UUIDType | null;
      blackTeamId: UUIDType | null;
      pgnSourceUrl: string | null;
      result: string | null;
      currentFen: string;
      lastFetchedAt: string;
    }>,
  ) {
    const [game] = await this.db
      .update(chessBroadcastGames)
      .set(fields)
      .where(eq(chessBroadcastGames.id, id))
      .returning();
    return game;
  }

  async listGamesByRoundIds(roundIds: UUIDType[]) {
    if (roundIds.length === 0) return [];
    return this.db
      .select()
      .from(chessBroadcastGames)
      .where(inArray(chessBroadcastGames.roundId, roundIds))
      .orderBy(asc(chessBroadcastGames.boardNumber));
  }

  /** All games (with results) across every round of a broadcast — used for pull-based team standings. */
  async listGamesForBroadcast(broadcastId: UUIDType) {
    const rounds = await this.listRoundsByBroadcast(broadcastId);
    return this.listGamesByRoundIds(rounds.map((round) => round.id));
  }

  /** Every game across every tenant that is configured for cron-based PGN auto-pull on a live broadcast. */
  async listAutoPullGames() {
    return this.db
      .select({
        game: chessBroadcastGames,
        broadcastStatus: chessBroadcasts.status,
      })
      .from(chessBroadcastGames)
      .innerJoin(chessBroadcastRounds, eq(chessBroadcastGames.roundId, chessBroadcastRounds.id))
      .innerJoin(chessBroadcasts, eq(chessBroadcastRounds.broadcastId, chessBroadcasts.id))
      .where(isNotNull(chessBroadcastGames.pgnSourceUrl));
  }

  async getGameMoves(gameId: UUIDType) {
    return this.db
      .select()
      .from(chessBroadcastGameMoves)
      .where(eq(chessBroadcastGameMoves.gameId, gameId))
      .orderBy(asc(chessBroadcastGameMoves.ply));
  }

  async insertGameMoves(rows: NewGameMoveRow[]) {
    if (rows.length === 0) return;
    await this.db.insert(chessBroadcastGameMoves).values(rows);
  }
}
