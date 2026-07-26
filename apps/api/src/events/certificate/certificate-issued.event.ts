import type { UUIDType } from "src/common";

type CertificateIssuedData = {
  certificateId: UUIDType;
  userId: UUIDType;
  courseId: UUIDType;
};

/**
 * Published the first time a certificate is created for a learner/course
 * pair (not on idempotent re-checks of an already-issued certificate).
 * Consumed by outbound-webhook delivery (`apps/api/src/webhooks/`) for the
 * `certificate.issued` event.
 */
export class CertificateIssuedEvent {
  public readonly certificateId: UUIDType;
  public readonly userId: UUIDType;
  public readonly courseId: UUIDType;

  constructor(data: CertificateIssuedData) {
    this.certificateId = data.certificateId;
    this.userId = data.userId;
    this.courseId = data.courseId;
  }
}
