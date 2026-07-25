import { Inject, Injectable } from "@nestjs/common";
import { COURSE_STATUSES } from "@repo/shared";
import { eq } from "drizzle-orm";

import { DatabasePg } from "src/common";
import { courses } from "src/storage/schema";

@Injectable()
export class SeoRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async getPublishedCourses() {
    return this.db
      .select({ id: courses.id, updatedAt: courses.updatedAt })
      .from(courses)
      .where(eq(courses.status, COURSE_STATUSES.PUBLISHED));
  }
}
