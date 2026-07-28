import { forwardRef, Module } from "@nestjs/common";

import { ActivityLogsModule } from "src/activity-logs/activity-logs.module";
import { AnnouncementsModule } from "src/announcements/announcements.module";
import { ChessModule } from "src/chess/chess.module";
import { CourseModule } from "src/courses/course.module";
import { SettingsModule } from "src/settings/settings.module";
import { UserModule } from "src/user/user.module";

import { ClassroomController } from "./classroom.controller";
import { ClassroomCron } from "./classroom.cron";
import { ClassroomRepository } from "./classroom.repository";
import { ClassroomService } from "./classroom.service";

@Module({
  imports: [
    SettingsModule,
    ActivityLogsModule,
    UserModule,
    AnnouncementsModule,
    ChessModule,
    forwardRef(() => CourseModule),
  ],
  controllers: [ClassroomController],
  providers: [ClassroomService, ClassroomRepository, ClassroomCron],
  exports: [ClassroomService, ClassroomRepository],
})
export class ClassroomModule {}
