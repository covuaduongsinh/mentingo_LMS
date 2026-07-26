import { Injectable, NotFoundException } from "@nestjs/common";
import { CHESS_LEARN_STAGES } from "@repo/shared";

import { uciMoveSequencesEqual } from "src/chess/utils/chess-moves.utils";

import { ChessLearnRepository } from "./chess-learn.repository";

import type { UUIDType } from "src/common";

@Injectable()
export class ChessLearnService {
  constructor(private readonly repository: ChessLearnRepository) {}

  async getStages(userId: UUIDType) {
    const completed = await this.repository.getCompletedLevelKeys(userId);

    return CHESS_LEARN_STAGES.map((stage) => {
      const levels = stage.levels.map((level) => ({
        id: level.id,
        completed: completed.has(`${stage.id}:${level.id}`),
      }));

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
    const completed = await this.repository.isLevelCompleted(userId, stageId, levelId);

    return { id: level.id, fen: level.fen, hint: level.hint, completed };
  }

  async submitAttempt(userId: UUIDType, stageId: string, levelId: string, movesUci: string[]) {
    const level = this.findLevelOrThrow(stageId, levelId);

    const correct = level.solutionUci.some((accepted) => uciMoveSequencesEqual(accepted, movesUci));

    if (correct) {
      await this.repository.markCompleted(userId, stageId, levelId);
    }

    return { correct };
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
