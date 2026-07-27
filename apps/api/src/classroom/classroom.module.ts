import { Module } from "@nestjs/common";

import { ActivityLogsModule } from "src/activity-logs/activity-logs.module";
import { SettingsModule } from "src/settings/settings.module";
import { UserModule } from "src/user/user.module";

import { ClassroomController } from "./classroom.controller";
import { ClassroomRepository } from "./classroom.repository";
import { ClassroomService } from "./classroom.service";

@Module({
  imports: [SettingsModule, ActivityLogsModule, UserModule],
  controllers: [ClassroomController],
  providers: [ClassroomService, ClassroomRepository],
  exports: [ClassroomService, ClassroomRepository],
})
export class ClassroomModule {}
