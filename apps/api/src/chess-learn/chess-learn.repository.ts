import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { chessCoordinateHighScores, chessLearnProgress } from "src/storage/schema";

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

  /** Count levels with bestStars >= 1 for classroom / completion reports. */
  async countCompletedLevelsForUsers(
    userIds: UUIDType[],
  ): Promise<{ userId: string; completedLevels: number }[]> {
    if (!userIds.length) return [];

    const rows = await this.db
      .select({
        userId: chessLearnProgress.userId,
        completedLevels: sql<number>`COUNT(*)::int`,
      })
      .from(chessLearnProgress)
      .where(and(inArray(chessLearnProgress.userId, userIds), gte(chessLearnProgress.bestStars, 1)))
      .groupBy(chessLearnProgress.userId);

    return rows.map((row) => ({
      userId: row.userId,
      completedLevels: row.completedLevels,
    }));
  }

  async deleteAllForUser(userId: UUIDType) {
    await this.db.delete(chessLearnProgress).where(eq(chessLearnProgress.userId, userId));
  }

  async listCoordinateScores(userId: UUIDType) {
    return this.db
      .select({
        mode: chessCoordinateHighScores.mode,
        orientation: chessCoordinateHighScores.orientation,
        bestScore: chessCoordinateHighScores.bestScore,
        updatedAt: chessCoordinateHighScores.updatedAt,
      })
      .from(chessCoordinateHighScores)
      .where(eq(chessCoordinateHighScores.userId, userId));
  }

  async upsertCoordinateScore(
    userId: UUIDType,
    mode: string,
    orientation: string,
    score: number,
  ): Promise<{ bestScore: number; isNewBest: boolean }> {
    const existing = await this.db
      .select({ bestScore: chessCoordinateHighScores.bestScore })
      .from(chessCoordinateHighScores)
      .where(
        and(
          eq(chessCoordinateHighScores.userId, userId),
          eq(chessCoordinateHighScores.mode, mode),
          eq(chessCoordinateHighScores.orientation, orientation),
        ),
      )
      .limit(1);

    const previous = existing[0]?.bestScore ?? 0;
    const isNewBest = score > previous;
    const bestScore = Math.max(previous, score);

    await this.db
      .insert(chessCoordinateHighScores)
      .values({
        userId,
        mode,
        orientation,
        bestScore,
      })
      .onConflictDoUpdate({
        target: [
          chessCoordinateHighScores.userId,
          chessCoordinateHighScores.mode,
          chessCoordinateHighScores.orientation,
        ],
        set: {
          bestScore: sql`GREATEST(${chessCoordinateHighScores.bestScore}, ${score})`,
          updatedAt: sql`now()`,
        },
      });

    return { bestScore, isNewBest };
  }
}
