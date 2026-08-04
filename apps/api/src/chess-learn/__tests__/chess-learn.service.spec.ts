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
      countCompletedLevelsForUsers: jest.fn().mockResolvedValue([]),
      deleteAllForUser: jest.fn().mockResolvedValue(undefined),
      listCoordinateScores: jest.fn().mockResolvedValue([]),
      upsertCoordinateScore: jest.fn().mockResolvedValue({ bestScore: 10, isNewBest: true }),
      ...repositoryOverrides,
    } as unknown as ChessLearnRepository;

    return { service: new ChessLearnService(repository), repository };
  };

  describe("getStages", () => {
    it("returns categories and sequentialLock flag", async () => {
      const { service } = buildService();

      const result = await service.getStages(USER_ID);

      expect(result.stages).toHaveLength(CHESS_LEARN_STAGES.length);
      expect(result.categories.length).toBeGreaterThan(0);
      expect(typeof result.sequentialLock).toBe("boolean");
      expect(result.stages[0].locked).toBe(false);
      expect(result.stages[0]).toMatchObject({
        intro: expect.anything(),
        complete: expect.anything(),
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

      const result = await service.getStages(USER_ID);

      expect(result.stages.find((stage) => stage.id === FIRST_STAGE.id)?.completedLevels).toBe(1);
    });
  });

  describe("getLevelContent", () => {
    it("throws NotFoundException for an unknown stage or level", async () => {
      const { service } = buildService();

      await expect(
        service.getLevelContent("no-such-stage", "no-such-level", USER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns public fields without solution", async () => {
      const { service } = buildService();

      const content = await service.getLevelContent(FIRST_STAGE.id, FIRST_LEVEL.id, USER_ID);

      expect(content.id).toBe(FIRST_LEVEL.id);
      expect(content).not.toHaveProperty("solutionUci");
      expect(content.locked).toBe(false);
    });
  });

  describe("submitAttempt", () => {
    it("records progress and returns score/stars for a matching solution", async () => {
      const { service, repository } = buildService();

      const result = await service.submitAttempt(USER_ID, FIRST_STAGE.id, FIRST_LEVEL.id, [
        FIRST_LEVEL.solutionUci[0],
      ]);

      expect(result.correct).toBe(true);
      expect(result.stars).toBeGreaterThanOrEqual(1);
      expect(repository.recordAttempt).toHaveBeenCalled();
    });

    it("does not mark stars for an incorrect move", async () => {
      const { service } = buildService();

      const result = await service.submitAttempt(USER_ID, FIRST_STAGE.id, FIRST_LEVEL.id, ["a1a2"]);

      expect(result.correct).toBe(false);
      expect(result.stars).toBe(0);
    });
  });

  describe("reset and completion", () => {
    it("resets progress for the user", async () => {
      const { service, repository } = buildService();
      await service.resetProgress(USER_ID);
      expect(repository.deleteAllForUser).toHaveBeenCalledWith(USER_ID);
    });

    it("aggregates completion percent", async () => {
      const { service, repository } = buildService({
        countCompletedLevelsForUsers: jest
          .fn()
          .mockResolvedValue([{ userId: USER_ID, completedLevels: 2 }]),
      });

      const summary = await service.getCompletionForUsers([USER_ID]);
      expect(summary.totalLevels).toBeGreaterThan(0);
      expect(summary.byUserId[0].completedLevels).toBe(2);
      expect(summary.byUserId[0].percent).toBeGreaterThan(0);
      expect(repository.countCompletedLevelsForUsers).toHaveBeenCalled();
    });
  });

  describe("coordinate scores", () => {
    it("submits a coordinate high score", async () => {
      const { service, repository } = buildService();
      const result = await service.submitCoordinateScore(USER_ID, "find", "white", 12);
      expect(result.bestScore).toBe(10);
      expect(repository.upsertCoordinateScore).toHaveBeenCalledWith(USER_ID, "find", "white", 12);
    });
  });
});
