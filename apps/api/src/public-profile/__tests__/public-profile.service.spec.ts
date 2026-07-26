import { BadRequestException, NotFoundException } from "@nestjs/common";

import { PublicProfileService } from "../public-profile.service";

import type { PublicProfileRepository } from "../public-profile.repository";
import type { FileService } from "src/file/file.service";

const USER_ID = "user-1";
const TENANT_ID = "tenant-1";

describe("PublicProfileService", () => {
  let repo: jest.Mocked<PublicProfileRepository>;
  let fileService: jest.Mocked<FileService>;
  let service: PublicProfileService;

  beforeEach(() => {
    repo = {
      getPublicProfileByUsername: jest.fn(),
      isUsernameTaken: jest.fn(),
      updateUsernameAndVisibility: jest.fn(),
      upsertBio: jest.fn(),
      getOwnSettings: jest.fn(),
    } as unknown as jest.Mocked<PublicProfileRepository>;

    fileService = {
      getFileUrl: jest.fn().mockResolvedValue("https://example.com/avatar.png"),
    } as unknown as jest.Mocked<FileService>;

    service = new PublicProfileService(repo, fileService);
  });

  describe("getPublicProfile", () => {
    it("throws not-found when the username doesn't exist", async () => {
      repo.getPublicProfileByUsername.mockResolvedValue(undefined as never);

      await expect(service.getPublicProfile("ghost")).rejects.toThrow(NotFoundException);
    });

    it("throws the same not-found error when publicProfileEnabled is false (repository already filters this)", async () => {
      // The repository query filters on publicProfileEnabled = true, so a
      // disabled profile also resolves to `undefined` here — asserting the
      // same generic error protects against a username-existence probe.
      repo.getPublicProfileByUsername.mockResolvedValue(undefined as never);

      await expect(service.getPublicProfile("private-user")).rejects.toThrow(NotFoundException);
    });

    it("returns the profile with a resolved avatar URL when an avatar is set", async () => {
      repo.getPublicProfileByUsername.mockResolvedValue({
        userId: USER_ID,
        username: "ada",
        firstName: "Ada",
        lastName: "Lovelace",
        avatarReference: "avatar-key",
        publicProfileEnabled: true,
        bio: "Mathematician",
      } as never);

      const result = await service.getPublicProfile("ada");

      expect(result).toEqual({
        userId: USER_ID,
        username: "ada",
        firstName: "Ada",
        lastName: "Lovelace",
        bio: "Mathematician",
        avatarUrl: "https://example.com/avatar.png",
      });
    });

    it("returns a null avatarUrl when no avatar is set, without calling the file service", async () => {
      repo.getPublicProfileByUsername.mockResolvedValue({
        userId: USER_ID,
        username: "ada",
        firstName: "Ada",
        lastName: "Lovelace",
        avatarReference: null,
        publicProfileEnabled: true,
        bio: null,
      } as never);

      const result = await service.getPublicProfile("ada");

      expect(result.avatarUrl).toBeNull();
      expect(fileService.getFileUrl).not.toHaveBeenCalled();
    });
  });

  describe("updateSettings", () => {
    it("rejects an invalid username pattern", async () => {
      await expect(
        service.updateSettings(
          { userId: USER_ID, tenantId: TENANT_ID },
          { username: "AB", publicProfileEnabled: false },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects a username that's already taken by someone else", async () => {
      repo.isUsernameTaken.mockResolvedValue(true);

      await expect(
        service.updateSettings(
          { userId: USER_ID, tenantId: TENANT_ID },
          { username: "taken-name", publicProfileEnabled: false },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects enabling the public profile without a username", async () => {
      await expect(
        service.updateSettings(
          { userId: USER_ID, tenantId: TENANT_ID },
          { username: null, publicProfileEnabled: true },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("updates username/visibility and upserts the bio when everything is valid", async () => {
      repo.isUsernameTaken.mockResolvedValue(false);

      await service.updateSettings(
        { userId: USER_ID, tenantId: TENANT_ID },
        { username: "ada-lovelace", publicProfileEnabled: true, bio: "Hello" },
      );

      expect(repo.updateUsernameAndVisibility).toHaveBeenCalledWith(USER_ID, {
        username: "ada-lovelace",
        publicProfileEnabled: true,
      });
      expect(repo.upsertBio).toHaveBeenCalledWith(USER_ID, TENANT_ID, "Hello");
    });

    it("allows clearing the username while disabling the public profile", async () => {
      await service.updateSettings(
        { userId: USER_ID, tenantId: TENANT_ID },
        { username: null, publicProfileEnabled: false },
      );

      expect(repo.isUsernameTaken).not.toHaveBeenCalled();
      expect(repo.updateUsernameAndVisibility).toHaveBeenCalledWith(USER_ID, {
        username: null,
        publicProfileEnabled: false,
      });
    });
  });
});
