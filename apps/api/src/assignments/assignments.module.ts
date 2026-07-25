import { Module } from "@nestjs/common";

import { AiModule } from "src/ai/ai.module";
import { LessonModule } from "src/lesson/lesson.module";
import { LocalizationModule } from "src/localization/localization.module";

import { AssignmentsController } from "./assignments.controller";
import { AssignmentsRepository } from "./assignments.repository";
import { AssignmentsService } from "./assignments.service";
import { AssignmentAiGraderService } from "./graders/assignment-ai-grader.service";

// OutboxPublisher (used by AssignmentsService) comes from the @Global()
// OutboxModule already imported once in AppModule — no explicit import
// needed here, matching LessonModule's convention.
// LessonModule is imported only for AdminLessonRepository's
// getMaxDisplayOrder/updateLessonCountForChapter helpers, reused so the
// chapter's lesson count and ordering stay correct for assignment lessons too.
@Module({
  imports: [AiModule, LessonModule, LocalizationModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentsRepository, AssignmentAiGraderService],
  exports: [AssignmentsService, AssignmentsRepository],
})
export class AssignmentsModule {}
