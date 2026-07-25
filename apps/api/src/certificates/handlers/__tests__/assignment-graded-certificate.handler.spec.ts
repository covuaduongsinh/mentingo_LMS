import { CERTIFICATE_ARCHIVE_REASONS } from "@repo/shared";

import { AssignmentGradedEvent } from "src/events/assignment/assignment-graded.event";

import { AssignmentGradedCertificateHandler } from "../assignment-graded-certificate.handler";

import type { CertificatesService } from "../../certificates.service";

const LESSON_ID = "lesson-1";
const COURSE_ID = "course-1";
const USER_ID = "user-1";
const ASSIGNMENT_ID = "assignment-1";

function buildEvent(
  overrides: Partial<ConstructorParameters<typeof AssignmentGradedEvent>[0]> = {},
) {
  return new AssignmentGradedEvent({
    assignmentId: ASSIGNMENT_ID,
    lessonId: LESSON_ID,
    userId: USER_ID,
    grade: 30,
    passed: false,
    isRegrade: true,
    ...overrides,
  });
}

describe("AssignmentGradedCertificateHandler", () => {
  let db: {
    select: jest.Mock;
    from: jest.Mock;
    innerJoin: jest.Mock;
    where: jest.Mock;
  };
  let certificatesService: jest.Mocked<CertificatesService>;
  let handler: AssignmentGradedCertificateHandler;

  beforeEach(() => {
    db = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ courseId: COURSE_ID }]),
    };
    certificatesService = {
      archiveCertificateForFailedRequirement: jest.fn(),
    } as unknown as jest.Mocked<CertificatesService>;

    handler = new AssignmentGradedCertificateHandler(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
      certificatesService,
    );
  });

  it("archives the certificate on a regrade that now fails", async () => {
    await handler.handle(buildEvent({ passed: false, isRegrade: true }));

    expect(certificatesService.archiveCertificateForFailedRequirement).toHaveBeenCalledWith(
      USER_ID,
      COURSE_ID,
      CERTIFICATE_ARCHIVE_REASONS.ASSIGNMENT_REGRADE,
    );
  });

  it("does nothing on a first-time grading pass — there's no certificate to revoke yet", async () => {
    await handler.handle(buildEvent({ passed: false, isRegrade: false }));

    expect(certificatesService.archiveCertificateForFailedRequirement).not.toHaveBeenCalled();
  });

  it("does nothing when a regrade still passes", async () => {
    await handler.handle(buildEvent({ passed: true, isRegrade: true }));

    expect(certificatesService.archiveCertificateForFailedRequirement).not.toHaveBeenCalled();
  });

  it("does nothing when the lesson can't be resolved to a course", async () => {
    db.where.mockResolvedValue([]);

    await handler.handle(buildEvent({ passed: false, isRegrade: true }));

    expect(certificatesService.archiveCertificateForFailedRequirement).not.toHaveBeenCalled();
  });
});
