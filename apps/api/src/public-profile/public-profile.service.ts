import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { FileService } from "src/file/file.service";
import { PublicProfileRepository } from "src/public-profile/public-profile.repository";

import type { UUIDType } from "src/common";
import type { UpdatePublicProfileSettingsBody } from "src/public-profile/schemas/public-profile.schema";

const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;

@Injectable()
export class PublicProfileService {
  constructor(
    private readonly publicProfileRepository: PublicProfileRepository,
    private readonly fileService: FileService,
  ) {}

  async getPublicProfile(username: string) {
    const profile = await this.publicProfileRepository.getPublicProfileByUsername(username);

    // Deliberately the same "not found" response whether the username doesn't
    // exist or exists with publicProfileEnabled=false, so the endpoint can't
    // be used to probe which usernames are registered (see business spec).
    if (!profile) {
      throw new NotFoundException("publicProfileView.errors.profileNotFound");
    }

    const avatarUrl = profile.avatarReference
      ? await this.fileService.getFileUrl(profile.avatarReference).catch(() => null)
      : null;

    return {
      userId: profile.userId,
      username: profile.username as string,
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio,
      avatarUrl,
    };
  }

  async getOwnSettings(userId: UUIDType) {
    const settings = await this.publicProfileRepository.getOwnSettings(userId);

    return {
      username: settings?.username ?? null,
      publicProfileEnabled: settings?.publicProfileEnabled ?? false,
      bio: settings?.bio ?? null,
    };
  }

  async updateSettings(
    currentUser: { userId: UUIDType; tenantId: UUIDType },
    data: UpdatePublicProfileSettingsBody,
  ) {
    if (data.username !== null) {
      if (!USERNAME_PATTERN.test(data.username)) {
        throw new BadRequestException("publicProfileView.errors.invalidUsername");
      }

      const taken = await this.publicProfileRepository.isUsernameTaken(
        data.username,
        currentUser.userId,
      );

      if (taken) {
        throw new BadRequestException("publicProfileView.errors.usernameTaken");
      }
    }

    if (data.publicProfileEnabled && !data.username) {
      throw new BadRequestException("publicProfileView.errors.usernameRequiredToEnable");
    }

    await this.publicProfileRepository.updateUsernameAndVisibility(currentUser.userId, {
      username: data.username,
      publicProfileEnabled: data.publicProfileEnabled,
    });

    if (data.bio !== undefined) {
      await this.publicProfileRepository.upsertBio(
        currentUser.userId,
        currentUser.tenantId,
        data.bio,
      );
    }
  }
}
