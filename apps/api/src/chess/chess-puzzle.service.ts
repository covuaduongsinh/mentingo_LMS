import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CHESS_PUZZLE_DIFFICULTY_DELTAS,
  CHESS_RATING_CATEGORIES,
  type ChessMotif,
} from "@repo/shared";

import { ChessPuzzleRepository, type PuzzleImportRow } from "./chess-puzzle.repository";
import { createDefaultRating, updateRating } from "./glicko/glicko2";
import { uciMoveSequencesEqual } from "./utils/chess-moves.utils";

import type { ChessPuzzleDifficulty } from "./schemas/chess-puzzle.schema";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

const MAX_WIDEN_ATTEMPTS = 4;

@Injectable()
export class ChessPuzzleService {
  constructor(private readonly repository: ChessPuzzleRepository) {}

  private async getRatingOrDefault(userId: UUIDType) {
    const rating = await this.repository.getOrCreateRating(userId);
    return (
      rating ?? {
        ...createDefaultRating(),
        userId,
        category: CHESS_RATING_CATEGORIES.PUZZLE,
        gamesPlayed: 0,
      }
    );
  }

  async getNextPuzzle(
    user: CurrentUserType,
    difficulty: ChessPuzzleDifficulty,
    motif?: ChessMotif,
  ) {
    const rating = await this.getRatingOrDefault(user.userId);
    let delta = CHESS_PUZZLE_DIFFICULTY_DELTAS[difficulty];

    for (let attempt = 0; attempt < MAX_WIDEN_ATTEMPTS; attempt++) {
      const puzzle = await this.repository.findAdaptivePuzzle({
        userId: user.userId,
        targetRating: rating.rating,
        delta,
        motif,
      });
      if (puzzle) {
        const { solutionUci: _solutionUci, ...withoutSolution } = puzzle;
        return withoutSolution;
      }
      delta *= 2;
    }
    return null;
  }

  async getDailyPuzzle() {
    const today = new Date().toISOString().slice(0, 10);
    const puzzle = await this.repository.getDailyPuzzle(today);
    if (!puzzle) return null;
    const { solutionUci: _solutionUci, ...withoutSolution } = puzzle;
    return withoutSolution;
  }

  async submitAttempt(user: CurrentUserType, puzzleId: UUIDType, movesUci: string[]) {
    const puzzle = await this.repository.getPuzzleById(puzzleId);
    if (!puzzle) {
      throw new NotFoundException("chess.puzzle.errors.puzzleNotFound");
    }
    if (movesUci.length === 0) {
      throw new BadRequestException("chess.puzzle.errors.emptySubmission");
    }

    const correct = uciMoveSequencesEqual(puzzle.solutionUci, movesUci, { exactLength: true });

    const userRating = await this.getRatingOrDefault(user.userId);
    const puzzleRating = {
      rating: puzzle.rating,
      ratingDeviation: puzzle.ratingDeviation,
      volatility: puzzle.volatility,
    };

    const newUserRating = updateRating(userRating, [
      { opponent: puzzleRating, score: correct ? 1 : 0 },
    ]);
    const newPuzzleRating = updateRating(puzzleRating, [
      { opponent: userRating, score: correct ? 0 : 1 },
    ]);

    await this.repository.saveRating(
      user.userId,
      CHESS_RATING_CATEGORIES.PUZZLE,
      newUserRating,
      true,
    );
    await this.repository.updatePuzzleRating(puzzleId, newPuzzleRating);
    await this.repository.createAttempt({
      puzzleId,
      userId: user.userId,
      correct,
      userRatingBefore: userRating.rating,
      userRatingAfter: newUserRating.rating,
      puzzleRatingBefore: puzzleRating.rating,
      puzzleRatingAfter: newPuzzleRating.rating,
    });

    const savedRating = await this.repository.getOrCreateRating(user.userId);

    return {
      correct,
      solutionUci: puzzle.solutionUci,
      userRatingBefore: userRating.rating,
      userRatingAfter: newUserRating.rating,
      rating: savedRating,
    };
  }

  async getMistakes(user: CurrentUserType) {
    const rows = await this.repository.getMistakes(user.userId);
    return rows.map((row) => {
      const { solutionUci: _solutionUci, ...withoutSolution } = row.puzzle;
      return withoutSolution;
    });
  }

  async getDashboard(userId: UUIDType) {
    const [rating, ratingHistory, themeStats] = await Promise.all([
      this.getRatingOrDefault(userId),
      this.repository.getRatingHistory(userId, CHESS_RATING_CATEGORIES.PUZZLE),
      this.repository.getThemeStats(userId),
    ]);

    const stats = themeStats.map((row) => ({
      motif: row.motif as ChessMotif,
      attempts: row.attempts,
      correct: row.correct,
      accuracy: row.attempts > 0 ? row.correct / row.attempts : 0,
    }));

    const totalAttempts = stats.reduce((sum, row) => sum + row.attempts, 0);
    const totalCorrect = stats.reduce((sum, row) => sum + row.correct, 0);
    const averageAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;

    const weakMotifs = stats
      .filter((row) => row.attempts - row.correct >= 3 && row.accuracy < averageAccuracy)
      .sort((a, b) => a.accuracy - b.accuracy)
      .map((row) => row.motif);

    const strongMotifs = stats
      .filter((row) => row.attempts >= 3)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5)
      .map((row) => row.motif);

    return {
      rating,
      ratingHistory: ratingHistory.map((row) => ({
        rating: row.rating,
        recordedAt: row.recordedAt,
      })),
      themeStats: stats,
      weakMotifs,
      strongMotifs,
    };
  }

  async importPuzzles(rows: PuzzleImportRow[]) {
    return this.repository.bulkInsertPuzzles(rows, "lichess_cc0");
  }
}
