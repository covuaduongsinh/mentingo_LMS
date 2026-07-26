import { Module } from "@nestjs/common";

import { FileModule } from "src/file/files.module";
import { PermissionsModule } from "src/permissions/permissions.module";
import { SettingsModule } from "src/settings/settings.module";

import { CommunitySocialRepository } from "./community-social.repository";
import { CommunitySocialService } from "./community-social.service";
import { CommunityController } from "./community.controller";
import { CommunityRepository } from "./community.repository";
import { CommunityService } from "./community.service";

@Module({
  imports: [PermissionsModule, SettingsModule, FileModule],
  controllers: [CommunityController],
  providers: [
    CommunityService,
    CommunityRepository,
    CommunitySocialService,
    CommunitySocialRepository,
  ],
})
export class CommunityModule {}
