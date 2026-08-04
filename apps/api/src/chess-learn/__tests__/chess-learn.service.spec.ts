import { NotFoundException } from "@nestjs/common";
import { CHESS_LEARN_STAGES } from "@repo/shared";

import { ChessLearnService } from "../chess-learn.service";

import type { ChessLearnRepository } from "../chess-learn.repository";

const USER_ID = "user-1";
const FIRST_STAGE = CHESS_LEARN_STAGES[0];
const FIRST_LEVEL = FIRST_STAGE.levels[0];

describe("ChessLearnService", () => {
  const buildService = (repositoryOverrides: Partial<ChessLearnRepository> = {}) => {
    const repository = {
      listProgressForUser: jest.fn().mockResolvedValue([]),
      getLevelProgress: jest.fn().mockResolvedValue(null),
      recordAttempt: jest.fn().mockImplementation(async (params) => ({
        stageId: params.stageId,
        levelId: params.levelId,
        bestScore: params.correct ? params.score : 0,
        bestStars: params.correct ? params.stars : 0,
        bestMovesUsed: params.correct ? params.movesUsed : null,
        attemptCount: 1,
      })),
      ...repositoryOverrides,
    } as unknown as ChessLearnRepository;

    return { service: new ChessLearnService(repository), repository };
  };

  describe("getStages", () => {
    it("reports every curated stage with a completion count of 0 when nothing is completed", async () => {
      const { service } = buildService();

      const stages = await service.getStages(USER_ID);

      expect(stages).toHaveLength(CHESS_LEARN_STAGES.length);
      expect(stages.every((stage) => stage.completedLevels === 0)).toBe(true);
      expect(stages[0].totalLevels).toBe(FIRST_STAGE.levels.length);
      expect(stages[0].levels[0]).toMatchObject({
        bestStars: 0,
        bestScore: 0,
        completed: false,
      });
    });

    it("counts a level as completed when bestStars >= 1", async () => {
      const { service } = buildService({
        listProgressForUser: jest.fn().mockResolvedValue([
          {
            stageId: FIRST_STAGE.id,
            levelId: FIRST_LEVEL.id,
            bestScore: 500,
            bestStars: 3,
            bestMovesUsed: 1,
            attemptCount: 1,
          },
        ]),
      });

      const stages = await service.getStages(USER_ID);

      expect(stages.find((stage) => stage.id === FIRST_STAGE.id)?.completedLevels).toBe(1);
      expect(
        stages
          .find((stage) => stage.id === FIRST_STAGE.id)
          ?.levels.find((level) => level.id === FIRST_LEVEL.id),
      ).toMatchObject({ completed: true, bestStars: 3, bestScore: 500 });
    });
  });

  describe("getLevelContent", () => {
    it("throws NotFoundException for an unknown stage or level", async () => {
      const { service } = buildService();

      await expect(
        service.getLevelContent("no-such-stage", "no-such-level", USER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns the level's public fields without exposing the solution", async () => {
      const { service } = buildService();

      const content = await service.getLevelContent(FIRST_STAGE.id, FIRST_LEVEL.id, USER_ID);

      expect(content.id).toBe(FIRST_LEVEL.id);
      expect(content.fen).toBe(FIRST_LEVEL.fen);
      expect(content.hint).toBe(FIRST_LEVEL.hint);
      expect(content.mode).toBe("exact_line");
      expect(content.optimalMoves).toBeGreaterThanOrEqual(1);
      expect(content.completed).toBe(false);
      expect(content).not.toHaveProperty("solutionUci");
      expect(content).not.toHaveProperty("successRule");
    });
  });

  describe("submitAttempt", () => {
    it("records progress and returns score/stars for a matching solution", async () => {
      const { service, repository } = buildService();

      const result = await service.submitAttempt(USER_ID, FIRST_STAGE.id, FIRST_LEVEL.id, [
        FIRST_LEVEL.solutionUci[0],
      ]);

      expect(result.correct).toBe(true);
      expect(result.score).toBe(500);
      expect(result.stars).toBe(3);
      expect(result.bestScore).toBe(500);
      expect(result.bestStars).toBe(3);
      expect(repository.recordAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          stageId: FIRST_STAGE.id,
          levelId: FIRST_LEVEL.id,
          correct: true,
          score: 500,
          stars: 3,
          movesUsed: 1,
        }),
      );
    });

    it("does not mark stars for an incorrect move", async () => {
      const { service, repository } = buildService();

      const result = await service.submitAttempt(USER_ID, FIRST_STAGE.id, FIRST_LEVEL.id, ["a1a2"]);

      expect(result).toEqual({
        correct: false,
        score: 0,
        stars: 0,
        bestScore: 0,
        bestStars: 0,
      });
      expect(repository.recordAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ correct: false, score: 0, stars: 0 }),
      );
    });

    it("throws NotFoundException for an unknown level", async () => {
      const { service } = buildService();

      await expect(
        service.submitAttempt(USER_ID, "no-such-stage", "no-such-level", ["a1a2"]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
