import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { ChessTournamentService } from "../chess-tournament.service";

import type { ChessTournamentRepository } from "../chess-tournament.repository";
import type { ChessMatchService } from "src/chess/chess-match.service";
import type { ChessPuzzleRepository } from "src/chess/chess-puzzle.repository";
import type { CurrentUserType } from "src/common/types/current-user.type";

const TEACHER_ID = "teacher-1";
const OTHER_TEACHER_ID = "teacher-2";
const ADMIN_ID = "admin-1";
const TOURNAMENT_ID = "tournament-1";
const GROUP_ID = "group-1";

const buildUser = (userId: string, roleSlugs: string[] = ["trainer"]) =>
  ({ userId, tenantId: "tenant-1", roleSlugs }) as unknown as CurrentUserType;

const buildTournament = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: TOURNAMENT_ID,
  name: "Test tournament",
  format: "swiss",
  groupId: GROUP_ID,
  timeControlId: "5+0",
  rated: true,
  roundCount: 3,
  durationMinutes: null,
  hostUserId: null,
  status: "registration",
  currentRound: 0,
  minRating: null,
  maxRating: null,
  minGamesPlayed: null,
  createdByUserId: TEACHER_ID,
  ...overrides,
});

const buildPlayer = (userId: string, firstName = "First", lastName = "Last") => ({
  userId,
  firstName,
  lastName,
  withdrawnAt: null,
});

describe("ChessTournamentService", () => {
  const buildService = (
    repositoryOverrides: Partial<ChessTournamentRepository> = {},
    matchServiceOverrides: Partial<ChessMatchService> = {},
    puzzleRepositoryOverrides: Partial<ChessPuzzleRepository> = {},
  ) => {
    const repository = {
      createTournament: jest
        .fn()
        .mockImplementation((data) => Promise.resolve(buildTournament(data))),
      getTournamentById: jest.fn().mockResolvedValue(buildTournament()),
      updateTournamentStatus: jest.fn().mockResolvedValue(undefined),
      findPlayer: jest.fn().mockResolvedValue(undefined),
      insertPlayer: jest.fn().mockResolvedValue({ tournamentId: TOURNAMENT_ID, userId: "p1" }),
      insertPlayers: jest.fn().mockResolvedValue(undefined),
      getPlayersWithNames: jest.fn().mockResolvedValue([]),
      getGroupMemberIds: jest.fn().mockResolvedValue([]),
      insertPairings: jest.fn().mockImplementation((rows) => Promise.resolve(rows)),
      getPairings: jest.fn().mockResolvedValue([]),
      getPairingsForRound: jest.fn().mockResolvedValue([]),
      syncPairingResults: jest.fn().mockResolvedValue(undefined),
      ...repositoryOverrides,
    } as unknown as ChessTournamentRepository;

    let matchCounter = 0;
    const chessMatchService = {
      createDirectMatch: jest.fn().mockImplementation(() => {
        matchCounter += 1;
        return Promise.resolve({ id: `match-${matchCounter}`, tenantId: "tenant-1" });
      }),
      ...matchServiceOverrides,
    } as unknown as ChessMatchService;

    const chessPuzzleRepository = {
      getOrCreateRating: jest
        .fn()
        .mockImplementation((userId: string) =>
          Promise.resolve({ userId, rating: 1500, gamesPlayed: 10 }),
        ),
      ...puzzleRepositoryOverrides,
    } as unknown as ChessPuzzleRepository;

    const service = new ChessTournamentService(
      repository,
      chessMatchService,
      chessPuzzleRepository,
    );

    return { service, repository, chessMatchService, chessPuzzleRepository };
  };

  describe("bulkPairing", () => {
    it("creates a match and pairing for each explicit pair", async () => {
      const { service, chessMatchService, repository } = buildService();

      const result = await service.bulkPairing(buildUser(TEACHER_ID), {
        groupId: GROUP_ID,
        timeControlId: "5+0",
        pairs: [{ whiteUserId: "a", blackUserId: "b" }],
      });

      expect(chessMatchService.createDirectMatch).toHaveBeenCalledWith({
        whiteUserId: "a",
        blackUserId: "b",
        timeControlId: "5+0",
        rated: true,
      });
      expect(repository.insertPairings).toHaveBeenCalled();
      expect(result.pairings).toHaveLength(1);
    });

    it("auto-pairs group members by descending rating", async () => {
      const { service, repository, chessPuzzleRepository } = buildService({
        getGroupMemberIds: jest.fn().mockResolvedValue(["low", "high", "mid"]),
      });
      (chessPuzzleRepository.getOrCreateRating as jest.Mock).mockImplementation(
        (userId: string) => {
          const ratings: Record<string, number> = { low: 1200, high: 1800, mid: 1500 };
          return Promise.resolve({ userId, rating: ratings[userId], gamesPlayed: 5 });
        },
      );

      const result = await service.bulkPairing(buildUser(TEACHER_ID), {
        groupId: GROUP_ID,
        timeControlId: "5+0",
        auto: true,
      });

      expect(result.pairings).toHaveLength(1);
      expect(repository.createTournament).toHaveBeenCalled();
    });

    it("throws when no explicit pairs are given and auto is not requested", async () => {
      const { service } = buildService();

      await expect(
        service.bulkPairing(buildUser(TEACHER_ID), { groupId: GROUP_ID, timeControlId: "5+0" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("createTournament", () => {
    it("requires roundCount for a swiss tournament", async () => {
      const { service } = buildService();

      await expect(
        service.createTournament(buildUser(TEACHER_ID), {
          name: "Swiss",
          format: "swiss",
          timeControlId: "5+0",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("requires durationMinutes for an arena tournament", async () => {
      const { service } = buildService();

      await expect(
        service.createTournament(buildUser(TEACHER_ID), {
          name: "Arena",
          format: "arena",
          timeControlId: "5+0",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("registers invited participants for a simul", async () => {
      const { service, repository } = buildService();

      await service.createTournament(buildUser(TEACHER_ID), {
        name: "Simul",
        format: "simul",
        timeControlId: "5+0",
        participantUserIds: ["s1", "s2"],
      });

      expect(repository.insertPlayers).toHaveBeenCalledWith(TOURNAMENT_ID, ["s1", "s2"]);
    });
  });

  describe("joinTournament", () => {
    it("throws when the tournament has already finished", async () => {
      const { service } = buildService({
        getTournamentById: jest.fn().mockResolvedValue(buildTournament({ status: "finished" })),
      });

      await expect(service.joinTournament(buildUser("p1"), TOURNAMENT_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("throws when the user is not a member of the tournament's group", async () => {
      const { service } = buildService({
        getGroupMemberIds: jest.fn().mockResolvedValue(["other"]),
      });

      await expect(service.joinTournament(buildUser("p1"), TOURNAMENT_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("throws when the user's rating is below the tournament minimum", async () => {
      const { service } = buildService(
        {
          getGroupMemberIds: jest.fn().mockResolvedValue(["p1"]),
          getTournamentById: jest.fn().mockResolvedValue(buildTournament({ minRating: 1000 })),
        },
        {},
        { getOrCreateRating: jest.fn().mockResolvedValue({ rating: 900, gamesPlayed: 5 }) },
      );

      await expect(service.joinTournament(buildUser("p1"), TOURNAMENT_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("rejects a swiss late join after the halfway point of rounds", async () => {
      const { service } = buildService({
        getGroupMemberIds: jest.fn().mockResolvedValue(["p1"]),
        getTournamentById: jest
          .fn()
          .mockResolvedValue(buildTournament({ status: "active", currentRound: 4, roundCount: 5 })),
      });

      await expect(service.joinTournament(buildUser("p1"), TOURNAMENT_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("allows an eligible player to join", async () => {
      const { service, repository } = buildService({
        getGroupMemberIds: jest.fn().mockResolvedValue(["p1"]),
      });

      await service.joinTournament(buildUser("p1"), TOURNAMENT_ID);

      expect(repository.insertPlayer).toHaveBeenCalledWith(TOURNAMENT_ID, "p1");
    });
  });

  describe("startTournament / assertManager", () => {
    it("throws ForbiddenException when a non-owner, non-admin tries to start it", async () => {
      const { service } = buildService();

      await expect(
        service.startTournament(buildUser(OTHER_TEACHER_ID), TOURNAMENT_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("allows an admin to start someone else's tournament", async () => {
      const { service, repository } = buildService({
        getPlayersWithNames: jest.fn().mockResolvedValue([buildPlayer("p1"), buildPlayer("p2")]),
      });

      await service.startTournament(buildUser(ADMIN_ID, ["admin"]), TOURNAMENT_ID);

      expect(repository.updateTournamentStatus).toHaveBeenCalledWith(
        TOURNAMENT_ID,
        expect.objectContaining({ status: "active", currentRound: 1 }),
      );
    });

    it("generates round-1 pairings for a swiss tournament on start", async () => {
      const { service, chessMatchService } = buildService({
        getPlayersWithNames: jest
          .fn()
          .mockResolvedValue([
            buildPlayer("p1"),
            buildPlayer("p2"),
            buildPlayer("p3"),
            buildPlayer("p4"),
          ]),
      });

      await service.startTournament(buildUser(TEACHER_ID), TOURNAMENT_ID);

      expect(chessMatchService.createDirectMatch).toHaveBeenCalledTimes(2);
    });

    it("creates one match per invited student against the host for a simul", async () => {
      const { service, chessMatchService } = buildService({
        getTournamentById: jest
          .fn()
          .mockResolvedValue(buildTournament({ format: "simul", hostUserId: TEACHER_ID })),
        getPlayersWithNames: jest.fn().mockResolvedValue([buildPlayer("s1"), buildPlayer("s2")]),
      });

      await service.startTournament(buildUser(TEACHER_ID), TOURNAMENT_ID);

      expect(chessMatchService.createDirectMatch).toHaveBeenCalledWith(
        expect.objectContaining({ whiteUserId: TEACHER_ID, blackUserId: "s1" }),
      );
      expect(chessMatchService.createDirectMatch).toHaveBeenCalledWith(
        expect.objectContaining({ whiteUserId: TEACHER_ID, blackUserId: "s2" }),
      );
    });
  });

  describe("generateNextRound", () => {
    it("throws when the tournament is not a swiss tournament", async () => {
      const { service } = buildService({
        getTournamentById: jest.fn().mockResolvedValue(buildTournament({ format: "arena" })),
      });

      await expect(
        service.generateNextRound(buildUser(TEACHER_ID), TOURNAMENT_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws once all rounds have already been played", async () => {
      const { service } = buildService({
        getTournamentById: jest
          .fn()
          .mockResolvedValue(buildTournament({ status: "active", currentRound: 3, roundCount: 3 })),
      });

      await expect(
        service.generateNextRound(buildUser(TEACHER_ID), TOURNAMENT_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("syncs results before pairing the next round", async () => {
      const { service, repository } = buildService({
        getTournamentById: jest
          .fn()
          .mockResolvedValue(buildTournament({ status: "active", currentRound: 1, roundCount: 3 })),
        getPlayersWithNames: jest.fn().mockResolvedValue([buildPlayer("p1"), buildPlayer("p2")]),
      });

      await service.generateNextRound(buildUser(TEACHER_ID), TOURNAMENT_ID);

      expect(repository.syncPairingResults).toHaveBeenCalledWith(TOURNAMENT_ID);
    });
  });

  describe("pairNextArena", () => {
    it("does not re-pair a player whose current match is still in progress", async () => {
      const { service, chessMatchService } = buildService({
        getTournamentById: jest.fn().mockResolvedValue(buildTournament({ format: "arena" })),
        getPlayersWithNames: jest
          .fn()
          .mockResolvedValue([buildPlayer("busy"), buildPlayer("free1"), buildPlayer("free2")]),
        getPairings: jest
          .fn()
          .mockResolvedValue([
            { whiteUserId: "busy", blackUserId: "someone-else", matchId: "match-x", result: null },
          ]),
      });

      await service.pairNextArena(buildUser(TEACHER_ID), TOURNAMENT_ID);

      const calledWith = (chessMatchService.createDirectMatch as jest.Mock).mock.calls.map(
        (call) => call[0],
      );
      expect(
        calledWith.some((args) => args.whiteUserId === "busy" || args.blackUserId === "busy"),
      ).toBe(false);
    });
  });

  describe("getStandings", () => {
    it("returns per-player scores with display names attached", async () => {
      const { service } = buildService({
        getPlayersWithNames: jest.fn().mockResolvedValue([buildPlayer("p1", "Nguyen", "Van A")]),
        getPairings: jest.fn().mockResolvedValue([]),
      });

      const standings = await service.getStandings(TOURNAMENT_ID);

      expect(standings.standings[0]).toMatchObject({
        userId: "p1",
        displayName: "Nguyen Van A",
        score: 0,
      });
    });
  });

  describe("exportTrf", () => {
    it("includes the tournament name in the exported text", async () => {
      const { service } = buildService({
        getPlayersWithNames: jest.fn().mockResolvedValue([buildPlayer("p1")]),
        getPairings: jest.fn().mockResolvedValue([]),
      });

      const trf = await service.exportTrf(buildUser(TEACHER_ID), TOURNAMENT_ID);

      expect(trf).toContain("Test tournament");
    });

    it("throws ForbiddenException when a non-owner tries to export", async () => {
      const { service } = buildService();

      await expect(
        service.exportTrf(buildUser(OTHER_TEACHER_ID), TOURNAMENT_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
