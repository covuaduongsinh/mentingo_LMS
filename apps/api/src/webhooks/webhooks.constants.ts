import { PERMISSIONS } from "@repo/shared";

export const WEBHOOK_EVENT_TYPES = {
  ENROLLMENT_CREATED: "enrollment.created",
  COURSE_COMPLETED: "course.completed",
  LESSON_COMPLETED: "lesson.completed",
  ASSIGNMENT_SUBMITTED: "assignment.submitted",
  ASSIGNMENT_GRADED: "assignment.graded",
  CERTIFICATE_ISSUED: "certificate.issued",
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[keyof typeof WEBHOOK_EVENT_TYPES];

export const WEBHOOK_EVENT_TYPE_VALUES = Object.values(WEBHOOK_EVENT_TYPES);

export const WEBHOOK_PING_EVENT_TYPE = "webhook.ping";

export const WEBHOOK_PERMISSIONS = [PERMISSIONS.INTEGRATION_KEY_MANAGE] as const;

export const WEBHOOK_DELIVERY_MAX_ATTEMPTS = 3;

export const WEBHOOK_DELIVERY_LOG_LIMIT = 50;
