import { Module } from "@nestjs/common";

import { CourseModule } from "src/courses/course.module";

import { SeoRepository } from "./repositories/seo.repository";
import { SeoController } from "./seo.controller";
import { SeoService } from "./seo.service";

@Module({
  imports: [CourseModule],
  controllers: [SeoController],
  providers: [SeoService, SeoRepository],
})
export class SeoModule {}
