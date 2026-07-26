import { Module } from "@nestjs/common";

import { PermissionsModule } from "src/permissions/permissions.module";
import { SettingsModule } from "src/settings/settings.module";

import { CommunityController } from "./community.controller";
import { CommunityRepository } from "./community.repository";
import { CommunityService } from "./community.service";

@Module({
  imports: [PermissionsModule, SettingsModule],
  controllers: [CommunityController],
  providers: [CommunityService, CommunityRepository],
})
export class CommunityModule {}
