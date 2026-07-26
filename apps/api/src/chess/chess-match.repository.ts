import { Inject, Injectable } from "@nestjs/common";
import {
  CHESS_MATCH_STATUSES,
  CHESS_SEEK_STATUSES,
  type ChessColorPreference,
  type ChessMatchEndReason,
  type ChessMatchResult,
} from "@repo/shared";
import { and, asc, count, eq, isNull, lt, or } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { chessMatchMoves, chessMatches, chessSeeks } from "src/storage/schema";

@Injectable()
export class ChessMatchRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async createSeek(data: {
    creatorUserId: UUIDType;
    challengedUserId?: UUIDType;
    timeControlId: string;
    colorPreference: ChessColorPreference;
    rated: boolean;
  }) {
    const [seek] = await this.db.insert(chessSeeks).values(data).returning();
    return seek;
  }

  async listOpenSeeks(viewerId: UUIDType) {
    return this.db
      .select()
      .from(chessSeeks)
      .where(
        and(
          eq(chessSeeks.status, CHESS_SEEK_STATUSES.PENDING),
          or(isNull(chessSeeks.challengedUserId), eq(chessSeeks.challengedUserId, viewerId)),
        ),
      )
      .orderBy(asc(chessSeeks.createdAt));
  }

  async getSeekById(id: UUIDType) {
    const [seek] = await this.db.select().from(chessSeeks).where(eq(chessSeeks.id, id));
    return seek;
  }

  async markSeekMatched(id: UUIDType, matchId: UUIDType) {
    await this.db
      .update(chessSeeks)
      .set({ status: CHESS_SEEK_STATUSES.MATCHED, matchId })
      .where(eq(chessSeeks.id, id));
  }

  async markSeekStatus(id: UUIDType, status: "cancelled" | "expired") {
    await this.db.update(chessSeeks).set({ status }).where(eq(chessSeeks.id, id));
  }

  async expireStaleSeeks(olderThan: Date) {
    await this.db
      .update(chessSeeks)
      .set({ status: CHESS_SEEK_STATUSES.EXPIRED })
      .where(
        and(
          eq(chessSeeks.status, CHESS_SEEK_STATUSES.PENDING),
          lt(chessSeeks.createdAt, olderThan.toISOString()),
        ),
      );
  }

  async createMatch(data: {
    whiteUserId: UUIDType;
    blackUserId: UUIDType;
    timeControlId: string;
    rated: boolean;
    whiteTimeRemainingMs: number;
    blackTimeRemainingMs: number;
  }) {
    const [match] = await this.db.insert(chessMatches).values(data).returning();
    return match;
  }

  async getMatchById(id: UUIDType) {
    const [match] = await this.db.select().from(chessMatches).where(eq(chessMatches.id, id));
    return match;
  }

  async getMoveCount(matchId: UUIDType) {
    const [row] = await this.db
      .select({ total: count() })
      .from(chessMatchMoves)
      .where(eq(chessMatchMoves.matchId, matchId));
    return row?.total ?? 0;
  }

  async getMatchMoves(matchId: UUIDType) {
    return this.db
      .select()
      .from(chessMatchMoves)
      .where(eq(chessMatchMoves.matchId, matchId))
      .orderBy(asc(chessMatchMoves.ply));
  }

  async appendMoveAndUpdateClock(data: {
    matchId: UUIDType;
    ply: number;
    uci: string;
    san: string;
    fenAfter: string;
    currentFen: string;
    whiteTimeRemainingMs: number;
    blackTimeRemainingMs: number;
    lastMoveAt: Date;
    drawOfferedByUserId: UUIDType | null;
  }) {
    return this.db.transaction(async (trx) => {
      await trx.insert(chessMatchMoves).values({
        matchId: data.matchId,
        ply: data.ply,
        uci: data.uci,
        san: data.san,
        fenAfter: data.fenAfter,
      });
      await trx
        .update(chessMatches)
        .set({
          currentFen: data.currentFen,
          whiteTimeRemainingMs: data.whiteTimeRemainingMs,
          blackTimeRemainingMs: data.blackTimeRemainingMs,
          lastMoveAt: data.lastMoveAt,
          drawOfferedByUserId: data.drawOfferedByUserId,
        })
        .where(eq(chessMatches.id, data.matchId));
    });
  }

  async setDrawOffer(matchId: UUIDType, userId: UUIDType | null) {
    await this.db
      .update(chessMatches)
      .set({ drawOfferedByUserId: userId })
      .where(eq(chessMatches.id, matchId));
  }

  async finishMatch(matchId: UUIDType, result: ChessMatchResult, endReason: ChessMatchEndReason) {
    await this.db
      .update(chessMatches)
      .set({ status: CHESS_MATCH_STATUSES.FINISHED, result, endReason })
      .where(eq(chessMatches.id, matchId));
  }
}
