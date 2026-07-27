import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CHESS_BROADCAST_STATUSES, PERMISSIONS } from "@repo/shared";

import { ChessBroadcastService } from "../chess-broadcast.service";
import { fetchPgnSafely } from "../utils/safe-pgn-fetch";

import type { ChessBroadcastRepository } from "../chess-broadcast.repository";
import type { CurrentUserType } from "src/common/types/current-user.type";

jest.mock("../utils/safe-pgn-fetch", () => ({ fetchPgnSafely: jest.fn() }));

const BROADCAST_ID = "11111111-1111-1111-1111-111111111111";
const ROUND_ID = "22222222-2222-2222-2222-222222222222";
const GAME_ID = "33333333-3333-3333-3333-333333333333";
const TEAM_A_ID = "44444444-4444-4444-4444-444444444444";
const TEAM_B_ID = "55555555-5555-5555-5555-555555555555";
const TENANT_ID = "66666666-6666-6666-6666-666666666666";
const USER_ID = "77777777-7777-7777-7777-777777777777";

function buildUser(permissions: string[] = []): CurrentUserType {
  return {
    userId: USER_ID,
    email: "user@example.com",
    roleSlugs: ["trainer"],
    permissions: permissions as CurrentUserType["permissions"],
    tenantId: TENANT_ID,
  };
}

function buildBroadcast(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: BROADCAST_ID,
    name: "Giải học sinh giỏi",
    description: null,
    status: CHESS_BROADCAST_STATUSES.LIVE,
    delayMinutes: 15,
    createdByUserId: USER_ID,
    tenantId: TENANT_ID,
    ...overrides,
  };
}

function buildRound(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: ROUND_ID,
    broadcastId: BROADCAST_ID,
    name: "Vòng 1",
    displayOrder: 0,
    tenantId: TENANT_ID,
    ...overrides,
  };
}

function buildGame(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: GAME_ID,
    roundId: ROUND_ID,
    boardNumber: 1,
    whiteName: "Nguyễn Văn A",
    blackName: "Trần Thị B",
    whiteTeamId: TEAM_A_ID,
    blackTeamId: TEAM_B_ID,
    result: null,
    currentFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    pgnSourceUrl: null,
    lastFetchedAt: null,
    tenantId: TENANT_ID,
    ...overrides,
  };
}

describe("ChessBroadcastService", () => {
  const buildService = (repositoryOverrides: Partial<ChessBroadcastRepository> = {}) => {
    const repository = {
      createBroadcast: jest.fn().mockResolvedValue(buildBroadcast()),
      listBroadcasts: jest.fn().mockResolvedValue([]),
      getBroadcastById: jest.fn().mockResolvedValue(buildBroadcast()),
      updateBroadcast: jest.fn().mockImplementation((_id, fields) => buildBroadcast(fields)),
      createRound: jest.fn().mockResolvedValue(buildRound()),
      listRoundsByBroadcast: jest.fn().mockResolvedValue([buildRound()]),
      getRoundById: jest.fn().mockResolvedValue(buildRound()),
      createTeam: jest
        .fn()
        .mockResolvedValue({ id: TEAM_A_ID, broadcastId: BROADCAST_ID, name: "Đội A" }),
      listTeamsByBroadcast: jest.fn().mockResolvedValue([]),
      createGame: jest.fn().mockResolvedValue(buildGame()),
      getGameById: jest.fn().mockResolvedValue(buildGame()),
      updateGame: jest.fn().mockImplementation((_id, fields) => buildGame(fields)),
      listGamesByRoundIds: jest.fn().mockResolvedValue([buildGame()]),
      listGamesForBroadcast: jest.fn().mockResolvedValue([]),
      listAutoPullGames: jest.fn().mockResolvedValue([]),
      getGameMoves: jest.fn().mockResolvedValue([]),
      insertGameMoves: jest.fn(),
      ...repositoryOverrides,
    } as unknown as ChessBroadcastRepository;

    return { service: new ChessBroadcastService(repository), repository };
  };

  describe("createBroadcast", () => {
    it("stamps createdByUserId and tenantId from the requester", async () => {
      const { service, repository } = buildService();
      await service.createBroadcast(buildUser(), { name: "Giải mới", delayMinutes: 10 });

      expect(repository.createBroadcast).toHaveBeenCalledWith({
        name: "Giải mới",
        delayMinutes: 10,
        createdByUserId: USER_ID,
        tenantId: TENANT_ID,
      });
    });
  });

  describe("getBroadcastDetail", () => {
    it("throws NotFoundException when the broadcast does not exist", async () => {
      const { service } = buildService({
        getBroadcastById: jest.fn().mockResolvedValue(undefined),
      });
      await expect(service.getBroadcastDetail(BROADCAST_ID)).rejects.toThrow(NotFoundException);
    });

    it("groups games under their round", async () => {
      const otherRound = buildRound({
        id: "88888888-8888-8888-8888-888888888888",
        displayOrder: 1,
      });
      const gameInOtherRound = buildGame({
        id: "99999999-9999-9999-9999-999999999999",
        roundId: otherRound.id,
      });
      const { service } = buildService({
        listRoundsByBroadcast: jest.fn().mockResolvedValue([buildRound(), otherRound]),
        listGamesByRoundIds: jest.fn().mockResolvedValue([buildGame(), gameInOtherRound]),
      });

      const detail = await service.getBroadcastDetail(BROADCAST_ID);

      expect(detail.rounds).toHaveLength(2);
      expect(detail.rounds[0].games).toEqual([buildGame()]);
      expect(detail.rounds[1].games).toEqual([gameInOtherRound]);
    });
  });

  describe("createRound / createTeam / createGame", () => {
    it("throws NotFoundException when the parent broadcast is missing", async () => {
      const { service } = buildService({
        getBroadcastById: jest.fn().mockResolvedValue(undefined),
      });
      await expect(service.createRound(BROADCAST_ID, { name: "Vòng 1" })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createTeam(BROADCAST_ID, { name: "Đội A" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException when the parent round is missing", async () => {
      const { service } = buildService({ getRoundById: jest.fn().mockResolvedValue(undefined) });
      await expect(
        service.createGame(ROUND_ID, { boardNumber: 1, whiteName: "A", blackName: "B" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("propagates the parent's tenantId onto the new row", async () => {
      const { service, repository } = buildService();
      await service.createRound(BROADCAST_ID, { name: "Vòng 2" });
      expect(repository.createRound).toHaveBeenCalledWith({
        name: "Vòng 2",
        broadcastId: BROADCAST_ID,
        tenantId: TENANT_ID,
      });
    });
  });

  describe("pastePgn", () => {
    it("inserts every move on the first paste and sets currentFen/result", async () => {
      const { service, repository } = buildService();
      const result = await service.pastePgn(GAME_ID, "1. e4 e5 2. Nf3 Nc6");

      expect(repository.insertGameMoves).toHaveBeenCalledTimes(1);
      const insertedRows = (repository.insertGameMoves as jest.Mock).mock.calls[0][0];
      expect(insertedRows).toHaveLength(4);
      expect(insertedRows[0]).toMatchObject({ gameId: GAME_ID, ply: 0, uci: "e2e4", san: "e4" });
      expect(result.insertedMoveCount).toBe(4);
      expect(repository.updateGame).toHaveBeenCalledWith(
        GAME_ID,
        expect.objectContaining({ result: null }),
      );
    });

    it("only appends the new suffix when re-pasting a longer PGN with a matching prefix", async () => {
      const existingMoves = [
        {
          ply: 0,
          uci: "e2e4",
          san: "e4",
          fenAfter: "irrelevant",
          ingestedAt: new Date().toISOString(),
        },
        {
          ply: 1,
          uci: "e7e5",
          san: "e5",
          fenAfter: "irrelevant",
          ingestedAt: new Date().toISOString(),
        },
      ];
      const { service, repository } = buildService({
        getGameMoves: jest.fn().mockResolvedValue(existingMoves),
      });

      const result = await service.pastePgn(GAME_ID, "1. e4 e5 2. Nf3 Nc6");

      expect(result.insertedMoveCount).toBe(2);
      const insertedRows = (repository.insertGameMoves as jest.Mock).mock.calls[0][0];
      expect(insertedRows.map((row: { ply: number }) => row.ply)).toEqual([2, 3]);
    });

    it("is idempotent — re-pasting the exact same PGN inserts nothing", async () => {
      const existingMoves = [
        {
          ply: 0,
          uci: "e2e4",
          san: "e4",
          fenAfter: "irrelevant",
          ingestedAt: new Date().toISOString(),
        },
        {
          ply: 1,
          uci: "e7e5",
          san: "e5",
          fenAfter: "irrelevant",
          ingestedAt: new Date().toISOString(),
        },
      ];
      const { service, repository } = buildService({
        getGameMoves: jest.fn().mockResolvedValue(existingMoves),
      });

      const result = await service.pastePgn(GAME_ID, "1. e4 e5");

      expect(result.insertedMoveCount).toBe(0);
      expect(repository.insertGameMoves).toHaveBeenCalledWith([]);
    });

    it("throws BadRequestException when the pasted PGN diverges from recorded moves", async () => {
      const existingMoves = [
        {
          ply: 0,
          uci: "e2e4",
          san: "e4",
          fenAfter: "irrelevant",
          ingestedAt: new Date().toISOString(),
        },
      ];
      const { service } = buildService({
        getGameMoves: jest.fn().mockResolvedValue(existingMoves),
      });

      await expect(service.pastePgn(GAME_ID, "1. d4 d5")).rejects.toThrow(BadRequestException);
    });

    it("preserves a previously set manual result when the new PGN has no Result tag", async () => {
      const { service, repository } = buildService({
        getGameById: jest.fn().mockResolvedValue(buildGame({ result: "1-0" })),
      });

      await service.pastePgn(GAME_ID, "1. e4 e5");

      expect(repository.updateGame).toHaveBeenCalledWith(
        GAME_ID,
        expect.objectContaining({ result: "1-0" }),
      );
    });
  });

  describe("getGameView", () => {
    const oldMove = {
      ply: 0,
      uci: "e2e4",
      san: "e4",
      fenAfter: "fen-after-move-0",
      ingestedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
    };
    const recentMove = {
      ply: 1,
      uci: "e7e5",
      san: "e5",
      fenAfter: "fen-after-move-1",
      ingestedAt: new Date().toISOString(),
    };

    it("hides moves ingested within the broadcast delay window for a non-live view", async () => {
      const { service } = buildService({
        getGameMoves: jest.fn().mockResolvedValue([oldMove, recentMove]),
      });

      const view = await service.getGameView(buildUser(), GAME_ID, false);

      expect(view.moves).toEqual([oldMove]);
      expect(view.fen).toBe("fen-after-move-0");
      expect(view.delayed).toBe(true);
    });

    it("throws ForbiddenException when a non-manager requests live=true", async () => {
      const { service } = buildService({
        getGameMoves: jest.fn().mockResolvedValue([oldMove, recentMove]),
      });

      await expect(service.getGameView(buildUser([]), GAME_ID, true)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("shows every move for a manager requesting live=true", async () => {
      const { service } = buildService({
        getGameMoves: jest.fn().mockResolvedValue([oldMove, recentMove]),
      });

      const view = await service.getGameView(
        buildUser([PERMISSIONS.CHESS_BROADCAST_MANAGE]),
        GAME_ID,
        true,
      );

      expect(view.moves).toEqual([oldMove, recentMove]);
      expect(view.delayed).toBe(false);
    });
  });

  describe("getStandings", () => {
    it("computes win/draw/loss points per team across mixed results, pull-based from scratch", async () => {
      const teamA = { id: TEAM_A_ID, broadcastId: BROADCAST_ID, name: "Đội A" };
      const teamB = { id: TEAM_B_ID, broadcastId: BROADCAST_ID, name: "Đội B" };
      const games = [
        buildGame({ id: "g1", result: "1-0", whiteTeamId: TEAM_A_ID, blackTeamId: TEAM_B_ID }),
        buildGame({ id: "g2", result: "1/2-1/2", whiteTeamId: TEAM_A_ID, blackTeamId: TEAM_B_ID }),
        buildGame({ id: "g3", result: "0-1", whiteTeamId: TEAM_A_ID, blackTeamId: TEAM_B_ID }),
        buildGame({ id: "g4", result: null, whiteTeamId: TEAM_A_ID, blackTeamId: TEAM_B_ID }),
      ];
      const { service } = buildService({
        listTeamsByBroadcast: jest.fn().mockResolvedValue([teamA, teamB]),
        listGamesForBroadcast: jest.fn().mockResolvedValue(games),
      });

      const { standings } = await service.getStandings(BROADCAST_ID);

      const byTeam = Object.fromEntries(standings.map((row) => [row.teamId, row]));
      expect(byTeam[TEAM_A_ID]).toMatchObject({ score: 1.5, gamesPlayed: 3 });
      expect(byTeam[TEAM_B_ID]).toMatchObject({ score: 1.5, gamesPlayed: 3 });
    });

    it("includes teams with zero games at score 0", async () => {
      const teamA = { id: TEAM_A_ID, broadcastId: BROADCAST_ID, name: "Đội A" };
      const { service } = buildService({
        listTeamsByBroadcast: jest.fn().mockResolvedValue([teamA]),
        listGamesForBroadcast: jest.fn().mockResolvedValue([]),
      });

      const { standings } = await service.getStandings(BROADCAST_ID);
      expect(standings).toEqual([
        { teamId: TEAM_A_ID, teamName: "Đội A", score: 0, gamesPlayed: 0 },
      ]);
    });
  });

  describe("autoPullBroadcastGames", () => {
    it("only pulls games belonging to a live broadcast and updates lastFetchedAt", async () => {
      const liveGame = buildGame({ id: "live-game", pgnSourceUrl: "https://example.com/pgn" });
      const upcomingGame = buildGame({
        id: "upcoming-game",
        pgnSourceUrl: "https://example.com/pgn2",
      });
      const { service, repository } = buildService({
        listAutoPullGames: jest.fn().mockResolvedValue([
          { game: liveGame, broadcastStatus: CHESS_BROADCAST_STATUSES.LIVE },
          { game: upcomingGame, broadcastStatus: CHESS_BROADCAST_STATUSES.UPCOMING },
        ]),
        getGameById: jest.fn().mockResolvedValue(liveGame),
      });
      (fetchPgnSafely as jest.Mock).mockResolvedValue("1. e4 e5");

      await service.autoPullBroadcastGames();

      expect(fetchPgnSafely).toHaveBeenCalledTimes(1);
      expect(fetchPgnSafely).toHaveBeenCalledWith("https://example.com/pgn");
      expect(repository.updateGame).toHaveBeenCalledWith(
        "live-game",
        expect.objectContaining({ lastFetchedAt: expect.any(String) }),
      );
    });

    it("logs and continues when one game's fetch fails", async () => {
      const gameOne = buildGame({ id: "game-1", pgnSourceUrl: "https://example.com/1" });
      const gameTwo = buildGame({ id: "game-2", pgnSourceUrl: "https://example.com/2" });
      const { service, repository } = buildService({
        listAutoPullGames: jest.fn().mockResolvedValue([
          { game: gameOne, broadcastStatus: CHESS_BROADCAST_STATUSES.LIVE },
          { game: gameTwo, broadcastStatus: CHESS_BROADCAST_STATUSES.LIVE },
        ]),
        getGameById: jest.fn().mockResolvedValueOnce(gameOne).mockResolvedValueOnce(gameTwo),
      });
      (fetchPgnSafely as jest.Mock)
        .mockRejectedValueOnce(new Error("network down"))
        .mockResolvedValueOnce("1. e4 e5");

      await expect(service.autoPullBroadcastGames()).resolves.not.toThrow();
      expect(repository.updateGame).toHaveBeenCalledWith(
        "game-2",
        expect.objectContaining({ lastFetchedAt: expect.any(String) }),
      );
      expect(repository.updateGame).not.toHaveBeenCalledWith(
        "game-1",
        expect.objectContaining({ lastFetchedAt: expect.any(String) }),
      );
    });
  });
});
