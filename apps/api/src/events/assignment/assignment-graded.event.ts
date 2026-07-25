import type { UUIDType } from "src/common";

type AssignmentGradedData = {
  assignmentId: UUIDType;
  lessonId: UUIDType;
  userId: UUIDType;
  grade: number;
  passed: boolean;
  /** True when this event fires from a re-grade (manual override on an already-graded submission), not the first grading pass. */
  isRegrade: boolean;
};

/**
 * Published whenever an assignment's overall grade for one learner is
 * (re)computed. Consumed by
 * `AssignmentGradedCertificateHandler` (apps/api/src/certificates/handlers/)
 * to revoke a certificate when a regrade drops the learner below the pass
 * threshold.
 */
export class AssignmentGradedEvent {
  public readonly assignmentId: UUIDType;
  public readonly lessonId: UUIDType;
  public readonly userId: UUIDType;
  public readonly grade: number;
  public readonly passed: boolean;
  public readonly isRegrade: boolean;

  constructor(data: AssignmentGradedData) {
    this.assignmentId = data.assignmentId;
    this.lessonId = data.lessonId;
    this.userId = data.userId;
    this.grade = data.grade;
    this.passed = data.passed;
    this.isRegrade = data.isRegrade;
  }
}
