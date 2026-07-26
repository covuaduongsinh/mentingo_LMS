import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { ChessMatchService } from "../chess-match.service";

import type { ChessMatchRepository } from "../chess-match.repository";
import type { ChessPuzzleRepository } from "../chess-puzzle.repository";
import type { CurrentUserType } from "src/common/types/current-user.type";

const WHITE_ID = "white-1";
const BLACK_ID = "black-1";
const OTHER_ID = "other-1";
const TENANT_ID = "tenant-1";
const MATCH_ID = "match-1";
const SEEK_ID = "seek-1";

const buildUser = (userId: string) =>
  ({ userId, tenantId: TENANT_ID }) as unknown as CurrentUserType;

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const buildMatch = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: MATCH_ID,
  whiteUserId: WHITE_ID,
  blackUserId: BLACK_ID,
  timeControlId: "5+0",
  rated: true,
  status: "active",
  result: null,
  endReason: null,
  currentFen: START_FEN,
  whiteTimeRemainingMs: 300_000,
  blackTimeRemainingMs: 300_000,
  lastMoveAt: new Date(),
  drawOfferedByUserId: null,
  tenantId: TENANT_ID,
  ...overrides,
});

const buildSeek = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: SEEK_ID,
  creatorUserId: WHITE_ID,
  challengedUserId: null,
  timeControlId: "5+0",
  colorPreference: "random",
  rated: true,
  status: "pending",
  matchId: null,
  tenantId: TENANT_ID,
  ...overrides,
});

const buildRatingRow = (userId: string, overrides: Partial<Record<string, unknown>> = {}) => ({
  userId,
  category: "blitz",
  rating: 1500,
  ratingDeviation: 350,
  volatility: 0.06,
  gamesPlayed: 0,
  ...overrides,
});

describe("ChessMatchService", () => {
  const buildQueue = () => ({ add: jest.fn() });

  const buildService = (
    repositoryOverrides: Partial<ChessMatchRepository> = {},
    puzzleRepositoryOverrides: Partial<ChessPuzzleRepository> = {},
  ) => {
    const queue = buildQueue();
    const repository = {
      createSeek: jest.fn().mockImplementation((data) => Promise.resolve(buildSeek(data))),
      listOpenSeeks: jest.fn().mockResolvedValue([]),
      getSeekById: jest.fn().mockResolvedValue(buildSeek()),
      markSeekMatched: jest.fn(),
      markSeekStatus: jest.fn(),
      expireStaleSeeks: jest.fn(),
      createMatch: jest.fn().mockImplementation((data) => Promise.resolve(buildMatch(data))),
      getMatchById: jest.fn().mockResolvedValue(buildMatch()),
      getMoveCount: jest.fn().mockResolvedValue(0),
      getMatchMoves: jest.fn().mockResolvedValue([]),
      appendMoveAndUpdateClock: jest.fn(),
      setDrawOffer: jest.fn(),
      finishMatch: jest.fn(),
      ...repositoryOverrides,
    } as unknown as ChessMatchRepository;

    const puzzleRepository = {
      getOrCreateRating: jest
        .fn()
        .mockImplementation((userId: string) => Promise.resolve(buildRatingRow(userId))),
      saveRating: jest.fn(),
      ...puzzleRepositoryOverrides,
    } as unknown as ChessPuzzleRepository;

    const queueService = {
      getQueue: jest.fn().mockReturnValue(queue),
    } as unknown as import("src/queue").QueueService;

    return {
      service: new ChessMatchService(repository, puzzleRepository, queueService),
      repository,
      puzzleRepository,
      queue,
      queueService,
    };
  };

  describe("createSeek", () => {
    it("rejects challenging oneself", async () => {
      const { service } = buildService();

      await expect(
        service.createSeek(buildUser(WHITE_ID), {
          challengedUserId: WHITE_ID,
          timeControlId: "5+0",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects an unknown/no-clock time control (defense in depth beyond the request schema)", async () => {
      const { service } = buildService();

      await expect(
        service.createSeek(buildUser(WHITE_ID), {
          timeControlId: "none",
        } as unknown as Parameters<typeof service.createSeek>[1]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("acceptSeek", () => {
    it("rejects accepting one's own seek", async () => {
      const { service } = buildService();

      await expect(service.acceptSeek(buildUser(WHITE_ID), SEEK_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects a non-pending seek", async () => {
      const { service } = buildService({
        getSeekById: jest.fn().mockResolvedValue(buildSeek({ status: "matched" })),
      });

      await expect(service.acceptSeek(buildUser(BLACK_ID), SEEK_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects acceptance by someone other than the challenged user", async () => {
      const { service } = buildService({
        getSeekById: jest.fn().mockResolvedValue(buildSeek({ challengedUserId: BLACK_ID })),
      });

      await expect(service.acceptSeek(buildUser(OTHER_ID), SEEK_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("creates a match and marks the seek matched", async () => {
      const { service, repository } = buildService();

      const match = await service.acceptSeek(buildUser(BLACK_ID), SEEK_ID);

      expect(match.whiteUserId === WHITE_ID || match.blackUserId === WHITE_ID).toBe(true);
      expect(repository.markSeekMatched).toHaveBeenCalledWith(SEEK_ID, match.id);
    });
  });

  describe("cancelSeek", () => {
    it("only the creator can cancel", async () => {
      const { service } = buildService();

      await expect(service.cancelSeek(buildUser(OTHER_ID), SEEK_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("applyMove", () => {
    it("throws NotFoundException for an unknown match", async () => {
      const { service } = buildService({ getMatchById: jest.fn().mockResolvedValue(undefined) });

      await expect(service.applyMove(buildUser(WHITE_ID), MATCH_ID, "e2e4")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rejects a move from the player who isn't on turn", async () => {
      const { service } = buildService();

      await expect(service.applyMove(buildUser(BLACK_ID), MATCH_ID, "e2e4")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("rejects an illegal move", async () => {
      const { service } = buildService();

      await expect(service.applyMove(buildUser(WHITE_ID), MATCH_ID, "e2e5")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("accepts a legal move, updates the clock, and schedules a timeout check", async () => {
      const { service, repository, queue } = buildService();

      const result = await service.applyMove(buildUser(WHITE_ID), MATCH_ID, "e2e4");

      expect(result.finished).toBe(false);
      expect(repository.appendMoveAndUpdateClock).toHaveBeenCalled();
      expect(queue.add).toHaveBeenCalledWith(
        "timeout-check",
        expect.objectContaining({ matchId: MATCH_ID, expiringUserId: BLACK_ID }),
        expect.any(Object),
      );
    });

    it("ends the match and updates ratings on checkmate ('fool's mate': 1.f3 e5 2.g4 Qh4#)", async () => {
      const beforeMateFen = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2";
      const { service, repository, puzzleRepository } = buildService({
        getMatchById: jest.fn().mockResolvedValue(buildMatch({ currentFen: beforeMateFen })),
      });

      const result = await service.applyMove(buildUser(BLACK_ID), MATCH_ID, "d8h4");

      expect(result.finished).toBe(true);
      if (result.finished) {
        expect(result.result).toBe("black_win");
        expect(result.endReason).toBe("checkmate");
      }
      expect(repository.finishMatch).toHaveBeenCalledWith(MATCH_ID, "black_win", "checkmate");
      expect(puzzleRepository.saveRating).toHaveBeenCalledTimes(2);
    });
  });

  describe("resign", () => {
    it("the opponent wins when a player resigns", async () => {
      const { service, repository } = buildService();

      const result = await service.resign(buildUser(WHITE_ID), MATCH_ID);

      expect(result.result).toBe("black_win");
      expect(repository.finishMatch).toHaveBeenCalledWith(MATCH_ID, "black_win", "resignation");
    });

    it("a viewer cannot resign", async () => {
      const { service } = buildService();

      await expect(service.resign(buildUser(OTHER_ID), MATCH_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("queues Insight analysis when the game had enough moves", async () => {
      const { service, queueService } = buildService({
        getMoveCount: jest.fn().mockResolvedValue(10),
      });

      await service.resign(buildUser(WHITE_ID), MATCH_ID);

      expect(queueService.getQueue).toHaveBeenCalledWith("chess-match-insight-analysis");
    });

    it("does not queue Insight analysis for a near-empty game", async () => {
      const { service, queueService } = buildService({
        getMoveCount: jest.fn().mockResolvedValue(1),
      });

      await service.resign(buildUser(WHITE_ID), MATCH_ID);

      expect(queueService.getQueue).not.toHaveBeenCalledWith("chess-match-insight-analysis");
    });

    it("updates both players' ratings for a rated match", async () => {
      const { service, puzzleRepository } = buildService();

      await service.resign(buildUser(WHITE_ID), MATCH_ID);

      expect(puzzleRepository.saveRating).toHaveBeenCalledTimes(2);
    });

    it("does not update ratings for an unrated match", async () => {
      const { service, puzzleRepository } = buildService({
        getMatchById: jest.fn().mockResolvedValue(buildMatch({ rated: false })),
      });

      await service.resign(buildUser(WHITE_ID), MATCH_ID);

      expect(puzzleRepository.saveRating).not.toHaveBeenCalled();
    });
  });

  describe("offerDraw / acceptDraw", () => {
    it("rejects accepting a draw when none was offered", async () => {
      const { service } = buildService();

      await expect(service.acceptDraw(buildUser(BLACK_ID), MATCH_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects accepting one's own draw offer", async () => {
      const { service } = buildService({
        getMatchById: jest.fn().mockResolvedValue(buildMatch({ drawOfferedByUserId: WHITE_ID })),
      });

      await expect(service.acceptDraw(buildUser(WHITE_ID), MATCH_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("ends the match as a draw when the opponent accepts", async () => {
      const { service, repository } = buildService({
        getMatchById: jest.fn().mockResolvedValue(buildMatch({ drawOfferedByUserId: WHITE_ID })),
      });

      const result = await service.acceptDraw(buildUser(BLACK_ID), MATCH_ID);

      expect(result.result).toBe("draw");
      expect(repository.finishMatch).toHaveBeenCalledWith(MATCH_ID, "draw", "draw_agreed");
    });
  });

  describe("handleTimeoutCheck", () => {
    it("no-ops when a move has happened since the check was scheduled", async () => {
      const scheduledAt = new Date("2026-01-01T00:00:00.000Z");
      const { service, repository } = buildService({
        getMatchById: jest
          .fn()
          .mockResolvedValue(buildMatch({ lastMoveAt: new Date("2026-01-01T00:00:05.000Z") })),
      });

      const result = await service.handleTimeoutCheck(MATCH_ID, scheduledAt.getTime(), WHITE_ID);

      expect(result).toBeNull();
      expect(repository.finishMatch).not.toHaveBeenCalled();
    });

    it("ends the match as a timeout loss when no move happened", async () => {
      const lastMoveAt = new Date("2026-01-01T00:00:00.000Z");
      const { service, repository } = buildService({
        getMatchById: jest.fn().mockResolvedValue(buildMatch({ lastMoveAt })),
      });

      const result = await service.handleTimeoutCheck(MATCH_ID, lastMoveAt.getTime(), WHITE_ID);

      expect(result?.result).toBe("black_win");
      expect(repository.finishMatch).toHaveBeenCalledWith(MATCH_ID, "black_win", "timeout");
    });

    it("no-ops when the match is already finished", async () => {
      const lastMoveAt = new Date("2026-01-01T00:00:00.000Z");
      const { service, repository } = buildService({
        getMatchById: jest.fn().mockResolvedValue(buildMatch({ lastMoveAt, status: "finished" })),
      });

      const result = await service.handleTimeoutCheck(MATCH_ID, lastMoveAt.getTime(), WHITE_ID);

      expect(result).toBeNull();
      expect(repository.finishMatch).not.toHaveBeenCalled();
    });
  });
});
