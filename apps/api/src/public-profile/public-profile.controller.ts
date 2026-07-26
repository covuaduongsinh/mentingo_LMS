import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse } from "src/common";
import { Public } from "src/common/decorators/public.decorator";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { PermissionsGuard } from "src/common/guards/permissions.guard";
import { CurrentUserType } from "src/common/types/current-user.type";
import {
  publicProfileSchema,
  publicProfileSettingsSchema,
  updatePublicProfileSettingsBodySchema,
  type UpdatePublicProfileSettingsBody,
} from "src/public-profile/schemas/public-profile.schema";

import { PublicProfileService } from "./public-profile.service";

@UseGuards(PermissionsGuard)
@Controller("public-profile")
export class PublicProfileController {
  constructor(private readonly publicProfileService: PublicProfileService) {}

  @Get("settings/me")
  @RequirePermission(PERMISSIONS.ACCOUNT_READ_SELF)
  @Validate({
    response: baseResponse(publicProfileSettingsSchema),
  })
  async getOwnSettings(@CurrentUser() currentUser: CurrentUserType) {
    return new BaseResponse(await this.publicProfileService.getOwnSettings(currentUser.userId));
  }

  @Patch("settings")
  @RequirePermission(PERMISSIONS.ACCOUNT_UPDATE_SELF)
  @Validate({
    request: [{ type: "body", schema: updatePublicProfileSettingsBodySchema }],
  })
  async updateSettings(
    @Body() data: UpdatePublicProfileSettingsBody,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    await this.publicProfileService.updateSettings(
      { userId: currentUser.userId, tenantId: currentUser.tenantId },
      data,
    );
  }

  @Public()
  @Get(":username")
  @Validate({
    request: [{ type: "param", name: "username", schema: Type.String() }],
    response: baseResponse(publicProfileSchema),
  })
  async getPublicProfile(@Param("username") username: string) {
    return new BaseResponse(await this.publicProfileService.getPublicProfile(username));
  }
}
