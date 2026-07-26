import { Module } from "@nestjs/common";

import { FileModule } from "src/file/files.module";
import { PermissionsModule } from "src/permissions/permissions.module";

import { PublicProfileController } from "./public-profile.controller";
import { PublicProfileRepository } from "./public-profile.repository";
import { PublicProfileService } from "./public-profile.service";

@Module({
  imports: [PermissionsModule, FileModule],
  controllers: [PublicProfileController],
  providers: [PublicProfileService, PublicProfileRepository],
})
export class PublicProfileModule {}
