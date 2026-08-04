import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { chessLearnProgress } from "src/storage/schema";

export type ChessLearnProgressRow = {
  stageId: string;
  levelId: string;
  bestScore: number;
  bestStars: number;
  bestMovesUsed: number | null;
  attemptCount: number;
};

@Injectable()
export class ChessLearnRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async listProgressForUser(userId: UUIDType): Promise<ChessLearnProgressRow[]> {
    return this.db
      .select({
        stageId: chessLearnProgress.stageId,
        levelId: chessLearnProgress.levelId,
        bestScore: chessLearnProgress.bestScore,
        bestStars: chessLearnProgress.bestStars,
        bestMovesUsed: chessLearnProgress.bestMovesUsed,
        attemptCount: chessLearnProgress.attemptCount,
      })
      .from(chessLearnProgress)
      .where(eq(chessLearnProgress.userId, userId));
  }

  async getLevelProgress(
    userId: UUIDType,
    stageId: string,
    levelId: string,
  ): Promise<ChessLearnProgressRow | null> {
    const [row] = await this.db
      .select({
        stageId: chessLearnProgress.stageId,
        levelId: chessLearnProgress.levelId,
        bestScore: chessLearnProgress.bestScore,
        bestStars: chessLearnProgress.bestStars,
        bestMovesUsed: chessLearnProgress.bestMovesUsed,
        attemptCount: chessLearnProgress.attemptCount,
      })
      .from(chessLearnProgress)
      .where(
        and(
          eq(chessLearnProgress.userId, userId),
          eq(chessLearnProgress.stageId, stageId),
          eq(chessLearnProgress.levelId, levelId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  /**
   * Always increments attemptCount. On correct attempts, updates best score/stars
   * only when the new score is strictly greater (best-only).
   */
  async recordAttempt(params: {
    userId: UUIDType;
    stageId: string;
    levelId: string;
    correct: boolean;
    score: number;
    stars: number;
    movesUsed: number;
  }): Promise<ChessLearnProgressRow> {
    const { userId, stageId, levelId, correct, score, stars, movesUsed } = params;

    // Incorrect attempts still count toward attemptCount, but never raise score/stars.
    // completedAt stays set on first insert (including wrong tries) — completion is
    // derived from bestStars >= 1, not from row presence.
    const [row] = await this.db
      .insert(chessLearnProgress)
      .values({
        userId,
        stageId,
        levelId,
        bestScore: correct ? score : 0,
        bestStars: correct ? stars : 0,
        bestMovesUsed: correct ? movesUsed : null,
        attemptCount: 1,
      })
      .onConflictDoUpdate({
        target: [chessLearnProgress.userId, chessLearnProgress.stageId, chessLearnProgress.levelId],
        set: {
          attemptCount: sql`${chessLearnProgress.attemptCount} + 1`,
          ...(correct
            ? {
                bestScore: sql`GREATEST(${chessLearnProgress.bestScore}, ${score})`,
                bestStars: sql`GREATEST(${chessLearnProgress.bestStars}, ${stars})`,
                bestMovesUsed: sql`CASE
            WHEN ${chessLearnProgress.bestScore} < ${score} THEN ${movesUsed}
            WHEN ${chessLearnProgress.bestMovesUsed} IS NULL THEN ${movesUsed}
            ELSE LEAST(${chessLearnProgress.bestMovesUsed}, ${movesUsed})
          END`,
              }
            : {}),
          updatedAt: sql`now()`,
        },
      })
      .returning({
        stageId: chessLearnProgress.stageId,
        levelId: chessLearnProgress.levelId,
        bestScore: chessLearnProgress.bestScore,
        bestStars: chessLearnProgress.bestStars,
        bestMovesUsed: chessLearnProgress.bestMovesUsed,
        attemptCount: chessLearnProgress.attemptCount,
      });

    return row;
  }
}
