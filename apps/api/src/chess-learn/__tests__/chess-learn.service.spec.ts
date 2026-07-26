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
      getCompletedLevelKeys: jest.fn().mockResolvedValue(new Set<string>()),
      isLevelCompleted: jest.fn().mockResolvedValue(false),
      markCompleted: jest.fn().mockResolvedValue(undefined),
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
    });

    it("counts a level as completed only when its stage:level key is in the completed set", async () => {
      const { service } = buildService({
        getCompletedLevelKeys: jest
          .fn()
          .mockResolvedValue(new Set([`${FIRST_STAGE.id}:${FIRST_LEVEL.id}`])),
      });

      const stages = await service.getStages(USER_ID);

      expect(stages.find((stage) => stage.id === FIRST_STAGE.id)?.completedLevels).toBe(1);
    });
  });

  describe("getLevelContent", () => {
    it("throws NotFoundException for an unknown stage or level", async () => {
      const { service } = buildService();

      await expect(
        service.getLevelContent("no-such-stage", "no-such-level", USER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns the level's FEN/hint without exposing the solution", async () => {
      const { service } = buildService();

      const content = await service.getLevelContent(FIRST_STAGE.id, FIRST_LEVEL.id, USER_ID);

      expect(content).toEqual({
        id: FIRST_LEVEL.id,
        fen: FIRST_LEVEL.fen,
        hint: FIRST_LEVEL.hint,
        completed: false,
      });
      expect(content).not.toHaveProperty("solutionUci");
    });
  });

  describe("submitAttempt", () => {
    it("marks the level completed and reports correct for a matching solution", async () => {
      const { service, repository } = buildService();

      const result = await service.submitAttempt(USER_ID, FIRST_STAGE.id, FIRST_LEVEL.id, [
        FIRST_LEVEL.solutionUci[0],
      ]);

      expect(result).toEqual({ correct: true });
      expect(repository.markCompleted).toHaveBeenCalledWith(
        USER_ID,
        FIRST_STAGE.id,
        FIRST_LEVEL.id,
      );
    });

    it("does not record progress for an incorrect move", async () => {
      const { service, repository } = buildService();

      const result = await service.submitAttempt(USER_ID, FIRST_STAGE.id, FIRST_LEVEL.id, ["a1a2"]);

      expect(result).toEqual({ correct: false });
      expect(repository.markCompleted).not.toHaveBeenCalled();
    });

    it("throws NotFoundException for an unknown level", async () => {
      const { service } = buildService();

      await expect(
        service.submitAttempt(USER_ID, "no-such-stage", "no-such-level", ["a1a2"]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
