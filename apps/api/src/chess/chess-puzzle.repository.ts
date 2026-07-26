import { Inject, Injectable } from "@nestjs/common";
import { CHESS_RATING_CATEGORIES, type ChessMotif, type ChessRatingCategory } from "@repo/shared";
import { and, asc, desc, eq, gte, lte, notInArray, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import {
  chessPuzzleAttempts,
  chessPuzzles,
  chessRatingHistory,
  chessRatings,
} from "src/storage/schema";

import type { GlickoRating } from "./glicko/glicko2";

export type PuzzleImportRow = {
  fen: string;
  solutionUci: string[];
  rating: number;
  ratingDeviation: number;
  motifs: ChessMotif[];
  popularity: number | null;
};

export type AdaptivePuzzleParams = {
  userId: UUIDType;
  targetRating: number;
  delta: number;
  motif?: ChessMotif;
};

@Injectable()
export class ChessPuzzleRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async getOrCreateRating(
    userId: UUIDType,
    category: ChessRatingCategory = CHESS_RATING_CATEGORIES.PUZZLE,
  ) {
    const [existing] = await this.db
      .select()
      .from(chessRatings)
      .where(and(eq(chessRatings.userId, userId), eq(chessRatings.category, category)));
    if (existing) return existing;

    const [created] = await this.db
      .insert(chessRatings)
      .values({ userId, category })
      .onConflictDoNothing({ target: [chessRatings.userId, chessRatings.category] })
      .returning();
    if (created) return created;

    const [row] = await this.db
      .select()
      .from(chessRatings)
      .where(and(eq(chessRatings.userId, userId), eq(chessRatings.category, category)));
    return row;
  }

  async saveRating(
    userId: UUIDType,
    category: ChessRatingCategory,
    rating: GlickoRating,
    incrementGamesPlayed: boolean,
  ) {
    await this.db
      .update(chessRatings)
      .set({
        rating: rating.rating,
        ratingDeviation: rating.ratingDeviation,
        volatility: rating.volatility,
        ...(incrementGamesPlayed ? { gamesPlayed: sql`${chessRatings.gamesPlayed} + 1` } : {}),
      })
      .where(and(eq(chessRatings.userId, userId), eq(chessRatings.category, category)));

    await this.db.insert(chessRatingHistory).values({
      userId,
      category,
      rating: rating.rating,
      ratingDeviation: rating.ratingDeviation,
      volatility: rating.volatility,
    });
  }

  async getRatingHistory(userId: UUIDType, category: ChessRatingCategory, limit = 100) {
    return this.db
      .select({
        rating: chessRatingHistory.rating,
        recordedAt: chessRatingHistory.createdAt,
      })
      .from(chessRatingHistory)
      .where(and(eq(chessRatingHistory.userId, userId), eq(chessRatingHistory.category, category)))
      .orderBy(desc(chessRatingHistory.createdAt))
      .limit(limit);
  }

  async getPuzzleById(id: UUIDType) {
    const [puzzle] = await this.db.select().from(chessPuzzles).where(eq(chessPuzzles.id, id));
    return puzzle;
  }

  async findAdaptivePuzzle(params: AdaptivePuzzleParams) {
    const solvedCorrectlyIds = this.db
      .select({ puzzleId: chessPuzzleAttempts.puzzleId })
      .from(chessPuzzleAttempts)
      .where(
        and(eq(chessPuzzleAttempts.userId, params.userId), eq(chessPuzzleAttempts.correct, true)),
      );

    const conditions = [
      gte(chessPuzzles.rating, params.targetRating - params.delta),
      lte(chessPuzzles.rating, params.targetRating + params.delta),
      notInArray(chessPuzzles.id, solvedCorrectlyIds),
    ];
    if (params.motif) {
      conditions.push(sql`${params.motif} = ANY(${chessPuzzles.motifs})`);
    }

    const [puzzle] = await this.db
      .select()
      .from(chessPuzzles)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    return puzzle;
  }

  /** Deterministic per (tenant scope is implicit via RLS) calendar day — same puzzle for everyone all day. */
  async getDailyPuzzle(dateSeed: string) {
    const [{ total }] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(chessPuzzles);
    if (!total) return undefined;

    const offset = Array.from(dateSeed).reduce(
      (acc, char) => (acc * 31 + char.charCodeAt(0)) % total,
      0,
    );
    const [puzzle] = await this.db.select().from(chessPuzzles).offset(offset).limit(1);
    return puzzle;
  }

  async createAttempt(data: {
    puzzleId: UUIDType;
    userId: UUIDType;
    correct: boolean;
    userRatingBefore: number;
    userRatingAfter: number;
    puzzleRatingBefore: number;
    puzzleRatingAfter: number;
  }) {
    const [attempt] = await this.db.insert(chessPuzzleAttempts).values(data).returning();
    return attempt;
  }

  async updatePuzzleRating(puzzleId: UUIDType, rating: GlickoRating) {
    await this.db
      .update(chessPuzzles)
      .set({
        rating: rating.rating,
        ratingDeviation: rating.ratingDeviation,
        volatility: rating.volatility,
      })
      .where(eq(chessPuzzles.id, puzzleId));
  }

  /** Puzzles the user has gotten wrong at least once and has not since solved correctly. */
  async getMistakes(userId: UUIDType, limit = 20) {
    return this.db
      .select({
        puzzle: chessPuzzles,
        lastAttemptAt: sql<string>`MAX(${chessPuzzleAttempts.createdAt})`,
      })
      .from(chessPuzzleAttempts)
      .innerJoin(chessPuzzles, eq(chessPuzzleAttempts.puzzleId, chessPuzzles.id))
      .where(
        and(
          eq(chessPuzzleAttempts.userId, userId),
          sql`NOT EXISTS (
            SELECT 1 FROM ${chessPuzzleAttempts} AS later
            WHERE later.puzzle_id = ${chessPuzzleAttempts.puzzleId}
              AND later.user_id = ${userId}
              AND later.correct = true
          )`,
        ),
      )
      .groupBy(chessPuzzles.id)
      .orderBy(asc(sql`MAX(${chessPuzzleAttempts.createdAt})`))
      .limit(limit);
  }

  async getThemeStats(userId: UUIDType) {
    const result = await this.db.execute(sql`
      SELECT
        motif,
        COUNT(*)::int AS attempts,
        SUM(CASE WHEN a.correct THEN 1 ELSE 0 END)::int AS correct
      FROM ${chessPuzzleAttempts} a
      INNER JOIN ${chessPuzzles} p ON p.id = a.puzzle_id
      CROSS JOIN LATERAL UNNEST(p.motifs) AS motif
      WHERE a.user_id = ${userId}
      GROUP BY motif
    `);
    return result as unknown as { motif: string; attempts: number; correct: number }[];
  }

  async bulkInsertPuzzles(rows: PuzzleImportRow[], source: "original" | "lichess_cc0") {
    if (rows.length === 0) return 0;
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((row) => ({ ...row, source }));
      await this.db.insert(chessPuzzles).values(batch);
      inserted += batch.length;
    }
    return inserted;
  }
}
