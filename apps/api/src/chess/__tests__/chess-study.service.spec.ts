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
});
