import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";

import { ClassroomService } from "../classroom.service";

import type { ClassroomRepository } from "../classroom.repository";
import type { CurrentUserType } from "src/common/types/current-user.type";

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
      ...repositoryOverrides,
    } as unknown as ClassroomRepository;

    return { service: new ClassroomService(repository), repository };
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
});
