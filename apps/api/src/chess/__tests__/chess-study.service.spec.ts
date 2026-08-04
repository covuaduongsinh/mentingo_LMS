import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { ChessStudyService } from "../chess-study.service";

import type { ChessStudyRepository } from "../chess-study.repository";
import type { CurrentUserType } from "src/common/types/current-user.type";

const STUDY_ID = "study-1";
const OWNER_ID = "owner-1";
const OTHER_ID = "other-1";
const MEMBER_ID = "member-1";
const TENANT_ID = "tenant-1";

const buildUser = (userId: string, permissions: string[] = []) =>
  ({ userId, tenantId: TENANT_ID, permissions }) as unknown as CurrentUserType;

const buildStudy = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: STUDY_ID,
  authorId: OWNER_ID,
  visibility: "private",
  title: "Rook endgames",
  chapterCount: 0,
  ...overrides,
});

describe("ChessStudyService", () => {
  describe("importStudyPgn (S1)", () => {
    const samplePgn = `[Event "Import me"]
[White "A"]
[Black "B"]
[Result "*"]

1. e4 e5 *
`;

    it("creates chapters for the owner from a valid PGN", async () => {
      const createChaptersFromImport = jest.fn().mockResolvedValue([{ id: "ch-1" }]);
      const { service, repository } = buildService({ createChaptersFromImport });

      const result = await service.importStudyPgn(
        STUDY_ID,
        { pgn: samplePgn },
        buildUser(OWNER_ID),
      );
      expect(createChaptersFromImport).toHaveBeenCalled();
      const bodies = (repository.createChaptersFromImport as jest.Mock).mock.calls[0][1];
      expect(bodies[0].title).toBe("Import me");
      expect(bodies[0].moveNodes.length).toBe(2);
      expect(result).toEqual([{ id: "ch-1" }]);
    });

    it("rejects import for a non-writer", async () => {
      const { service } = buildService();
      await expect(
        service.importStudyPgn(STUDY_ID, { pgn: samplePgn }, buildUser(OTHER_ID)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects invalid PGN with BadRequestException", async () => {
      const { service } = buildService();
      await expect(
        service.importStudyPgn(STUDY_ID, { pgn: "not a real pgn at all" }, buildUser(OWNER_ID)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  const buildService = (repositoryOverrides: Partial<ChessStudyRepository> = {}) => {
    const repository = {
      listStudies: jest.fn(),
      getStudyById: jest.fn().mockResolvedValue(buildStudy()),
      getChaptersByStudyId: jest.fn().mockResolvedValue([]),
      getChapterById: jest.fn(),
      getMembersByStudyId: jest.fn().mockResolvedValue([]),
      getMemberRole: jest.fn().mockResolvedValue(null),
      createStudy: jest.fn(),
      updateStudy: jest.fn().mockResolvedValue(buildStudy()),
      deleteStudy: jest.fn().mockResolvedValue(true),
      cloneStudy: jest.fn(),
      createChapter: jest.fn(),
      updateChapter: jest.fn(),
      deleteChapter: jest.fn(),
      reorderChapters: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
      insertPracticeAttempt: jest.fn().mockResolvedValue(undefined),
      getBestMovesUsed: jest.fn().mockResolvedValue(null),
      findNextIncompletePracticeChapter: jest.fn().mockResolvedValue(null),
      createChaptersFromImport: jest.fn().mockResolvedValue([]),
      ...repositoryOverrides,
    } as unknown as ChessStudyRepository;

    return { service: new ChessStudyService(repository), repository };
  };

  describe("getStudyDetail (read access)", () => {
    it("a public study is readable by anyone", async () => {
      const { service } = buildService({
        getStudyById: jest.fn().mockResolvedValue(buildStudy({ visibility: "public" })),
      });

      await expect(service.getStudyDetail(STUDY_ID, buildUser(OTHER_ID))).resolves.toMatchObject({
        id: STUDY_ID,
      });
    });

    it("a private study is readable by its owner", async () => {
      const { service } = buildService();

      await expect(service.getStudyDetail(STUDY_ID, buildUser(OWNER_ID))).resolves.toMatchObject({
        canWrite: true,
      });
    });

    it("a private study is not readable by an unrelated user", async () => {
      const { service } = buildService();

      await expect(service.getStudyDetail(STUDY_ID, buildUser(OTHER_ID))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("a private study is readable by a read-only member", async () => {
      const { service } = buildService({
        getMemberRole: jest.fn().mockResolvedValue("read"),
      });

      const result = await service.getStudyDetail(STUDY_ID, buildUser(MEMBER_ID));
      expect(result.canWrite).toBe(false);
    });

    it("a private study is readable and writable by a write member", async () => {
      const { service } = buildService({
        getMemberRole: jest.fn().mockResolvedValue("write"),
      });

      const result = await service.getStudyDetail(STUDY_ID, buildUser(MEMBER_ID));
      expect(result.canWrite).toBe(true);
    });

    it("an admin (chess.study.manage) can read any study", async () => {
      const { service } = buildService();

      await expect(
        service.getStudyDetail(STUDY_ID, buildUser(OTHER_ID, ["chess.study.manage"])),
      ).resolves.toMatchObject({ canWrite: true });
    });

    it("throws NotFoundException when the study does not exist", async () => {
      const { service } = buildService({ getStudyById: jest.fn().mockResolvedValue(null) });

      await expect(service.getStudyDetail(STUDY_ID, buildUser(OWNER_ID))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("updateStudy (write access)", () => {
    it("the owner can update their own study", async () => {
      const { service, repository } = buildService();

      await service.updateStudy(STUDY_ID, { title: "New title" }, buildUser(OWNER_ID));

      expect(repository.updateStudy).toHaveBeenCalledWith(STUDY_ID, { title: "New title" });
    });

    it("a read-only member cannot update", async () => {
      const { service } = buildService({ getMemberRole: jest.fn().mockResolvedValue("read") });

      await expect(
        service.updateStudy(STUDY_ID, { title: "New title" }, buildUser(MEMBER_ID)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("a write member can update", async () => {
      const { service, repository } = buildService({
        getMemberRole: jest.fn().mockResolvedValue("write"),
      });

      await service.updateStudy(STUDY_ID, { title: "New title" }, buildUser(MEMBER_ID));

      expect(repository.updateStudy).toHaveBeenCalled();
    });

    it("an unrelated user cannot update", async () => {
      const { service } = buildService();

      await expect(
        service.updateStudy(STUDY_ID, { title: "New title" }, buildUser(OTHER_ID)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("deleteStudy (manage access — stricter than write)", () => {
    it("the owner can delete", async () => {
      const { service, repository } = buildService();

      await service.deleteStudy(STUDY_ID, buildUser(OWNER_ID));

      expect(repository.deleteStudy).toHaveBeenCalledWith(STUDY_ID);
    });

    it("a write member cannot delete — only the owner or an admin can", async () => {
      const { service } = buildService({ getMemberRole: jest.fn().mockResolvedValue("write") });

      await expect(service.deleteStudy(STUDY_ID, buildUser(MEMBER_ID))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe("cloneStudy", () => {
    it("throws NotFoundException if the source study disappears mid-clone", async () => {
      const { service } = buildService({
        getStudyById: jest.fn().mockResolvedValue(buildStudy({ visibility: "public" })),
        cloneStudy: jest.fn().mockResolvedValue(null),
      });

      await expect(service.cloneStudy(STUDY_ID, buildUser(OTHER_ID))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("reorderChapters", () => {
    it("rejects a chapter id list that doesn't exactly match the study's chapters", async () => {
      const { service } = buildService({
        getChaptersByStudyId: jest.fn().mockResolvedValue([{ id: "c1" }, { id: "c2" }]),
      });

      await expect(
        service.reorderChapters(STUDY_ID, { chapterIds: ["c1"] }, buildUser(OWNER_ID)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("accepts a matching permutation of chapter ids", async () => {
      const { service, repository } = buildService({
        getChaptersByStudyId: jest.fn().mockResolvedValue([{ id: "c1" }, { id: "c2" }]),
      });

      await service.reorderChapters(STUDY_ID, { chapterIds: ["c2", "c1"] }, buildUser(OWNER_ID));

      expect(repository.reorderChapters).toHaveBeenCalledWith(STUDY_ID, ["c2", "c1"]);
    });
  });

  describe("addMember", () => {
    it("rejects adding the study's own owner as a member", async () => {
      const { service } = buildService();

      await expect(
        service.addMember(STUDY_ID, { userId: OWNER_ID }, buildUser(OWNER_ID)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("only the owner or an admin can add members, not a write collaborator", async () => {
      const { service } = buildService({ getMemberRole: jest.fn().mockResolvedValue("write") });

      await expect(
        service.addMember(STUDY_ID, { userId: OTHER_ID }, buildUser(MEMBER_ID)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("the owner can add a new member", async () => {
      const { service, repository } = buildService();

      await service.addMember(STUDY_ID, { userId: OTHER_ID, role: "read" }, buildUser(OWNER_ID));

      expect(repository.addMember).toHaveBeenCalledWith(STUDY_ID, {
        userId: OTHER_ID,
        role: "read",
      });
    });
  });

  describe("submitPracticeAttempt", () => {
    const CHAPTER_ID = "chapter-1";
    const START_FEN = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2";

    const buildChapter = (overrides: Partial<Record<string, unknown>> = {}) => ({
      id: CHAPTER_ID,
      studyId: STUDY_ID,
      rootFen: START_FEN,
      practiceGoalType: "checkmate_in_n",
      practiceGoalTargetValue: 1,
      ...overrides,
    });

    it("throws NotFoundException when the chapter doesn't belong to the study", async () => {
      const { service } = buildService({
        getChapterById: jest.fn().mockResolvedValue(buildChapter({ studyId: "other-study" })),
      });

      await expect(
        service.submitPracticeAttempt(
          STUDY_ID,
          CHAPTER_ID,
          { movesUci: ["d8h4"] },
          buildUser(OWNER_ID),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when the chapter has no structured practice goal", async () => {
      const { service } = buildService({
        getChapterById: jest.fn().mockResolvedValue(buildChapter({ practiceGoalType: null })),
      });

      await expect(
        service.submitPracticeAttempt(
          STUDY_ID,
          CHAPTER_ID,
          { movesUci: ["d8h4"] },
          buildUser(OWNER_ID),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws BadRequestException when the submitted move sequence is illegal", async () => {
      const { service } = buildService({
        getChapterById: jest.fn().mockResolvedValue(buildChapter()),
      });

      await expect(
        service.submitPracticeAttempt(
          STUDY_ID,
          CHAPTER_ID,
          { movesUci: ["a1a8"] },
          buildUser(OWNER_ID),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("grades the fool's-mate sequence as achieving a checkmate-in-1 goal and records the attempt", async () => {
      const { service, repository } = buildService({
        getChapterById: jest.fn().mockResolvedValue(buildChapter()),
        getBestMovesUsed: jest.fn().mockResolvedValue(1),
      });

      const result = await service.submitPracticeAttempt(
        STUDY_ID,
        CHAPTER_ID,
        { movesUci: ["d8h4"] },
        buildUser(OWNER_ID),
      );

      expect(result).toEqual({ achievedGoal: true, movesUsed: 1, bestMovesUsed: 1 });
      expect(repository.insertPracticeAttempt).toHaveBeenCalledWith({
        chapterId: CHAPTER_ID,
        userId: OWNER_ID,
        movesUsed: 1,
        achievedGoal: true,
      });
    });

    it("grades a legal move sequence that doesn't reach the goal as not achieved", async () => {
      const { service } = buildService({
        getChapterById: jest.fn().mockResolvedValue(buildChapter()),
      });

      const result = await service.submitPracticeAttempt(
        STUDY_ID,
        CHAPTER_ID,
        { movesUci: ["e5e4"] },
        buildUser(OWNER_ID),
      );

      expect(result.achievedGoal).toBe(false);
    });

    it("rejects a user without read access to the study", async () => {
      const { service } = buildService({
        getChapterById: jest.fn().mockResolvedValue(buildChapter()),
      });

      await expect(
        service.submitPracticeAttempt(
          STUDY_ID,
          CHAPTER_ID,
          { movesUci: ["d8h4"] },
          buildUser(OTHER_ID),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("getContinueChapterId", () => {
    it("delegates to the repository once read access is confirmed", async () => {
      const { service, repository } = buildService({
        findNextIncompletePracticeChapter: jest.fn().mockResolvedValue("chapter-2"),
      });

      await expect(service.getContinueChapterId(STUDY_ID, buildUser(OWNER_ID))).resolves.toBe(
        "chapter-2",
      );
      expect(repository.findNextIncompletePracticeChapter).toHaveBeenCalledWith(STUDY_ID, OWNER_ID);
    });

    it("rejects a user without read access to the study", async () => {
      const { service } = buildService();

      await expect(
        service.getContinueChapterId(STUDY_ID, buildUser(OTHER_ID)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
