import { Inject, Injectable } from "@nestjs/common";
import { CHESS_MATCH_STATUSES } from "@repo/shared";
import { and, asc, avg, count, eq, inArray, or, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { chessGameInsights, chessMatches } from "src/storage/schema";

export type ChessInsightInsertRow = typeof chessGameInsights.$inferInsert;

@Injectable()
export class ChessInsightRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async deleteByMatch(matchId: UUIDType) {
    await this.db.delete(chessGameInsights).where(eq(chessGameInsights.matchId, matchId));
  }

  async bulkInsert(rows: ChessInsightInsertRow[]) {
    if (rows.length === 0) return;
    await this.db.insert(chessGameInsights).values(rows);
  }

  async getMatchReport(matchId: UUIDType) {
    return this.db
      .select()
      .from(chessGameInsights)
      .where(eq(chessGameInsights.matchId, matchId))
      .orderBy(asc(chessGameInsights.ply));
  }

  async getOverallStats(userId: UUIDType) {
    const [row] = await this.db
      .select({
        moveCount: count(),
        avgAccuracy: avg(chessGameInsights.accuracy),
        avgCentipawnLoss: avg(chessGameInsights.centipawnLoss),
      })
      .from(chessGameInsights)
      .where(eq(chessGameInsights.userId, userId));
    return row;
  }

  async getPhaseStats(userId: UUIDType) {
    return this.db
      .select({
        phase: chessGameInsights.phase,
        moveCount: count(),
        avgAccuracy: avg(chessGameInsights.accuracy),
        avgCentipawnLoss: avg(chessGameInsights.centipawnLoss),
        avgThinkTimeMs: avg(chessGameInsights.thinkTimeMs),
      })
      .from(chessGameInsights)
      .where(eq(chessGameInsights.userId, userId))
      .groupBy(chessGameInsights.phase);
  }

  async getPieceTypeStats(userId: UUIDType) {
    return this.db
      .select({
        pieceType: chessGameInsights.pieceType,
        moveCount: count(),
        avgAccuracy: avg(chessGameInsights.accuracy),
        avgCentipawnLoss: avg(chessGameInsights.centipawnLoss),
      })
      .from(chessGameInsights)
      .where(eq(chessGameInsights.userId, userId))
      .groupBy(chessGameInsights.pieceType);
  }

  async getOpeningStats(userId: UUIDType) {
    const result = await this.db.execute(sql`
      SELECT
        opening_key AS "openingKey",
        COUNT(DISTINCT match_id)::int AS "gameCount",
        AVG(accuracy)::float AS "avgAccuracy"
      FROM ${chessGameInsights}
      WHERE user_id = ${userId} AND opening_key <> 'unclassified'
      GROUP BY opening_key
    `);
    return result as unknown as { openingKey: string; gameCount: number; avgAccuracy: number }[];
  }

  /** Finished, analyzed matches this user played in — for the recovery/conversion/time-management metrics. */
  async getAnalyzedMatchesForUser(userId: UUIDType) {
    return this.db
      .select({
        id: chessMatches.id,
        whiteUserId: chessMatches.whiteUserId,
        blackUserId: chessMatches.blackUserId,
        result: chessMatches.result,
        endReason: chessMatches.endReason,
      })
      .from(chessMatches)
      .where(
        and(
          eq(chessMatches.status, CHESS_MATCH_STATUSES.FINISHED),
          or(eq(chessMatches.whiteUserId, userId), eq(chessMatches.blackUserId, userId)),
          sql`EXISTS (SELECT 1 FROM ${chessGameInsights} gi WHERE gi.match_id = ${chessMatches.id})`,
        ),
      );
  }

  /** All insight rows (both players) for a set of matches, ordered so trajectories can be replayed. */
  async getInsightRowsForMatches(matchIds: UUIDType[]) {
    if (matchIds.length === 0) return [];
    return this.db
      .select({
        matchId: chessGameInsights.matchId,
        userId: chessGameInsights.userId,
        ply: chessGameInsights.ply,
        evaluationCpAfter: chessGameInsights.evaluationCpAfter,
      })
      .from(chessGameInsights)
      .where(inArray(chessGameInsights.matchId, matchIds))
      .orderBy(asc(chessGameInsights.matchId), asc(chessGameInsights.ply));
  }

  async getTenantAverageAccuracy() {
    const [row] = await this.db
      .select({ avgAccuracy: avg(chessGameInsights.accuracy) })
      .from(chessGameInsights);
    return row?.avgAccuracy ?? null;
  }
}
