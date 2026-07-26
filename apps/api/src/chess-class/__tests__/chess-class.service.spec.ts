import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { ChessClassService } from "../chess-class.service";

import type { ChessClassRepository } from "../chess-class.repository";
import type { ChessPuzzleService } from "src/chess/chess-puzzle.service";
import type { DatabasePg } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";
import type { GroupService } from "src/group/group.service";
import type { SettingsService } from "src/settings/settings.service";

const TEACHER_ID = "teacher-1";
const ADMIN_ID = "admin-1";
const OTHER_TEACHER_ID = "teacher-2";
const TENANT_ID = "tenant-1";
const GROUP_ID = "group-1";
const ROLE_ID = "role-student";

const buildUser = (userId: string, roleSlugs: string[] = ["trainer"]) =>
  ({ userId, tenantId: TENANT_ID, roleSlugs }) as unknown as CurrentUserType;

const buildManagedStudent = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "student-1",
  email: "managed.abc@class.mentingo.local",
  firstName: "Mã",
  lastName: "482",
  username: "hsabc123",
  realName: "Nguyễn Văn A",
  isManagedAccount: true,
  managedByUserId: TEACHER_ID,
  tenantId: TENANT_ID,
  ...overrides,
});

describe("ChessClassService", () => {
  const buildService = (repositoryOverrides: Partial<ChessClassRepository> = {}) => {
    const trx = {};
    const db = { transaction: jest.fn((callback: (trx: unknown) => unknown) => callback(trx)) };

    const repository = {
      findExistingUsernames: jest.fn().mockResolvedValue(new Set()),
      findStudentRoleId: jest.fn().mockResolvedValue(ROLE_ID),
      insertManagedUsers: jest
        .fn()
        .mockImplementation((rows: Array<{ email: string }>) =>
          Promise.resolve(rows.map((row, index) => ({ id: `student-${index}`, ...row }))),
        ),
      insertCredentials: jest.fn().mockResolvedValue(undefined),
      insertOnboardingRows: jest.fn().mockResolvedValue(undefined),
      insertRoleAssignments: jest.fn().mockResolvedValue(undefined),
      getGroupMembers: jest.fn().mockResolvedValue([]),
      getManagedStudentById: jest.fn().mockResolvedValue(null),
      updatePassword: jest.fn().mockResolvedValue(undefined),
      findUserByEmail: jest.fn().mockResolvedValue(null),
      releaseAccount: jest.fn().mockResolvedValue(undefined),
      insertCreateToken: jest.fn().mockResolvedValue(undefined),
      invalidateActiveLoginCodes: jest.fn().mockResolvedValue(undefined),
      insertLoginCodes: jest.fn().mockResolvedValue([]),
      getRatingsForUsers: jest.fn().mockResolvedValue([]),
      getRatingHistoryForUsers: jest.fn().mockResolvedValue([]),
      getFinishedMatchesForUsers: jest.fn().mockResolvedValue([]),
      getPuzzleAttemptsForUsers: jest.fn().mockResolvedValue([]),
      ...repositoryOverrides,
    } as unknown as ChessClassRepository;

    const groupService = {
      insertUsersGroupAssignmentsBulk: jest.fn().mockResolvedValue(undefined),
    } as unknown as GroupService;

    const chessPuzzleService = {
      getDashboard: jest.fn().mockResolvedValue({ weakMotifs: [], strongMotifs: [] }),
    } as unknown as ChessPuzzleService;

    const settingsService = {
      createSettingsForUsers: jest.fn().mockResolvedValue(undefined),
    } as unknown as SettingsService;

    const service = new ChessClassService(
      db as unknown as DatabasePg,
      repository,
      groupService,
      chessPuzzleService,
      settingsService,
    );

    return { service, repository, groupService, chessPuzzleService, settingsService, db };
  };

  describe("bulkCreateStudents", () => {
    it("creates one managed account per trimmed, non-empty name", async () => {
      const { service, repository, groupService, settingsService } = buildService();

      const created = await service.bulkCreateStudents(buildUser(TEACHER_ID), GROUP_ID, [
        "Nguyễn Văn A",
        "  Trần Thị B  ",
        "",
      ]);

      expect(created).toHaveLength(2);
      expect(created[0].realName).toBe("Nguyễn Văn A");
      expect(created[1].realName).toBe("Trần Thị B");
      expect(created.every((student) => student.temporaryPassword.length > 0)).toBe(true);
      expect(created.every((student) => student.username.startsWith("hs"))).toBe(true);

      expect(repository.insertManagedUsers).toHaveBeenCalledTimes(1);
      expect(repository.insertRoleAssignments).toHaveBeenCalledWith(
        [
          { userId: "student-0", roleId: ROLE_ID },
          { userId: "student-1", roleId: ROLE_ID },
        ],
        expect.anything(),
      );
      expect(settingsService.createSettingsForUsers).toHaveBeenCalledTimes(1);
      expect(groupService.insertUsersGroupAssignmentsBulk).toHaveBeenCalledWith(
        [
          { userId: "student-0", groupIds: [GROUP_ID] },
          { userId: "student-1", groupIds: [GROUP_ID] },
        ],
        expect.anything(),
      );
    });

    it("throws when every provided name is blank", async () => {
      const { service } = buildService();

      await expect(
        service.bulkCreateStudents(buildUser(TEACHER_ID), GROUP_ID, ["   ", ""]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws when the student system role is unavailable for the tenant", async () => {
      const { service } = buildService({ findStudentRoleId: jest.fn().mockResolvedValue(null) });

      await expect(
        service.bulkCreateStudents(buildUser(TEACHER_ID), GROUP_ID, ["Nguyễn Văn A"]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("retries username generation when a candidate already exists in the tenant", async () => {
      const findExistingUsernames = jest
        .fn()
        .mockResolvedValueOnce(new Set(["hscollide"]))
        .mockResolvedValue(new Set());

      const { service } = buildService({ findExistingUsernames });

      const created = await service.bulkCreateStudents(buildUser(TEACHER_ID), GROUP_ID, [
        "Nguyễn Văn A",
      ]);

      expect(created).toHaveLength(1);
      expect(findExistingUsernames.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("resetStudentPassword", () => {
    it("throws when the student does not exist or is not a managed account", async () => {
      const { service } = buildService({
        getManagedStudentById: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.resetStudentPassword(buildUser(TEACHER_ID), "student-1"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws ForbiddenException when a non-admin teacher does not manage this student", async () => {
      const { service } = buildService({
        getManagedStudentById: jest.fn().mockResolvedValue(buildManagedStudent()),
      });

      await expect(
        service.resetStudentPassword(buildUser(OTHER_TEACHER_ID), "student-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("allows the managing teacher to reset the password and returns a new plaintext password", async () => {
      const { service, repository } = buildService({
        getManagedStudentById: jest.fn().mockResolvedValue(buildManagedStudent()),
      });

      const newPassword = await service.resetStudentPassword(buildUser(TEACHER_ID), "student-1");

      expect(newPassword).toEqual(expect.any(String));
      expect(repository.updatePassword).toHaveBeenCalledWith("student-1", expect.any(String));
    });

    it("allows an admin to reset the password for any managed student", async () => {
      const { service, repository } = buildService({
        getManagedStudentById: jest.fn().mockResolvedValue(buildManagedStudent()),
      });

      await service.resetStudentPassword(buildUser(ADMIN_ID, ["admin"]), "student-1");

      expect(repository.updatePassword).toHaveBeenCalled();
    });
  });

  describe("releaseStudentAccount", () => {
    it("throws when the requested email already exists in the tenant", async () => {
      const { service } = buildService({
        getManagedStudentById: jest.fn().mockResolvedValue(buildManagedStudent()),
        findUserByEmail: jest.fn().mockResolvedValue({ id: "someone-else" }),
      });

      await expect(
        service.releaseStudentAccount(buildUser(TEACHER_ID), "student-1", "taken@example.com"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("releases the account and returns a create-password token", async () => {
      const { service, repository } = buildService({
        getManagedStudentById: jest.fn().mockResolvedValue(buildManagedStudent()),
      });

      const token = await service.releaseStudentAccount(
        buildUser(TEACHER_ID),
        "student-1",
        "real@example.com",
      );

      expect(token).toEqual(expect.any(String));
      expect(repository.releaseAccount).toHaveBeenCalledWith("student-1", "real@example.com");
      expect(repository.insertCreateToken).toHaveBeenCalledWith(
        "student-1",
        expect.any(String),
        expect.any(Date),
      );
    });
  });

  describe("generateLoginCodes", () => {
    it("throws when the group has no managed accounts", async () => {
      const { service } = buildService({
        getGroupMembers: jest
          .fn()
          .mockResolvedValue([buildManagedStudent({ isManagedAccount: false })]),
      });

      await expect(
        service.generateLoginCodes(buildUser(TEACHER_ID), GROUP_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("invalidates prior codes and issues one fresh 5-character code per managed member", async () => {
      const members = [
        buildManagedStudent({ id: "student-1" }),
        buildManagedStudent({ id: "student-2", isManagedAccount: false }),
      ];
      const { service, repository } = buildService({
        getGroupMembers: jest.fn().mockResolvedValue(members),
      });

      const result = await service.generateLoginCodes(buildUser(TEACHER_ID), GROUP_ID);

      expect(repository.invalidateActiveLoginCodes).toHaveBeenCalledWith(["student-1"]);
      expect(result.codes).toHaveLength(1);
      expect(result.codes[0].userId).toBe("student-1");
      expect(result.codes[0].code).toHaveLength(5);
    });
  });

  describe("getClassProgress", () => {
    it("computes win rate and puzzle accuracy from raw rating/match/puzzle rows", async () => {
      const members = [
        buildManagedStudent({ id: "student-1", firstName: "Mã", lastName: "1" }),
        buildManagedStudent({ id: "student-2", firstName: "Xe", lastName: "2" }),
      ];

      const { service } = buildService({
        getGroupMembers: jest.fn().mockResolvedValue(members),
        getRatingsForUsers: jest
          .fn()
          .mockResolvedValue([
            { userId: "student-1", category: "blitz", rating: 1550, gamesPlayed: 4 },
          ]),
        getFinishedMatchesForUsers: jest.fn().mockResolvedValue([
          { whiteUserId: "student-1", blackUserId: "student-2", result: "white_win" },
          { whiteUserId: "student-2", blackUserId: "student-1", result: "white_win" },
        ]),
        getPuzzleAttemptsForUsers: jest.fn().mockResolvedValue([
          { userId: "student-1", correct: true },
          { userId: "student-1", correct: false },
        ]),
      });

      const progress = await service.getClassProgress(GROUP_ID, 30);

      const student1 = progress.students.find((s) => s.userId === "student-1");
      expect(student1?.matchesPlayed).toBe(2);
      expect(student1?.matchesWon).toBe(1);
      expect(student1?.winRate).toBeCloseTo(0.5);
      expect(student1?.puzzlesAttempted).toBe(2);
      expect(student1?.puzzlesCorrect).toBe(1);

      const student2 = progress.students.find((s) => s.userId === "student-2");
      expect(student2?.matchesPlayed).toBe(2);
      expect(student2?.matchesWon).toBe(1);

      expect(progress.classAverage.winRate).toBeCloseTo(0.5);
      expect(progress.classAverage.puzzleAccuracy).toBeCloseTo(0.5);
    });

    it("returns zeroed averages when no member has played a rated match or attempted a puzzle", async () => {
      const { service } = buildService({
        getGroupMembers: jest.fn().mockResolvedValue([buildManagedStudent()]),
      });

      const progress = await service.getClassProgress(GROUP_ID, 30);

      expect(progress.classAverage.winRate).toBe(0);
      expect(progress.classAverage.puzzleAccuracy).toBe(0);
    });
  });
});
