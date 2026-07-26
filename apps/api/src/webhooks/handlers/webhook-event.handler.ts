import { Injectable, Logger } from "@nestjs/common";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";

import { AssignmentGradedEvent } from "src/events/assignment/assignment-graded.event";
import { AssignmentSubmittedEvent } from "src/events/assignment/assignment-submitted.event";
import { CertificateIssuedEvent } from "src/events/certificate/certificate-issued.event";
import { EnrollCourseEvent } from "src/events/course/enroll-course.event";
import { LessonCompletedEvent } from "src/events/lesson/lesson-completed.event";
import { UserCourseFinishedEvent } from "src/events/user/user-course-finished.event";
import { dbAls } from "src/storage/db/db-als.store";

import { WEBHOOK_EVENT_TYPES } from "../webhooks.constants";
import { WebhooksService } from "../webhooks.service";

type WebhookDomainEvent =
  | EnrollCourseEvent
  | UserCourseFinishedEvent
  | LessonCompletedEvent
  | AssignmentSubmittedEvent
  | AssignmentGradedEvent
  | CertificateIssuedEvent;

/**
 * Bridges 6 existing domain events (already flowing through the outbox) to
 * outbound webhook delivery — no new event pipeline, just a listener that
 * maps each event to its webhook event type + payload and hands off to
 * WebhooksService.dispatchEvent, which finds subscribed endpoints and
 * enqueues delivery jobs. Runs inside the tenant-scoped DB context the
 * outbox dispatcher already establishes, so `dbAls` has the tenant id.
 */
@Injectable()
@EventsHandler(
  EnrollCourseEvent,
  UserCourseFinishedEvent,
  LessonCompletedEvent,
  AssignmentSubmittedEvent,
  AssignmentGradedEvent,
  CertificateIssuedEvent,
)
export class WebhookEventHandler implements IEventHandler<WebhookDomainEvent> {
  private readonly logger = new Logger(WebhookEventHandler.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  async handle(event: WebhookDomainEvent) {
    const tenantId = dbAls.getStore()?.tenantId;

    if (!tenantId) {
      this.logger.warn(`No tenant context for ${event.constructor.name}, skipping webhook fan-out`);
      return;
    }

    if (event instanceof EnrollCourseEvent) {
      await this.webhooksService.dispatchEvent(tenantId, WEBHOOK_EVENT_TYPES.ENROLLMENT_CREATED, {
        userId: event.enrollmentData.userId,
        courseId: event.enrollmentData.courseId,
        enrolledAt: new Date().toISOString(),
      });
      return;
    }

    if (event instanceof UserCourseFinishedEvent) {
      await this.webhooksService.dispatchEvent(tenantId, WEBHOOK_EVENT_TYPES.COURSE_COMPLETED, {
        userId: event.courseFinishedData.userId,
        courseId: event.courseFinishedData.courseId,
        completedAt: new Date().toISOString(),
      });
      return;
    }

    if (event instanceof LessonCompletedEvent) {
      await this.webhooksService.dispatchEvent(tenantId, WEBHOOK_EVENT_TYPES.LESSON_COMPLETED, {
        userId: event.lessonCompletionData.userId,
        lessonId: event.lessonCompletionData.lessonId,
        courseId: event.lessonCompletionData.courseId,
        completedAt: new Date().toISOString(),
      });
      return;
    }

    if (event instanceof AssignmentSubmittedEvent) {
      await this.webhooksService.dispatchEvent(tenantId, WEBHOOK_EVENT_TYPES.ASSIGNMENT_SUBMITTED, {
        userId: event.userId,
        assignmentId: event.assignmentId,
        submissionId: event.submissionId,
        submittedAt: new Date().toISOString(),
      });
      return;
    }

    if (event instanceof AssignmentGradedEvent) {
      await this.webhooksService.dispatchEvent(tenantId, WEBHOOK_EVENT_TYPES.ASSIGNMENT_GRADED, {
        userId: event.userId,
        assignmentId: event.assignmentId,
        score: event.grade,
        passed: event.passed,
        gradedAt: new Date().toISOString(),
      });
      return;
    }

    if (event instanceof CertificateIssuedEvent) {
      await this.webhooksService.dispatchEvent(tenantId, WEBHOOK_EVENT_TYPES.CERTIFICATE_ISSUED, {
        userId: event.userId,
        certificateId: event.certificateId,
        courseId: event.courseId,
        issuedAt: new Date().toISOString(),
      });
    }
  }
}
