import type { UUIDType } from "src/common";

type AssignmentSubmittedData = {
  assignmentId: UUIDType;
  userId: UUIDType;
  submissionId: UUIDType;
};

/**
 * Published whenever a learner submits (or resubmits) an answer for a
 * single assignment task. Consumed by outbound-webhook delivery
 * (`apps/api/src/webhooks/`) for the `assignment.submitted` event.
 */
export class AssignmentSubmittedEvent {
  public readonly assignmentId: UUIDType;
  public readonly userId: UUIDType;
  public readonly submissionId: UUIDType;

  constructor(data: AssignmentSubmittedData) {
    this.assignmentId = data.assignmentId;
    this.userId = data.userId;
    this.submissionId = data.submissionId;
  }
}
