import { BadRequestException, NotFoundException } from "@nestjs/common";

import { ChessPuzzleService } from "../chess-puzzle.service";

import type { ChessPuzzleRepository } from "../chess-puzzle.repository";
import type { CurrentUserType } from "src/common/types/current-user.type";

const USER_ID = "user-1";
const TENANT_ID = "tenant-1";
const PUZZLE_ID = "puzzle-1";

const buildUser = () => ({ userId: USER_ID, tenantId: TENANT_ID }) as unknown as CurrentUserType;

const buildRatingRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  userId: USER_ID,
  category: "puzzle",
  rating: 1500,
  ratingDeviation: 350,
  volatility: 0.06,
  gamesPlayed: 0,
  ...overrides,
});

const buildPuzzle = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: PUZZLE_ID,
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  solutionUci: ["e2e4", "e7e5"],
  rating: 1500,
  ratingDeviation: 350,
  volatility: 0.06,
  motifs: ["fork"],
  popularity: null,
  ...overrides,
});

describe("ChessPuzzleService", () => {
  const buildService = (repositoryOverrides: Partial<ChessPuzzleRepository> = {}) => {
    const repository = {
      getOrCreateRating: jest.fn().mockResolvedValue(buildRatingRow()),
      saveRating: jest.fn(),
      getRatingHistory: jest.fn().mockResolvedValue([]),
      getPuzzleById: jest.fn().mockResolvedValue(buildPuzzle()),
      findAdaptivePuzzle: jest.fn().mockResolvedValue(buildPuzzle()),
      getDailyPuzzle: jest.fn().mockResolvedValue(buildPuzzle()),
      createAttempt: jest.fn(),
      updatePuzzleRating: jest.fn(),
      getMistakes: jest.fn().mockResolvedValue([]),
      getThemeStats: jest.fn().mockResolvedValue([]),
      bulkInsertPuzzles: jest.fn().mockResolvedValue(0),
      ...repositoryOverrides,
    } as unknown as ChessPuzzleRepository;

    return { service: new ChessPuzzleService(repository), repository };
  };

  describe("getNextPuzzle", () => {
    it("returns a puzzle without its solution", async () => {
      const { service } = buildService();

      const puzzle = await service.getNextPuzzle(buildUser(), "NORMAL");

      expect(puzzle).not.toHaveProperty("solutionUci");
      expect(puzzle).toMatchObject({ id: PUZZLE_ID });
    });

    it("widens the rating delta and retries when no puzzle matches", async () => {
      const findAdaptivePuzzle = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(buildPuzzle());
      const { service } = buildService({ findAdaptivePuzzle });

      const puzzle = await service.getNextPuzzle(buildUser(), "EASIER");

      expect(puzzle).toMatchObject({ id: PUZZLE_ID });
      expect(findAdaptivePuzzle).toHaveBeenCalledTimes(3);
      expect(findAdaptivePuzzle.mock.calls[1][0].delta).toBeGreaterThan(
        findAdaptivePuzzle.mock.calls[0][0].delta,
      );
    });

    it("returns null when the bank is exhausted even after widening", async () => {
      const { service } = buildService({
        findAdaptivePuzzle: jest.fn().mockResolvedValue(undefined),
      });

      const puzzle = await service.getNextPuzzle(buildUser(), "NORMAL");

      expect(puzzle).toBeNull();
    });
  });

  describe("getDailyPuzzle", () => {
    it("returns null when no puzzles exist", async () => {
      const { service } = buildService({ getDailyPuzzle: jest.fn().mockResolvedValue(undefined) });

      await expect(service.getDailyPuzzle()).resolves.toBeNull();
    });

    it("strips the solution from the daily puzzle", async () => {
      const { service } = buildService();

      const puzzle = await service.getDailyPuzzle();

      expect(puzzle).not.toHaveProperty("solutionUci");
    });
  });

  describe("submitAttempt", () => {
    it("throws NotFoundException when the puzzle doesn't exist", async () => {
      const { service } = buildService({ getPuzzleById: jest.fn().mockResolvedValue(undefined) });

      await expect(service.submitAttempt(buildUser(), PUZZLE_ID, ["e2e4"])).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws BadRequestException on an empty move submission", async () => {
      const { service } = buildService();

      await expect(service.submitAttempt(buildUser(), PUZZLE_ID, [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it("records a correct attempt and raises the user's rating", async () => {
      const { service, repository } = buildService();

      const result = await service.submitAttempt(buildUser(), PUZZLE_ID, ["e2e4", "e7e5"]);

      expect(result.correct).toBe(true);
      expect(result.userRatingAfter).toBeGreaterThan(result.userRatingBefore);
      expect(repository.saveRating).toHaveBeenCalledWith(
        USER_ID,
        "puzzle",
        expect.objectContaining({ rating: result.userRatingAfter }),
        true,
      );
      expect(repository.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ puzzleId: PUZZLE_ID, userId: USER_ID, correct: true }),
      );
    });

    it("records an incorrect attempt and lowers the user's rating", async () => {
      const { service, repository } = buildService();

      const result = await service.submitAttempt(buildUser(), PUZZLE_ID, ["a2a3"]);

      expect(result.correct).toBe(false);
      expect(result.userRatingAfter).toBeLessThan(result.userRatingBefore);
      expect(repository.updatePuzzleRating).toHaveBeenCalled();
    });
  });

  describe("getMistakes", () => {
    it("strips the solution from every returned puzzle", async () => {
      const { service } = buildService({
        getMistakes: jest.fn().mockResolvedValue([
          { puzzle: buildPuzzle(), lastAttemptAt: new Date().toISOString() },
          { puzzle: buildPuzzle({ id: "puzzle-2" }), lastAttemptAt: new Date().toISOString() },
        ]),
      });

      const mistakes = await service.getMistakes(buildUser());

      expect(mistakes).toHaveLength(2);
      expect(mistakes[0]).not.toHaveProperty("solutionUci");
    });
  });

  describe("getDashboard", () => {
    it("flags a motif as weak once it has 3+ wrong attempts and below-average accuracy", async () => {
      const { service } = buildService({
        getThemeStats: jest.fn().mockResolvedValue([
          { motif: "fork", attempts: 10, correct: 8 }, // 80% accuracy
          { motif: "pin", attempts: 5, correct: 1 }, // 20% accuracy, 4 misses
        ]),
      });

      const dashboard = await service.getDashboard(buildUser());

      expect(dashboard.weakMotifs).toContain("pin");
      expect(dashboard.weakMotifs).not.toContain("fork");
      expect(dashboard.strongMotifs[0]).toBe("fork");
    });

    it("does not flag a motif as weak with fewer than 3 misses even at low accuracy", async () => {
      const { service } = buildService({
        getThemeStats: jest.fn().mockResolvedValue([
          { motif: "fork", attempts: 10, correct: 8 },
          { motif: "skewer", attempts: 2, correct: 0 },
        ]),
      });

      const dashboard = await service.getDashboard(buildUser());

      expect(dashboard.weakMotifs).not.toContain("skewer");
    });
  });

  describe("importPuzzles", () => {
    it("delegates to the repository's bulk insert", async () => {
      const { service, repository } = buildService({
        bulkInsertPuzzles: jest.fn().mockResolvedValue(3),
      });

      const count = await service.importPuzzles([]);

      expect(count).toBe(3);
      expect(repository.bulkInsertPuzzles).toHaveBeenCalled();
    });
  });
});
