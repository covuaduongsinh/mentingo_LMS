import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { ChessAnalysisService } from "../chess-analysis.service";

import type { ChessAnalysisRepository } from "../chess-analysis.repository";
import type { CurrentUserType } from "src/common/types/current-user.type";

const SESSION_ID = "session-1";
const HOST_ID = "host-1";
const VIEWER_ID = "viewer-1";
const TENANT_ID = "tenant-1";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const buildUser = (userId: string, tenantId = TENANT_ID) =>
  ({ userId, tenantId }) as unknown as CurrentUserType;

describe("ChessAnalysisService", () => {
  const buildService = (repositoryOverrides: Partial<ChessAnalysisRepository> = {}) => {
    const repository = {
      createSession: jest.fn().mockResolvedValue({ id: SESSION_ID }),
      getSessionById: jest.fn(),
      upsertParticipant: jest.fn().mockResolvedValue(undefined),
      markParticipantLeft: jest.fn().mockResolvedValue(undefined),
      getParticipantRole: jest.fn().mockResolvedValue(undefined),
      applyMove: jest.fn().mockResolvedValue(undefined),
      resetFen: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
      ...repositoryOverrides,
    } as unknown as ChessAnalysisRepository;

    return { service: new ChessAnalysisService(repository), repository };
  };

  describe("createSession", () => {
    it("creates a session and registers the creator as host", async () => {
      const { service, repository } = buildService();

      const result = await service.createSession(buildUser(HOST_ID), { name: "Room" });

      expect(result).toEqual({ id: SESSION_ID });
      expect(repository.upsertParticipant).toHaveBeenCalledWith(SESSION_ID, HOST_ID, "host");
    });

    it("rejects an invalid FEN", async () => {
      const { service } = buildService();

      await expect(
        service.createSession(buildUser(HOST_ID), { fen: "not-a-fen" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("joinSession", () => {
    it("throws NotFoundException for a missing session", async () => {
      const { service } = buildService({ getSessionById: jest.fn().mockResolvedValue(undefined) });

      await expect(service.joinSession(SESSION_ID, buildUser(VIEWER_ID))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("rejects joining a session from a different tenant", async () => {
      const { service } = buildService({
        getSessionById: jest
          .fn()
          .mockResolvedValue({ id: SESSION_ID, hostUserId: HOST_ID, tenantId: "other-tenant" }),
      });

      await expect(service.joinSession(SESSION_ID, buildUser(VIEWER_ID))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("assigns the host role to the session creator and viewer to everyone else", async () => {
      const { service, repository } = buildService({
        getSessionById: jest
          .fn()
          .mockResolvedValue({ id: SESSION_ID, hostUserId: HOST_ID, tenantId: TENANT_ID }),
      });

      const hostResult = await service.joinSession(SESSION_ID, buildUser(HOST_ID));
      const viewerResult = await service.joinSession(SESSION_ID, buildUser(VIEWER_ID));

      expect(hostResult.role).toBe("host");
      expect(viewerResult.role).toBe("viewer");
      expect(repository.upsertParticipant).toHaveBeenCalledWith(SESSION_ID, VIEWER_ID, "viewer");
    });
  });

  describe("applyMove", () => {
    it("validates the move server-side and persists the resulting FEN", async () => {
      const { service, repository } = buildService({
        getSessionById: jest.fn().mockResolvedValue({
          id: SESSION_ID,
          tenantId: TENANT_ID,
          status: "active",
          currentFen: START_FEN,
          moveList: [],
        }),
      });

      const result = await service.applyMove(SESSION_ID, buildUser(VIEWER_ID), "e2e4");

      expect(result.moveList).toEqual(["e2e4"]);
      expect(result.fen).toContain("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR");
      expect(repository.applyMove).toHaveBeenCalledWith(SESSION_ID, result.fen, ["e2e4"]);
    });

    it("rejects an illegal move without persisting anything", async () => {
      const { service, repository } = buildService({
        getSessionById: jest.fn().mockResolvedValue({
          id: SESSION_ID,
          tenantId: TENANT_ID,
          status: "active",
          currentFen: START_FEN,
          moveList: [],
        }),
      });

      await expect(
        service.applyMove(SESSION_ID, buildUser(VIEWER_ID), "e2e5"),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.applyMove).not.toHaveBeenCalled();
    });

    it("rejects moves once the session has ended", async () => {
      const { service } = buildService({
        getSessionById: jest.fn().mockResolvedValue({
          id: SESSION_ID,
          tenantId: TENANT_ID,
          status: "ended",
          currentFen: START_FEN,
          moveList: [],
        }),
      });

      await expect(
        service.applyMove(SESSION_ID, buildUser(VIEWER_ID), "e2e4"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("host-only actions", () => {
    it("rejects resetFen from a non-host participant", async () => {
      const { service } = buildService({
        getSessionById: jest
          .fn()
          .mockResolvedValue({ id: SESSION_ID, hostUserId: HOST_ID, tenantId: TENANT_ID }),
      });

      await expect(
        service.resetFen(SESSION_ID, buildUser(VIEWER_ID), START_FEN),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("allows the host to reset the FEN", async () => {
      const { service, repository } = buildService({
        getSessionById: jest
          .fn()
          .mockResolvedValue({ id: SESSION_ID, hostUserId: HOST_ID, tenantId: TENANT_ID }),
      });

      await service.resetFen(SESSION_ID, buildUser(HOST_ID), START_FEN);

      expect(repository.resetFen).toHaveBeenCalledWith(SESSION_ID, START_FEN);
    });

    it("rejects endSession from a non-host participant", async () => {
      const { service } = buildService({
        getSessionById: jest
          .fn()
          .mockResolvedValue({ id: SESSION_ID, hostUserId: HOST_ID, tenantId: TENANT_ID }),
      });

      await expect(service.endSession(SESSION_ID, buildUser(VIEWER_ID))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
