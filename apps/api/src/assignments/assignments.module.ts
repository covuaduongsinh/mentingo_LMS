import { forwardRef, Module } from "@nestjs/common";

import { AiModule } from "src/ai/ai.module";
import { CourseModule } from "src/courses/course.module";
import { FileModule } from "src/file/files.module";
import { LessonModule } from "src/lesson/lesson.module";
import { LocalizationModule } from "src/localization/localization.module";

import { AssignmentsController } from "./assignments.controller";
import { AssignmentsRepository } from "./assignments.repository";
import { AssignmentsService } from "./assignments.service";
import { AssignmentAiGraderService } from "./graders/assignment-ai-grader.service";

// OutboxPublisher (used by AssignmentsService) comes from the @Global()
// OutboxModule already imported once in AppModule — no explicit import
// needed here, matching LessonModule's convention.
// LessonModule is imported for AdminLessonRepository's
// getMaxDisplayOrder/updateLessonCountForChapter helpers (chapter lesson
// count/ordering) AND for AdminLessonService's validateAccess /
// publishCreateLessonEvent, reused so assignment lessons get the same
// per-course ownership check and activity-log event as every other lesson
// type. CourseModule (forwardRef, matching LessonModule's own import of it)
// is for MasterCourseService / CourseFeaturePolicyService — the
// content-lock and curriculum-editing-feature-flag checks other lesson
// types already enforce on create.
@Module({
  imports: [AiModule, LessonModule, LocalizationModule, FileModule, forwardRef(() => CourseModule)],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentsRepository, AssignmentAiGraderService],
  exports: [AssignmentsService, AssignmentsRepository],
})
export class AssignmentsModule {}
