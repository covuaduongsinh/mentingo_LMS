import { Injectable, NotFoundException } from "@nestjs/common";
import { CHESS_LEARN_STAGES } from "@repo/shared";

import { uciMoveSequencesEqual } from "src/chess/utils/chess-moves.utils";

import { ChessLearnRepository } from "./chess-learn.repository";
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

    return {
      id: level.id,
      fen: level.fen,
      hint: level.hint,
      completed: bestStars >= 1,
      bestStars,
      bestScore: progress?.bestScore ?? 0,
    };
  }

  async submitAttempt(userId: UUIDType, stageId: string, levelId: string, movesUci: string[]) {
    const level = this.findLevelOrThrow(stageId, levelId);

    const correct = level.solutionUci.some((accepted) => uciMoveSequencesEqual(accepted, movesUci));

    // Each accepted solution is one UCI string today; multi-move lines may be space-joined later.
    const optimalPly = Math.max(
      1,
      ...level.solutionUci.map((solution) => {
        const parts = solution.trim().split(/\s+/).filter(Boolean);
        return parts.length > 0 ? parts.length : 1;
      }),
    );

    const movesUsed = movesUci.length;
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

  private findLevelOrThrow(stageId: string, levelId: string) {
    const stage = CHESS_LEARN_STAGES.find((candidate) => candidate.id === stageId);
    const level = stage?.levels.find((candidate) => candidate.id === levelId);

    if (!level) {
      throw new NotFoundException("chessLearn.errors.levelNotFound");
    }

    return level;
  }
}
