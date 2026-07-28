import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";

import { ClassroomService } from "../classroom.service";

import type { ClassroomRepository } from "../classroom.repository";
import type { ActivityLogsService } from "src/activity-logs/activity-logs.service";
import type { AnnouncementsSchedulerService } from "src/announcements/announcements-scheduler.service";
import type { ChessStudyService } from "src/chess/chess-study.service";
import type { DatabasePg } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";
import type { CourseService } from "src/courses/course.service";
import type { OutboxPublisher } from "src/outbox/outbox.publisher";
import type { SettingsService } from "src/settings/settings.service";
import type { UserService } from "src/user/user.service";

jest.mock("src/common/helpers/resolveTenantOrigin", () => ({
  resolveTenantOrigin: jest.fn().mockResolvedValue("https://tenant.example.com"),
}));

const TEACHER_ID = "teacher-1";
const OTHER_TEACHER_ID = "teacher-2";
const STUDENT_ID = "student-1";
const STRANGER_ID = "stranger-1";
const ADMIN_ID = "admin-1";
const CLASSROOM_ID = "classroom-1";
const TENANT_ID = "tenant-1";

const buildUser = (userId: string, permissions: string[] = []) =>
  ({ userId, tenantId: TENANT_ID, permissions }) as unknown as CurrentUserType;

const buildClassroomRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: CLASSROOM_ID,
  name: "Lớp 5A",
  description: null,
  wall: "",
  ownerId: TEACHER_ID,
  canMsg: false,
  maxStudents: 100,
  viewedAt: new Date().toISOString(),
  archivedAt: null,
  archivedBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("ClassroomService", () => {
  const buildService = (repositoryOverrides: Partial<ClassroomRepository> = {}) => {
    const repository = {
      createClassroom: jest.fn().mockResolvedValue(buildClassroomRow()),
      getClassroomById: jest.fn().mockResolvedValue(buildClassroomRow()),
      updateClassroom: jest.fn().mockResolvedValue(buildClassroomRow()),
      touchViewedAt: jest.fn().mockResolvedValue(undefined),
      setArchived: jest.fn().mockResolvedValue(buildClassroomRow()),
      isTeacher: jest.fn().mockResolvedValue(false),
      isActiveStudent: jest.fn().mockResolvedValue(false),
      countTeachers: jest.fn().mockResolvedValue(1),
      listTeachers: jest.fn().mockResolvedValue([]),
      addTeacher: jest.fn().mockResolvedValue({ id: "row-1" }),
      removeTeacher: jest.fn().mockResolvedValue(undefined),
      findUserByIdEnabled: jest.fn().mockResolvedValue({ id: OTHER_TEACHER_ID, archived: false }),
      listTeachingClassrooms: jest.fn().mockResolvedValue([]),
      listLearningClassrooms: jest.fn().mockResolvedValue([]),
      countActiveStudents: jest.fn().mockResolvedValue(0),
      listClassroomStudents: jest.fn().mockResolvedValue([]),
      getClassroomStudent: jest.fn().mockResolvedValue(null),
      insertClassroomStudent: jest.fn().mockResolvedValue({ id: "cs-1" }),
      updateClassroomStudent: jest.fn().mockResolvedValue({ userId: STUDENT_ID }),
      setClassroomStudentArchived: jest.fn().mockResolvedValue({ userId: STUDENT_ID }),
      deleteClassroomStudent: jest.fn().mockResolvedValue(undefined),
      setClassroomStudentManagedFlagFalse: jest.fn().mockResolvedValue(undefined),
      findExistingUsernames: jest.fn().mockResolvedValue(new Set()),
      findUserByUsername: jest.fn().mockResolvedValue(null),
      findUserByEmail: jest.fn().mockResolvedValue(null),
      findStudentRoleId: jest.fn().mockResolvedValue("role-student"),
      insertManagedUsers: jest
        .fn()
        .mockImplementation((rows: Array<{ email: string }>) =>
          Promise.resolve(rows.map((row, index) => ({ id: `new-student-${index}`, ...row }))),
        ),
      insertCredentials: jest.fn().mockResolvedValue(undefined),
      insertOnboardingRows: jest.fn().mockResolvedValue(undefined),
      insertRoleAssignments: jest.fn().mockResolvedValue(undefined),
      insertClassroomStudentsBulk: jest.fn().mockResolvedValue([]),
      updatePassword: jest.fn().mockResolvedValue(undefined),
      releaseUserAccount: jest.fn().mockResolvedValue(undefined),
      insertCreateToken: jest.fn().mockResolvedValue(undefined),
      findPendingInvite: jest.fn().mockResolvedValue(null),
      createInvite: jest.fn().mockResolvedValue({ id: "invite-1" }),
      listClassroomInvites: jest.fn().mockResolvedValue([]),
      listMyInvites: jest.fn().mockResolvedValue([]),
      getInviteById: jest.fn().mockResolvedValue(null),
      setInviteStatus: jest.fn().mockResolvedValue({ id: "invite-1", status: "accepted" }),
      deleteInvite: jest.fn().mockResolvedValue(undefined),
      findInactiveClassroomIds: jest.fn().mockResolvedValue([]),
      archiveClassroomsByIds: jest.fn().mockResolvedValue([]),
      findRoleIdBySlug: jest.fn().mockResolvedValue("role-trainer"),
      addUserRole: jest.fn().mockResolvedValue(undefined),
      listAllClassroomsForAdmin: jest.fn().mockResolvedValue([]),
      getCourseAuthorId: jest.fn().mockResolvedValue(TEACHER_ID),
      assignCourse: jest.fn().mockResolvedValue({ newStudentIds: [] }),
      unassignCourse: jest.fn().mockResolvedValue({ unenrolledStudentIds: [] }),
      listClassroomCourses: jest.fn().mockResolvedValue([]),
      ...repositoryOverrides,
    } as unknown as ClassroomRepository;

    const trx = {};
    const db = {
      transaction: jest.fn((callback: (trx: unknown) => unknown) => callback(trx)),
    } as unknown as DatabasePg;
    const dbAdmin = {} as unknown as DatabasePg;

    const settingsService = {
      createSettingsForUsers: jest.fn().mockResolvedValue(undefined),
    } as unknown as SettingsService;

    const activityLogsService = {
      recordActivity: jest.fn().mockResolvedValue(undefined),
    } as unknown as ActivityLogsService;

    const userService = {
      bulkArchiveUsers: jest.fn().mockResolvedValue(undefined),
    } as unknown as UserService;

    const announcementsSchedulerService = {
      createSystemAnnouncement: jest.fn().mockResolvedValue({ id: "announcement-1" }),
    } as unknown as AnnouncementsSchedulerService;

    const chessStudyService = {
      addMember: jest.fn().mockResolvedValue(undefined),
    } as unknown as ChessStudyService;

    const outboxPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as OutboxPublisher;

    const courseService = {
      createCourseDependencies: jest.fn().mockResolvedValue(undefined),
    } as unknown as CourseService;

    return {
      service: new ClassroomService(
        db,
        dbAdmin,
        repository,
        settingsService,
        activityLogsService,
        userService,
        announcementsSchedulerService,
        chessStudyService,
        outboxPublisher,
        courseService,
      ),
      repository,
      settingsService,
      activityLogsService,
      userService,
      announcementsSchedulerService,
      chessStudyService,
      outboxPublisher,
      courseService,
    };
  };

  describe("createClassroom", () => {
    it("creates a classroom owned by the caller", async () => {
      const { service, repository } = buildService();
      const result = await service.createClassroom(buildUser(TEACHER_ID), { name: "Lớp 5A" });

      expect(repository.createClassroom).toHaveBeenCalledWith({ name: "Lớp 5A" }, TEACHER_ID);
      expect(result.name).toBe("Lớp 5A");
    });
  });

  describe("getClassroomDetail", () => {
    it("returns 404, not 403, for a stranger with no relationship to the classroom", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(false),
        isActiveStudent: jest.fn().mockResolvedValue(false),
      });

      await expect(
        service.getClassroomDetail(CLASSROOM_ID, buildUser(STRANGER_ID)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("lets an admin read any classroom without a direct relationship", async () => {
      const { service, repository } = buildService();

      const result = await service.getClassroomDetail(
        CLASSROOM_ID,
        buildUser(ADMIN_ID, [PERMISSIONS.CLASSROOM_MANAGE]),
      );

      expect(repository.isTeacher).not.toHaveBeenCalled();
      expect(result.isTeacher).toBe(true);
    });

    it("bumps viewedAt when a teacher opens the classroom, not when a student does", async () => {
      const { service, repository } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
      });
      await service.getClassroomDetail(CLASSROOM_ID, buildUser(TEACHER_ID));
      expect(repository.touchViewedAt).toHaveBeenCalledWith(CLASSROOM_ID);

      jest.clearAllMocks();
      const { service: studentService, repository: studentRepo } = buildService({
        isTeacher: jest.fn().mockResolvedValue(false),
        isActiveStudent: jest.fn().mockResolvedValue(true),
      });
      await studentService.getClassroomDetail(CLASSROOM_ID, buildUser(STUDENT_ID));
      expect(studentRepo.touchViewedAt).not.toHaveBeenCalled();
    });
  });

  describe("updateClassroom", () => {
    it("throws Forbidden (not NotFound) when a student member tries to edit", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(false),
        isActiveStudent: jest.fn().mockResolvedValue(true),
      });

      await expect(
        service.updateClassroom(CLASSROOM_ID, buildUser(STUDENT_ID), { name: "x" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("throws NotFound for a stranger", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(false),
        isActiveStudent: jest.fn().mockResolvedValue(false),
      });

      await expect(
        service.updateClassroom(CLASSROOM_ID, buildUser(STRANGER_ID), { name: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("allows a teacher of the classroom to edit it", async () => {
      const { service, repository } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
      });

      await service.updateClassroom(CLASSROOM_ID, buildUser(TEACHER_ID), { name: "Lớp 5B" });
      expect(repository.updateClassroom).toHaveBeenCalledWith(CLASSROOM_ID, { name: "Lớp 5B" });
    });
  });

  describe("setArchived", () => {
    it("archives with the caller as archivedBy, and reopens with null", async () => {
      const { service, repository } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
      });

      await service.setArchived(CLASSROOM_ID, buildUser(TEACHER_ID), true);
      expect(repository.setArchived).toHaveBeenCalledWith(CLASSROOM_ID, TEACHER_ID);

      await service.setArchived(CLASSROOM_ID, buildUser(TEACHER_ID), false);
      expect(repository.setArchived).toHaveBeenCalledWith(CLASSROOM_ID, null);
    });
  });

  describe("addTeacher", () => {
    it("rejects once the classroom already has the max number of teachers", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        countTeachers: jest.fn().mockResolvedValue(10),
      });

      await expect(
        service.addTeacher(CLASSROOM_ID, buildUser(TEACHER_ID), OTHER_TEACHER_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a disabled/unknown target user", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        findUserByIdEnabled: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.addTeacher(CLASSROOM_ID, buildUser(TEACHER_ID), OTHER_TEACHER_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("adds a teacher when under the cap", async () => {
      const { service, repository } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
      });

      await service.addTeacher(CLASSROOM_ID, buildUser(TEACHER_ID), OTHER_TEACHER_ID);
      expect(repository.addTeacher).toHaveBeenCalledWith(
        CLASSROOM_ID,
        OTHER_TEACHER_ID,
        TEACHER_ID,
      );
    });
  });

  describe("removeTeacher", () => {
    it("refuses to remove the last teacher of a classroom", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        countTeachers: jest.fn().mockResolvedValue(1),
      });

      await expect(
        service.removeTeacher(CLASSROOM_ID, buildUser(TEACHER_ID), TEACHER_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("removes a teacher when at least one other teacher remains", async () => {
      const { service, repository } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        countTeachers: jest.fn().mockResolvedValue(2),
      });

      await service.removeTeacher(CLASSROOM_ID, buildUser(TEACHER_ID), OTHER_TEACHER_ID);
      expect(repository.removeTeacher).toHaveBeenCalledWith(CLASSROOM_ID, OTHER_TEACHER_ID);
    });
  });

  describe("createStudent (Đợt C3)", () => {
    it("refuses to create a student once the classroom is already at the cap", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        countActiveStudents: jest.fn().mockResolvedValue(100),
      });

      await expect(
        service.createStudent(CLASSROOM_ID, buildUser(TEACHER_ID), "Nguyễn Văn A"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("creates a managed student with a one-time password", async () => {
      const { service, repository } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
      });

      const result = await service.createStudent(
        CLASSROOM_ID,
        buildUser(TEACHER_ID),
        "Nguyễn Văn A",
      );

      expect(result.realName).toBe("Nguyễn Văn A");
      expect(result.temporaryPassword).toHaveLength(10);
      expect(repository.insertClassroomStudentsBulk).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            classroomId: CLASSROOM_ID,
            realName: "Nguyễn Văn A",
            addedBy: TEACHER_ID,
          }),
        ],
        expect.anything(),
      );
    });
  });

  describe("resetStudentPassword / releaseStudent (Đợt C3)", () => {
    it("refuses to reset the password of a non-managed (self-registered) student", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        getClassroomStudent: jest
          .fn()
          .mockResolvedValue({ userId: STUDENT_ID, isManaged: false, archivedAt: null }),
      });

      await expect(
        service.resetStudentPassword(CLASSROOM_ID, buildUser(TEACHER_ID), STUDENT_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("resets the password and records the activity for a managed student", async () => {
      const { service, repository, activityLogsService } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        getClassroomStudent: jest
          .fn()
          .mockResolvedValue({ userId: STUDENT_ID, isManaged: true, archivedAt: null }),
      });

      const password = await service.resetStudentPassword(
        CLASSROOM_ID,
        buildUser(TEACHER_ID),
        STUDENT_ID,
      );

      expect(password).toHaveLength(10);
      expect(repository.updatePassword).toHaveBeenCalledWith(STUDENT_ID, expect.any(String));
      expect(activityLogsService.recordActivity).toHaveBeenCalled();
    });

    it("blocks releasing a managed student to an email already used in the tenant", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        getClassroomStudent: jest
          .fn()
          .mockResolvedValue({ userId: STUDENT_ID, isManaged: true, archivedAt: null }),
        findUserByEmail: jest.fn().mockResolvedValue({ id: "someone-else" }),
      });

      await expect(
        service.releaseStudent(CLASSROOM_ID, buildUser(TEACHER_ID), STUDENT_ID, "taken@real.com"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("inviteStudent (Đợt C3)", () => {
    it("rejects inviting a username that doesn't exist in the tenant", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        findUserByUsername: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.inviteStudent(CLASSROOM_ID, buildUser(TEACHER_ID), "ghost", "Ghost"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses to invite one of the classroom's own teachers", async () => {
      const { service } = buildService({
        isTeacher: jest
          .fn()
          .mockImplementation((_classroomId: string, userId: string) =>
            Promise.resolve(userId === TEACHER_ID || userId === "invitee-1"),
          ),
        findUserByUsername: jest.fn().mockResolvedValue({ id: "invitee-1" }),
      });

      await expect(
        service.inviteStudent(CLASSROOM_ID, buildUser(TEACHER_ID), "coteacher", "Co Teacher"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("reports 'already' and restores an archived former student instead of re-inviting", async () => {
      const { service, repository } = buildService({
        isTeacher: jest
          .fn()
          .mockImplementation((_c: string, userId: string) =>
            Promise.resolve(userId === TEACHER_ID),
          ),
        findUserByUsername: jest.fn().mockResolvedValue({ id: "invitee-1" }),
        getClassroomStudent: jest
          .fn()
          .mockResolvedValue({ userId: "invitee-1", archivedAt: new Date().toISOString() }),
      });

      const result = await service.inviteStudent(
        CLASSROOM_ID,
        buildUser(TEACHER_ID),
        "returning",
        "Returning Student",
      );

      expect(result.feedback).toBe("already");
      expect(repository.setClassroomStudentArchived).toHaveBeenCalledWith(
        CLASSROOM_ID,
        "invitee-1",
        null,
      );
      expect(repository.createInvite).not.toHaveBeenCalled();
    });

    it("reports 'found' when a pending invite already exists, without creating a duplicate", async () => {
      const { service, repository } = buildService({
        isTeacher: jest
          .fn()
          .mockImplementation((_c: string, userId: string) =>
            Promise.resolve(userId === TEACHER_ID),
          ),
        findUserByUsername: jest.fn().mockResolvedValue({ id: "invitee-1" }),
        findPendingInvite: jest.fn().mockResolvedValue({ id: "existing-invite" }),
      });

      const result = await service.inviteStudent(
        CLASSROOM_ID,
        buildUser(TEACHER_ID),
        "pending",
        "Pending Student",
      );

      expect(result.feedback).toBe("found");
      expect(repository.createInvite).not.toHaveBeenCalled();
    });

    it("creates a new invite for a brand-new invitee and reports 'invited'", async () => {
      const { service, repository } = buildService({
        isTeacher: jest
          .fn()
          .mockImplementation((_c: string, userId: string) =>
            Promise.resolve(userId === TEACHER_ID),
          ),
        findUserByUsername: jest.fn().mockResolvedValue({ id: "invitee-1" }),
      });

      const result = await service.inviteStudent(
        CLASSROOM_ID,
        buildUser(TEACHER_ID),
        "brandnew",
        "Brand New",
      );

      expect(result.feedback).toBe("invited");
      expect(repository.createInvite).toHaveBeenCalledWith(
        CLASSROOM_ID,
        "invitee-1",
        "Brand New",
        TEACHER_ID,
      );
    });
  });

  describe("acceptInvite / declineInvite (Đợt C3)", () => {
    it("returns 404, not 403, for an invite that belongs to someone else", async () => {
      const { service } = buildService({
        getInviteById: jest
          .fn()
          .mockResolvedValue({ id: "invite-1", userId: OTHER_TEACHER_ID, status: "pending" }),
      });

      await expect(service.acceptInvite("invite-1", buildUser(STUDENT_ID))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("creates the classroom_students row and marks the invite accepted", async () => {
      const { service, repository } = buildService({
        getInviteById: jest.fn().mockResolvedValue({
          id: "invite-1",
          userId: STUDENT_ID,
          classroomId: CLASSROOM_ID,
          realName: "Nguyễn Văn A",
          status: "pending",
          createdBy: TEACHER_ID,
        }),
      });

      await service.acceptInvite("invite-1", buildUser(STUDENT_ID));

      expect(repository.insertClassroomStudent).toHaveBeenCalledWith(
        CLASSROOM_ID,
        STUDENT_ID,
        "Nguyễn Văn A",
        false,
        TEACHER_ID,
      );
      expect(repository.setInviteStatus).toHaveBeenCalledWith("invite-1", "accepted");
    });

    it("lets a student change their mind and accept after having declined", async () => {
      const { service, repository } = buildService({
        getInviteById: jest.fn().mockResolvedValue({
          id: "invite-1",
          userId: STUDENT_ID,
          classroomId: CLASSROOM_ID,
          realName: "Nguyễn Văn A",
          status: "declined",
          createdBy: TEACHER_ID,
        }),
      });

      await service.acceptInvite("invite-1", buildUser(STUDENT_ID));
      expect(repository.setInviteStatus).toHaveBeenCalledWith("invite-1", "accepted");
    });
  });

  describe("updateClassroom wall (Đợt C4)", () => {
    it("passes wall through to the repository like any other field, teacher-gated", async () => {
      const { service, repository } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
      });

      await service.updateClassroom(CLASSROOM_ID, buildUser(TEACHER_ID), { wall: "# Bảng tin" });
      expect(repository.updateClassroom).toHaveBeenCalledWith(CLASSROOM_ID, {
        wall: "# Bảng tin",
      });
    });

    it("still throws Forbidden for a student trying to edit the wall", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(false),
        isActiveStudent: jest.fn().mockResolvedValue(true),
      });

      await expect(
        service.updateClassroom(CLASSROOM_ID, buildUser(STUDENT_ID), { wall: "hijack" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("sendAnnouncement (Đợt C4)", () => {
    it("refuses a non-teacher", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(false),
        isActiveStudent: jest.fn().mockResolvedValue(true),
      });

      await expect(
        service.sendAnnouncement(CLASSROOM_ID, buildUser(STUDENT_ID), "Nghỉ học thứ Sáu này", "vi"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("refuses to send once active students exceed the classroom's cap", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        getClassroomById: jest.fn().mockResolvedValue(buildClassroomRow({ maxStudents: 5 })),
        countActiveStudents: jest.fn().mockResolvedValue(6),
      });

      await expect(
        service.sendAnnouncement(CLASSROOM_ID, buildUser(TEACHER_ID), "Nghỉ học thứ Sáu này", "vi"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("creates a CLASSROOM-sourced system announcement with the link appended", async () => {
      const { service, announcementsSchedulerService, activityLogsService } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
      });

      await service.sendAnnouncement(
        CLASSROOM_ID,
        buildUser(TEACHER_ID),
        "Nghỉ học thứ Sáu này",
        "vi",
      );

      expect(announcementsSchedulerService.createSystemAnnouncement).toHaveBeenCalledWith(
        expect.objectContaining({
          baseLanguage: "vi",
          sourceType: "classroom",
          sourceId: CLASSROOM_ID,
          sendEmail: false,
          translations: [
            expect.objectContaining({
              language: "vi",
              content: expect.stringContaining("Nghỉ học thứ Sáu này"),
            }),
          ],
        }),
      );
      expect(activityLogsService.recordActivity).toHaveBeenCalled();
    });
  });

  describe("autoArchiveInactiveClassrooms (Đợt C4)", () => {
    const originalEnv = process.env.CLASSROOM_AUTO_ARCHIVE_ENABLED;

    afterEach(() => {
      process.env.CLASSROOM_AUTO_ARCHIVE_ENABLED = originalEnv;
    });

    it("does nothing when there are no inactive candidates", async () => {
      const { service, repository } = buildService({
        findInactiveClassroomIds: jest.fn().mockResolvedValue([]),
      });

      const result = await service.autoArchiveInactiveClassrooms();
      expect(result.candidateCount).toBe(0);
      expect(repository.archiveClassroomsByIds).not.toHaveBeenCalled();
    });

    it("dry-runs (counts but does not write) when the env flag is unset", async () => {
      delete process.env.CLASSROOM_AUTO_ARCHIVE_ENABLED;
      const { service, repository } = buildService({
        findInactiveClassroomIds: jest.fn().mockResolvedValue(["c1", "c2"]),
      });

      const result = await service.autoArchiveInactiveClassrooms();
      expect(result.candidateCount).toBe(2);
      expect(repository.archiveClassroomsByIds).not.toHaveBeenCalled();
    });

    it("actually archives when CLASSROOM_AUTO_ARCHIVE_ENABLED=true", async () => {
      process.env.CLASSROOM_AUTO_ARCHIVE_ENABLED = "true";
      const { service, repository } = buildService({
        findInactiveClassroomIds: jest.fn().mockResolvedValue(["c1", "c2"]),
      });

      const result = await service.autoArchiveInactiveClassrooms();
      expect(result.candidateCount).toBe(2);
      expect(repository.archiveClassroomsByIds).toHaveBeenCalledWith(["c1", "c2"]);
    });
  });

  describe("becomeTeacher (Đợt C4)", () => {
    const originalEnv = process.env.CLASSROOM_TEACHER_SELF_REGISTRATION_ENABLED;

    afterEach(() => {
      process.env.CLASSROOM_TEACHER_SELF_REGISTRATION_ENABLED = originalEnv;
    });

    it("refuses when the tenant hasn't opted into self-registration", async () => {
      delete process.env.CLASSROOM_TEACHER_SELF_REGISTRATION_ENABLED;
      const { service } = buildService();

      await expect(service.becomeTeacher(buildUser(STUDENT_ID))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("refuses a user who already has classroom.create", async () => {
      process.env.CLASSROOM_TEACHER_SELF_REGISTRATION_ENABLED = "true";
      const { service } = buildService();

      await expect(
        service.becomeTeacher(buildUser(TEACHER_ID, [PERMISSIONS.CLASSROOM_CREATE])),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("grants the trainer role additively without touching other roles", async () => {
      process.env.CLASSROOM_TEACHER_SELF_REGISTRATION_ENABLED = "true";
      const { service, repository } = buildService();

      await service.becomeTeacher(buildUser(STUDENT_ID));

      expect(repository.findRoleIdBySlug).toHaveBeenCalledWith(TENANT_ID, "trainer");
      expect(repository.addUserRole).toHaveBeenCalledWith(STUDENT_ID, "role-trainer");
    });
  });

  describe("listAllClassroomsForAdmin (Đợt C4)", () => {
    it("delegates to the repository with the includeArchived flag", async () => {
      const { service, repository } = buildService();

      await service.listAllClassroomsForAdmin(true);
      expect(repository.listAllClassroomsForAdmin).toHaveBeenCalledWith(true);
    });
  });

  describe("assignCourse (Đợt C5)", () => {
    it("refuses a non-teacher", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(false),
        isActiveStudent: jest.fn().mockResolvedValue(true),
      });

      await expect(
        service.assignCourse(CLASSROOM_ID, buildUser(STUDENT_ID), "course-1", false, null),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("refuses a teacher without course.enrollment who doesn't author the course", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        getCourseAuthorId: jest.fn().mockResolvedValue("someone-else"),
      });

      await expect(
        service.assignCourse(CLASSROOM_ID, buildUser(TEACHER_ID), "course-1", false, null),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("allows a teacher with course.enrollment regardless of authorship", async () => {
      const { service, repository } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        getCourseAuthorId: jest.fn().mockResolvedValue("someone-else"),
      });

      await service.assignCourse(
        CLASSROOM_ID,
        buildUser(ADMIN_ID, [PERMISSIONS.COURSE_ENROLLMENT]),
        "course-1",
        true,
        "2027-01-01T00:00:00.000Z",
      );

      expect(repository.assignCourse).toHaveBeenCalledWith(
        CLASSROOM_ID,
        "course-1",
        { isMandatory: true, dueDate: "2027-01-01T00:00:00.000Z" },
        ADMIN_ID,
      );
    });

    it("creates course dependencies and publishes an event only for newly-enrolled students", async () => {
      const { service, courseService, outboxPublisher } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        assignCourse: jest.fn().mockResolvedValue({ newStudentIds: ["new-1", "new-2"] }),
      });

      await service.assignCourse(
        CLASSROOM_ID,
        buildUser(TEACHER_ID, [PERMISSIONS.COURSE_ENROLLMENT]),
        "course-1",
        false,
        null,
      );

      expect(courseService.createCourseDependencies).toHaveBeenCalledWith("course-1", "new-1");
      expect(courseService.createCourseDependencies).toHaveBeenCalledWith("course-1", "new-2");
      expect(outboxPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          usersAssignedToCourse: { studentIds: ["new-1", "new-2"], courseId: "course-1" },
        }),
      );
    });

    it("skips dependency creation and event publish when no student is newly enrolled", async () => {
      const { service, courseService, outboxPublisher } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        assignCourse: jest.fn().mockResolvedValue({ newStudentIds: [] }),
      });

      await service.assignCourse(
        CLASSROOM_ID,
        buildUser(TEACHER_ID, [PERMISSIONS.COURSE_ENROLLMENT]),
        "course-1",
        false,
        null,
      );

      expect(courseService.createCourseDependencies).not.toHaveBeenCalled();
      expect(outboxPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe("unassignCourse (Đợt C5)", () => {
    it("throws NotFound when the course isn't currently assigned to the classroom", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        unassignCourse: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.unassignCourse(CLASSROOM_ID, buildUser(TEACHER_ID), "course-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses a student trying to unassign", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(false),
        isActiveStudent: jest.fn().mockResolvedValue(true),
      });

      await expect(
        service.unassignCourse(CLASSROOM_ID, buildUser(STUDENT_ID), "course-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("listCourses (Đợt C5)", () => {
    it("is readable by a classroom member (student), not just teachers", async () => {
      const { service, repository } = buildService({
        isTeacher: jest.fn().mockResolvedValue(false),
        isActiveStudent: jest.fn().mockResolvedValue(true),
      });

      await service.listCourses(CLASSROOM_ID, buildUser(STUDENT_ID));
      expect(repository.listClassroomCourses).toHaveBeenCalledWith(CLASSROOM_ID);
    });
  });

  describe("assignStudy (Đợt C5)", () => {
    it("refuses a non-teacher", async () => {
      const { service } = buildService({
        isTeacher: jest.fn().mockResolvedValue(false),
        isActiveStudent: jest.fn().mockResolvedValue(true),
      });

      await expect(
        service.assignStudy(CLASSROOM_ID, buildUser(STUDENT_ID), "study-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("shares the study with every active classroom student", async () => {
      const { service, chessStudyService } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        listClassroomStudents: jest.fn().mockResolvedValue([
          { userId: "s1", realName: "A", isManaged: true, archivedAt: null, notes: "" },
          { userId: "s2", realName: "B", isManaged: true, archivedAt: null, notes: "" },
        ]),
      });

      const result = await service.assignStudy(CLASSROOM_ID, buildUser(TEACHER_ID), "study-1");

      expect(chessStudyService.addMember).toHaveBeenCalledWith(
        "study-1",
        { userId: "s1", role: "read" },
        expect.anything(),
      );
      expect(chessStudyService.addMember).toHaveBeenCalledWith(
        "study-1",
        { userId: "s2", role: "read" },
        expect.anything(),
      );
      expect(result.studentCount).toBe(2);
    });

    it("skips (not aborts) a student who happens to be the study's own author", async () => {
      const { service, chessStudyService } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        listClassroomStudents: jest.fn().mockResolvedValue([
          { userId: "s1", realName: "A", isManaged: true, archivedAt: null, notes: "" },
          { userId: "s2", realName: "B", isManaged: true, archivedAt: null, notes: "" },
        ]),
      });
      (chessStudyService.addMember as jest.Mock)
        .mockRejectedValueOnce(new BadRequestException("chess.study.errors.cannotAddOwnerAsMember"))
        .mockResolvedValueOnce(undefined);

      const result = await service.assignStudy(CLASSROOM_ID, buildUser(TEACHER_ID), "study-1");

      expect(result.studentCount).toBe(1);
    });

    it("aborts immediately on a non-BadRequest error (e.g. forbidden/not found)", async () => {
      const { service, chessStudyService } = buildService({
        isTeacher: jest.fn().mockResolvedValue(true),
        listClassroomStudents: jest
          .fn()
          .mockResolvedValue([
            { userId: "s1", realName: "A", isManaged: true, archivedAt: null, notes: "" },
          ]),
      });
      (chessStudyService.addMember as jest.Mock).mockRejectedValueOnce(
        new NotFoundException("chess.study.errors.studyNotFound"),
      );

      await expect(
        service.assignStudy(CLASSROOM_ID, buildUser(TEACHER_ID), "study-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
