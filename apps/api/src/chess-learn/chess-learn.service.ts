import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CHESS_LEARN_CATEGORIES,
  CHESS_LEARN_SEQUENTIAL_LOCK,
  CHESS_LEARN_STAGES,
  countChessLearnLevels,
  type ChessLearnLevel,
} from "@repo/shared";

import { normalizeUciMoves, uciMoveSequencesEqual } from "src/chess/utils/chess-moves.utils";

import { ChessLearnRepository } from "./chess-learn.repository";
import { gradeClearSide, gradeCollectTargets, gradeScripted } from "./mode-grade.utils";
import { evaluateLearnRule, replayMovesFromFen } from "./rule-eval.utils";
import {
  exactLineMaxScore,
  scoreExactLine,
  scoreWithEvents,
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

    const stages = CHESS_LEARN_STAGES.map((stage, stageIndex) => {
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

      const completedLevels = levels.filter((level) => level.completed).length;
      const locked = this.isStageLocked(stageIndex, byKey);

      return {
        id: stage.id,
        label: stage.label,
        description: stage.description,
        intro: stage.intro ?? null,
        complete: stage.complete ?? null,
        totalLevels: levels.length,
        completedLevels,
        locked,
        levels,
      };
    });

    const stagesById = new Map(stages.map((s) => [s.id, s]));
    const categories = CHESS_LEARN_CATEGORIES.map((category) => ({
      id: category.id,
      label: category.label,
      description: category.description,
      stages: category.stageIds
        .map((id) => stagesById.get(id))
        .filter((s): s is (typeof stages)[number] => s !== undefined),
    }));

    return {
      sequentialLock: CHESS_LEARN_SEQUENTIAL_LOCK,
      stages,
      categories,
    };
  }

  async getLevelContent(stageId: string, levelId: string, userId: UUIDType) {
    const stageIndex = CHESS_LEARN_STAGES.findIndex((s) => s.id === stageId);
    const stage = CHESS_LEARN_STAGES[stageIndex];
    const level = stage?.levels.find((candidate) => candidate.id === levelId);
    if (!stage || !level) {
      throw new NotFoundException("chessLearn.errors.levelNotFound");
    }

    const progressRows = await this.repository.listProgressForUser(userId);
    const byKey = new Map(
      progressRows.map((row) => [`${row.stageId}:${row.levelId}`, row] as const),
    );
    const locked = this.isStageLocked(stageIndex, byKey);
    if (locked) {
      throw new ForbiddenException("chessLearn.errors.stageLocked");
    }

    const progress = await this.repository.getLevelProgress(userId, stageId, levelId);
    const bestStars = (progress?.bestStars ?? 0) as LearnStars;
    const optimalMoves = this.resolveOptimalMoves(level);
    const mode = level.mode ?? "exact_line";

    return {
      id: level.id,
      fen: level.fen,
      hint: level.hint,
      goal: level.goal ?? null,
      mode,
      shapes: level.shapes ?? [],
      targets: level.targets ?? [],
      optimalMoves,
      completed: bestStars >= 1,
      bestStars,
      bestScore: progress?.bestScore ?? 0,
      stageIntro: stage.intro ?? null,
      stageComplete: stage.complete ?? null,
      locked: false,
    };
  }

  async submitAttempt(userId: UUIDType, stageId: string, levelId: string, movesUci: string[]) {
    const stageIndex = CHESS_LEARN_STAGES.findIndex((s) => s.id === stageId);
    const stage = CHESS_LEARN_STAGES[stageIndex];
    const level = stage?.levels.find((candidate) => candidate.id === levelId);
    if (!stage || !level) {
      throw new NotFoundException("chessLearn.errors.levelNotFound");
    }

    const progressRows = await this.repository.listProgressForUser(userId);
    const byKey = new Map(
      progressRows.map((row) => [`${row.stageId}:${row.levelId}`, row] as const),
    );
    if (this.isStageLocked(stageIndex, byKey)) {
      throw new ForbiddenException("chessLearn.errors.stageLocked");
    }

    const mode = level.mode ?? "exact_line";
    const optimalPly = this.resolveOptimalMoves(level);
    const movesUsed = movesUci.length;

    let correct = false;
    let score = 0;
    let maxScore = exactLineMaxScore(optimalPly);

    switch (mode) {
      case "predicate": {
        correct = this.gradePredicate(level, movesUci);
        score = correct ? scoreExactLine(movesUsed, optimalPly) : 0;
        break;
      }
      case "collect_targets": {
        const graded = gradeCollectTargets(level, movesUci);
        correct = graded.correct;
        const scored = scoreWithEvents(
          graded.eventPoints,
          graded.eventMaxPoints,
          movesUsed,
          optimalPly,
          correct,
        );
        score = scored.score;
        maxScore = scored.maxScore;
        break;
      }
      case "clear_side": {
        const graded = gradeClearSide(level, movesUci);
        correct = graded.correct;
        const scored = scoreWithEvents(
          graded.eventPoints,
          graded.eventMaxPoints,
          movesUsed,
          optimalPly,
          correct,
        );
        score = scored.score;
        maxScore = scored.maxScore;
        break;
      }
      case "scripted": {
        const graded = gradeScripted(level, movesUci);
        correct = graded.correct;
        const scored = scoreWithEvents(
          graded.eventPoints,
          graded.eventMaxPoints,
          movesUsed,
          optimalPly,
          correct,
        );
        score = scored.score;
        maxScore = scored.maxScore;
        break;
      }
      case "exact_line":
      default: {
        correct = level.solutionUci.some((accepted) => uciMoveSequencesEqual(accepted, movesUci));
        score = correct ? scoreExactLine(movesUsed, optimalPly) : 0;
        break;
      }
    }

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

  async getCompletionForUsers(userIds: UUIDType[]) {
    const totalLevels = countChessLearnLevels();
    const rows = await this.repository.countCompletedLevelsForUsers(userIds);
    const byUser = new Map(rows.map((r) => [r.userId, r.completedLevels]));

    return {
      totalLevels,
      completedLevels: 0,
      percent: 0,
      byUserId: userIds.map((userId) => {
        const completedLevels = byUser.get(userId) ?? 0;
        const percent =
          totalLevels === 0 ? 0 : Math.min(100, Math.round((completedLevels * 100) / totalLevels));
        return { userId, completedLevels, percent };
      }),
    };
  }

  async resetProgress(userId: UUIDType) {
    await this.repository.deleteAllForUser(userId);
    return { ok: true as const };
  }

  async getCoordinateHighScores(userId: UUIDType) {
    const rows = await this.repository.listCoordinateScores(userId);
    return {
      scores: rows.map((row) => ({
        mode: row.mode,
        orientation: row.orientation,
        bestScore: row.bestScore,
        updatedAt: row.updatedAt ?? null,
      })),
    };
  }

  async submitCoordinateScore(
    userId: UUIDType,
    mode: "find" | "name",
    orientation: "white" | "black",
    score: number,
  ) {
    return this.repository.upsertCoordinateScore(userId, mode, orientation, score);
  }

  private isStageLocked(stageIndex: number, byKey: Map<string, { bestStars: number }>): boolean {
    if (!CHESS_LEARN_SEQUENTIAL_LOCK || stageIndex <= 0) {
      return false;
    }

    for (let i = 0; i < stageIndex; i++) {
      const stage = CHESS_LEARN_STAGES[i];
      const allDone = stage.levels.every((level) => {
        const progress = byKey.get(`${stage.id}:${level.id}`);
        return (progress?.bestStars ?? 0) >= 1;
      });
      if (!allDone) return true;
    }
    return false;
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

    if (level.mode === "collect_targets" && level.targets?.length) {
      return level.targets.length;
    }

    if (level.mode === "scripted" && level.scriptSteps?.length) {
      return Math.max(1, level.scriptSteps.filter((s) => s.actor === "player").length);
    }

    const fromSolutions = level.solutionUci.map((solution) => {
      const parts = normalizeUciMoves(solution);
      return parts.length > 0 ? parts.length : 1;
    });

    return Math.max(1, ...fromSolutions, 1);
  }
}
