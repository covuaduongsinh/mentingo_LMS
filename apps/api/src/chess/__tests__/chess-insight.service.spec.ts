import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";

import { ChessInsightService } from "../chess-insight.service";

import type { ChessInsightRepository } from "../chess-insight.repository";
import type { ChessMatchRepository } from "../chess-match.repository";
import type { ChessEngineService } from "../engine/engine.service";
import type { CurrentUserType } from "src/common/types/current-user.type";

const MATCH_ID = "11111111-1111-1111-1111-111111111111";
const WHITE_ID = "22222222-2222-2222-2222-222222222222";
const BLACK_ID = "33333333-3333-3333-3333-333333333333";
const TENANT_ID = "44444444-4444-4444-4444-444444444444";

function buildUser(userId: string, permissions: string[] = []): CurrentUserType {
  return {
    userId,
    email: "user@example.com",
    roleSlugs: ["student"],
    permissions: permissions as CurrentUserType["permissions"],
    tenantId: TENANT_ID,
  };
}

function buildMatch(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: MATCH_ID,
    whiteUserId: WHITE_ID,
    blackUserId: BLACK_ID,
    tenantId: TENANT_ID,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ChessInsightService", () => {
  const buildService = (
    repositoryOverrides: Partial<ChessInsightRepository> = {},
    matchRepositoryOverrides: Partial<ChessMatchRepository> = {},
    engineOverrides: Partial<ChessEngineService> = {},
  ) => {
    const repository = {
      deleteByMatch: jest.fn(),
      bulkInsert: jest.fn(),
      getMatchReport: jest.fn().mockResolvedValue([]),
      getOverallStats: jest.fn().mockResolvedValue({ moveCount: 0, avgAccuracy: null }),
      getPhaseStats: jest.fn().mockResolvedValue([]),
      getPieceTypeStats: jest.fn().mockResolvedValue([]),
      getOpeningStats: jest.fn().mockResolvedValue([]),
      getAnalyzedMatchesForUser: jest.fn().mockResolvedValue([]),
      getInsightRowsForMatches: jest.fn().mockResolvedValue([]),
      getTenantAverageAccuracy: jest.fn().mockResolvedValue(null),
      ...repositoryOverrides,
    } as unknown as ChessInsightRepository;

    const matchRepository = {
      getMatchById: jest.fn().mockResolvedValue(buildMatch()),
      getMatchMoves: jest.fn().mockResolvedValue([]),
      ...matchRepositoryOverrides,
    } as unknown as ChessMatchRepository;

    const engineService = {
      analyze: jest.fn().mockResolvedValue({
        scoreCp: 0,
        mate: null,
        bestMoveUci: null,
        pv: [],
        depth: 1,
        engine: "builtin",
      }),
      ...engineOverrides,
    } as unknown as ChessEngineService;

    return {
      service: new ChessInsightService(repository, matchRepository, engineService),
      repository,
      matchRepository,
      engineService,
    };
  };

  describe("analyzeMatch", () => {
    it("does nothing for an unknown match", async () => {
      const { service, repository, matchRepository } = buildService(
        {},
        { getMatchById: jest.fn().mockResolvedValue(undefined) },
      );

      await service.analyzeMatch(MATCH_ID);

      expect(matchRepository.getMatchMoves).not.toHaveBeenCalled();
      expect(repository.bulkInsert).not.toHaveBeenCalled();
    });

    it("clears old rows but skips analysis for a near-empty game", async () => {
      const { service, repository } = buildService(
        {},
        { getMatchMoves: jest.fn().mockResolvedValue([{ ply: 0, uci: "e2e4", fenAfter: "x" }]) },
      );

      await service.analyzeMatch(MATCH_ID);

      expect(repository.deleteByMatch).toHaveBeenCalledWith(MATCH_ID);
      expect(repository.bulkInsert).not.toHaveBeenCalled();
    });

    it("analyzes each move, alternating movers and computing centipawn loss/accuracy", async () => {
      const moves = [
        {
          ply: 0,
          uci: "e2e4",
          fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
          createdAt: "2026-01-01T00:00:05.000Z",
        },
        {
          ply: 1,
          uci: "e7e5",
          fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
          createdAt: "2026-01-01T00:00:10.000Z",
        },
      ];
      // First analyze() call (after white's e4) is from Black's perspective: slightly worse for
      // white than "perfect" (0), i.e. still fine for white. Second call (after black's e5) is
      // from White's perspective, back near equal.
      const analyze = jest
        .fn()
        .mockResolvedValueOnce({ scoreCp: -20, mate: null })
        .mockResolvedValueOnce({ scoreCp: 15, mate: null });

      const { service, repository } = buildService(
        {},
        { getMatchMoves: jest.fn().mockResolvedValue(moves) },
        { analyze },
      );

      await service.analyzeMatch(MATCH_ID);

      expect(repository.bulkInsert).toHaveBeenCalledTimes(1);
      const rows = (repository.bulkInsert as jest.Mock).mock.calls[0][0];
      expect(rows).toHaveLength(2);

      expect(rows[0].userId).toBe(WHITE_ID);
      expect(rows[0].evaluationCpBefore).toBe(0);
      expect(rows[0].evaluationCpAfter).toBe(20);
      expect(rows[0].centipawnLoss).toBe(0);
      expect(rows[0].phase).toBe("opening");
      expect(rows[0].pieceType).toBe("pawn");
      expect(rows[0].thinkTimeMs).toBe(5000);

      expect(rows[1].userId).toBe(BLACK_ID);
      // Black was at +20 before moving (scoreBefore = -(-20) from black's perspective? see below)
      expect(rows[1].evaluationCpBefore).toBe(-20);
      expect(rows[1].evaluationCpAfter).toBe(-15);
      expect(rows[1].thinkTimeMs).toBe(5000);
    });
  });

  describe("getMatchReport", () => {
    it("throws NotFoundException for an unknown match", async () => {
      const { service, matchRepository } = buildService(
        {},
        { getMatchById: jest.fn().mockResolvedValue(undefined) },
      );

      await expect(service.getMatchReport(MATCH_ID)).rejects.toThrow(NotFoundException);
      expect(matchRepository.getMatchById).toHaveBeenCalledWith(MATCH_ID);
    });

    it("summarizes accuracy and blunder/mistake counts per side", async () => {
      const rows = [
        { userId: WHITE_ID, moveQuality: "best", accuracy: 100 },
        { userId: WHITE_ID, moveQuality: "blunder", accuracy: 10 },
        { userId: BLACK_ID, moveQuality: "mistake", accuracy: 60 },
      ];
      const { service } = buildService({ getMatchReport: jest.fn().mockResolvedValue(rows) });

      const report = await service.getMatchReport(MATCH_ID);

      expect(report.white).toEqual({ moveCount: 2, avgAccuracy: 55, blunders: 1, mistakes: 0 });
      expect(report.black).toEqual({ moveCount: 1, avgAccuracy: 60, blunders: 0, mistakes: 1 });
    });
  });

  describe("getReport", () => {
    it("allows reading one's own report", async () => {
      const { service } = buildService();
      await expect(service.getReport(buildUser(WHITE_ID), WHITE_ID)).resolves.toBeDefined();
    });

    it("forbids reading another user's report without chess.insight.read_all", async () => {
      const { service } = buildService();
      await expect(service.getReport(buildUser(WHITE_ID), BLACK_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("allows reading another user's report with chess.insight.read_all", async () => {
      const { service } = buildService();
      const requester = buildUser(WHITE_ID, [PERMISSIONS.CHESS_INSIGHT_READ_ALL]);
      await expect(service.getReport(requester, BLACK_ID)).resolves.toBeDefined();
    });

    it("flags a phase as weak only with enough samples and below-average accuracy", async () => {
      const { service } = buildService({
        getOverallStats: jest.fn().mockResolvedValue({ moveCount: 20, avgAccuracy: "70" }),
        getPhaseStats: jest.fn().mockResolvedValue([
          {
            phase: "opening",
            moveCount: 10,
            avgAccuracy: "90",
            avgCentipawnLoss: "5",
            avgThinkTimeMs: "3000",
          },
          {
            phase: "endgame",
            moveCount: 10,
            avgAccuracy: "40",
            avgCentipawnLoss: "200",
            avgThinkTimeMs: "9000",
          },
          // Below average but too few samples to call it a real weakness.
          {
            phase: "middlegame",
            moveCount: 2,
            avgAccuracy: "10",
            avgCentipawnLoss: "500",
            avgThinkTimeMs: "1000",
          },
        ]),
      });

      const report = await service.getReport(buildUser(WHITE_ID), WHITE_ID);

      expect(report.weakPhases).toEqual(["endgame"]);
      expect(report.strongPhases[0]).toBe("opening");
      expect(report.weakPhases).not.toContain("middlegame");
    });

    it("computes recovery/conversion/timeout metrics from the eval trajectory of past matches", async () => {
      const OTHER_MATCH_ID = "55555555-5555-5555-5555-555555555555";
      const { service } = buildService({
        getAnalyzedMatchesForUser: jest.fn().mockResolvedValue([
          // White (this user) was down to -400 at some point but drew — a recovery.
          {
            id: MATCH_ID,
            whiteUserId: WHITE_ID,
            blackUserId: BLACK_ID,
            result: "draw",
            endReason: "draw_agreed",
          },
          // White reached +400 at some point but lost — failed to convert. Also a timeout loss.
          {
            id: OTHER_MATCH_ID,
            whiteUserId: WHITE_ID,
            blackUserId: BLACK_ID,
            result: "black_win",
            endReason: "timeout",
          },
        ]),
        getInsightRowsForMatches: jest.fn().mockResolvedValue([
          // Match 1: black's move drops white (this user) to -400 from black's row (negate).
          { matchId: MATCH_ID, userId: BLACK_ID, ply: 1, evaluationCpAfter: 400 },
          { matchId: MATCH_ID, userId: WHITE_ID, ply: 2, evaluationCpAfter: -100 },
          // Match 2: white reaches +400 directly (own row, no negation).
          { matchId: OTHER_MATCH_ID, userId: WHITE_ID, ply: 0, evaluationCpAfter: 400 },
          { matchId: OTHER_MATCH_ID, userId: BLACK_ID, ply: 1, evaluationCpAfter: 50 },
        ]),
      });

      const report = await service.getReport(buildUser(WHITE_ID), WHITE_ID);

      expect(report.recovery).toEqual({ timesBehind: 1, recoveredCount: 1 });
      expect(report.conversion).toEqual({ timesAhead: 1, failedToConvertCount: 1 });
      expect(report.timeManagement.totalLossCount).toBe(1);
      expect(report.timeManagement.timeoutLossCount).toBe(1);
    });
  });
});
