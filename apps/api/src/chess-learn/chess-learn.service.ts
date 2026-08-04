import { Injectable, NotFoundException } from "@nestjs/common";
import { CHESS_LEARN_STAGES, type ChessLearnLevel } from "@repo/shared";

import { normalizeUciMoves, uciMoveSequencesEqual } from "src/chess/utils/chess-moves.utils";

import { ChessLearnRepository } from "./chess-learn.repository";
import { evaluateLearnRule, replayMovesFromFen } from "./rule-eval.utils";
import {
  exactLineMaxScore,
  scoreExactLine,
  starsFromScore,
  type LearnStars,
} from "./scoring.utils";

import type { UUIDType } from "src/common";

@Injectable()
export class ChessLearnService {
  constructor(private readonly repository: ChessLearnRepository) {}

  async getStages(userId: UUIDType) {
    const progressRows = await this.repository.listProgressForUser(userId);
    const byKey = new Map(
      progressRows.map((row) => [`${row.stageId}:${row.levelId}`, row] as const),
    );

    return CHESS_LEARN_STAGES.map((stage) => {
      const levels = stage.levels.map((level) => {
        const progress = byKey.get(`${stage.id}:${level.id}`);
        const bestStars = (progress?.bestStars ?? 0) as LearnStars;
        return {
          id: level.id,
          completed: bestStars >= 1,
          bestStars,
          bestScore: progress?.bestScore ?? 0,
        };
      });

      return {
        id: stage.id,
        label: stage.label,
        description: stage.description,
        totalLevels: levels.length,
        completedLevels: levels.filter((level) => level.completed).length,
        levels,
      };
    });
  }

  async getLevelContent(stageId: string, levelId: string, userId: UUIDType) {
    const level = this.findLevelOrThrow(stageId, levelId);
    const progress = await this.repository.getLevelProgress(userId, stageId, levelId);
    const bestStars = (progress?.bestStars ?? 0) as LearnStars;
    const optimalMoves = this.resolveOptimalMoves(level);

    return {
      id: level.id,
      fen: level.fen,
      hint: level.hint,
      goal: level.goal ?? null,
      mode: level.mode ?? "exact_line",
      shapes: level.shapes ?? [],
      optimalMoves,
      completed: bestStars >= 1,
      bestStars,
      bestScore: progress?.bestScore ?? 0,
    };
  }

  async submitAttempt(userId: UUIDType, stageId: string, levelId: string, movesUci: string[]) {
    const level = this.findLevelOrThrow(stageId, levelId);
    const mode = level.mode ?? "exact_line";
    const optimalPly = this.resolveOptimalMoves(level);
    const movesUsed = movesUci.length;

    const correct =
      mode === "predicate"
        ? this.gradePredicate(level, movesUci)
        : level.solutionUci.some((accepted) => uciMoveSequencesEqual(accepted, movesUci));

    const maxScore = exactLineMaxScore(optimalPly);
    const score = correct ? scoreExactLine(movesUsed, optimalPly) : 0;
    const stars = correct ? starsFromScore(score, maxScore) : 0;

    const progress = await this.repository.recordAttempt({
      userId,
      stageId,
      levelId,
      correct,
      score,
      stars,
      movesUsed,
    });

    return {
      correct,
      score,
      stars,
      bestScore: progress.bestScore,
      bestStars: progress.bestStars,
    };
  }

  private gradePredicate(level: ChessLearnLevel, movesUci: string[]): boolean {
    if (!level.successRule) {
      return false;
    }

    const replayed = replayMovesFromFen(level.fen, movesUci);
    if (!replayed) {
      return false;
    }

    const { chess, lastMoveUci } = replayed;
    if (level.failureRule && evaluateLearnRule(level.failureRule, chess, lastMoveUci)) {
      return false;
    }

    return evaluateLearnRule(level.successRule, chess, lastMoveUci);
  }

  private resolveOptimalMoves(level: ChessLearnLevel): number {
    if (level.optimalMoves && level.optimalMoves > 0) {
      return level.optimalMoves;
    }

    const fromSolutions = level.solutionUci.map((solution) => {
      const parts = normalizeUciMoves(solution);
      return parts.length > 0 ? parts.length : 1;
    });

    return Math.max(1, ...fromSolutions, 1);
  }

  private findLevelOrThrow(stageId: string, levelId: string) {
    const stage = CHESS_LEARN_STAGES.find((candidate) => candidate.id === stageId);
    const level = stage?.levels.find((candidate) => candidate.id === levelId);

    if (!level) {
      throw new NotFoundException("chessLearn.errors.levelNotFound");
    }

    return level;
  }
}
