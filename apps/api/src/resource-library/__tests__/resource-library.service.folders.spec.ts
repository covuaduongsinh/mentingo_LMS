import { BadRequestException, NotFoundException } from "@nestjs/common";

import { ResourceLibraryService } from "../resource-library.service";

import type { DatabasePg } from "src/common";
import type { FileService } from "src/file/file.service";
import type { ResourceLibraryRepository } from "src/resource-library/resource-library.repository";

const FOLDER_ID = "folder-1";
const OTHER_FOLDER_ID = "folder-2";

describe("ResourceLibraryService — folders", () => {
  const buildService = (repositoryOverrides: Partial<ResourceLibraryRepository> = {}) => {
    const repository = {
      folderExists: jest.fn().mockResolvedValue(true),
      assetExists: jest.fn().mockResolvedValue(true),
      getFolderAncestorChain: jest.fn().mockResolvedValue([]),
      isFolderEmpty: jest.fn().mockResolvedValue(true),
      updateFolder: jest.fn().mockResolvedValue(undefined),
      deleteFolder: jest.fn().mockResolvedValue(undefined),
      createFolder: jest.fn().mockResolvedValue({ id: FOLDER_ID }),
      moveAsset: jest.fn().mockResolvedValue(undefined),
      ...repositoryOverrides,
    } as unknown as ResourceLibraryRepository;

    const fileService = {} as unknown as FileService;
    const db = {} as unknown as DatabasePg;

    return { service: new ResourceLibraryService(fileService, repository, db), repository };
  };

  describe("updateFolder — cycle detection", () => {
    it("rejects setting a folder as its own parent", async () => {
      const { service } = buildService();

      await expect(
        service.updateFolder(FOLDER_ID, { parentFolderId: FOLDER_ID }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects setting a parent whose ancestor chain contains the folder itself", async () => {
      const { service, repository } = buildService({
        getFolderAncestorChain: jest.fn().mockResolvedValue([OTHER_FOLDER_ID, FOLDER_ID]),
      });

      await expect(
        service.updateFolder(FOLDER_ID, { parentFolderId: OTHER_FOLDER_ID }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repository.updateFolder).not.toHaveBeenCalled();
    });

    it("allows a valid parent change when there is no cycle", async () => {
      const { service, repository } = buildService({
        getFolderAncestorChain: jest.fn().mockResolvedValue([OTHER_FOLDER_ID]),
      });

      await service.updateFolder(FOLDER_ID, { parentFolderId: OTHER_FOLDER_ID });

      expect(repository.updateFolder).toHaveBeenCalledWith(FOLDER_ID, {
        parentFolderId: OTHER_FOLDER_ID,
      });
    });

    it("allows moving a folder to the library root (null parent)", async () => {
      const { service, repository } = buildService();

      await service.updateFolder(FOLDER_ID, { parentFolderId: null });

      expect(repository.getFolderAncestorChain).not.toHaveBeenCalled();
      expect(repository.updateFolder).toHaveBeenCalledWith(FOLDER_ID, { parentFolderId: null });
    });

    it("throws NotFoundException when the folder itself does not exist", async () => {
      const { service } = buildService({
        folderExists: jest.fn().mockResolvedValue(false),
      });

      await expect(service.updateFolder(FOLDER_ID, { name: "New name" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("deleteFolder", () => {
    it("rejects deleting a non-empty folder", async () => {
      const { service, repository } = buildService({
        isFolderEmpty: jest.fn().mockResolvedValue(false),
      });

      await expect(service.deleteFolder(FOLDER_ID)).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.deleteFolder).not.toHaveBeenCalled();
    });

    it("deletes an empty folder", async () => {
      const { service, repository } = buildService({
        isFolderEmpty: jest.fn().mockResolvedValue(true),
      });

      await service.deleteFolder(FOLDER_ID);

      expect(repository.deleteFolder).toHaveBeenCalledWith(FOLDER_ID);
    });
  });

  describe("moveAsset", () => {
    it("moves an asset into an existing folder", async () => {
      const { service, repository } = buildService();

      const result = await service.moveAsset("asset-1", FOLDER_ID);

      expect(repository.moveAsset).toHaveBeenCalledWith("asset-1", FOLDER_ID);
      expect(result).toEqual({ resourceId: "asset-1", folderId: FOLDER_ID });
    });

    it("moves an asset back to the library root", async () => {
      const { service, repository } = buildService();

      const result = await service.moveAsset("asset-1", null);

      expect(repository.moveAsset).toHaveBeenCalledWith("asset-1", null);
      expect(result).toEqual({ resourceId: "asset-1", folderId: null });
    });

    it("throws NotFoundException when the target folder does not exist", async () => {
      const { service } = buildService({ folderExists: jest.fn().mockResolvedValue(false) });

      await expect(service.moveAsset("asset-1", FOLDER_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
