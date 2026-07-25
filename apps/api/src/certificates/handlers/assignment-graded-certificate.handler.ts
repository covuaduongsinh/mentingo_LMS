import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { CERTIFICATE_ARCHIVE_REASONS } from "@repo/shared";
import { eq } from "drizzle-orm";

import { DatabasePg } from "src/common";
import { AssignmentGradedEvent } from "src/events/assignment/assignment-graded.event";
import { DB } from "src/storage/db/db.providers";
import { chapters, lessons } from "src/storage/schema";

import { CertificatesService } from "../certificates.service";

/**
 * Revokes a learner's certificate when a grade re-computation (typically a
 * trainer's manual re-grade of an assignment task) drops their overall
 * assignment result below the pass threshold. Only fires for regrades that
 * now fail — a first-time grading pass has no certificate yet to revoke,
 * and a regrade that still passes doesn't need one touched. Archiving only
 * (no progress reset) — see CertificatesService#archiveCertificateForFailedRequirement.
 */
@Injectable()
@EventsHandler(AssignmentGradedEvent)
export class AssignmentGradedCertificateHandler implements IEventHandler<AssignmentGradedEvent> {
  private readonly logger = new Logger(AssignmentGradedCertificateHandler.name);

  constructor(
    @Inject(DB) private readonly db: DatabasePg,
    private readonly certificatesService: CertificatesService,
  ) {}

  async handle(event: AssignmentGradedEvent) {
    if (!event.isRegrade || event.passed) return;

    const [lesson] = await this.db
      .select({ courseId: chapters.courseId })
      .from(lessons)
      .innerJoin(chapters, eq(chapters.id, lessons.chapterId))
      .where(eq(lessons.id, event.lessonId));

    if (!lesson) {
      this.logger.warn(`AssignmentGradedEvent for unknown lesson ${event.lessonId}, skipping`);
      return;
    }

    await this.certificatesService.archiveCertificateForFailedRequirement(
      event.userId,
      lesson.courseId,
      CERTIFICATE_ARCHIVE_REASONS.ASSIGNMENT_REGRADE,
    );
  }
}
