import * as bcrypt from "bcryptjs";

import { AuthService } from "../auth.service";

import type { DatabasePg, UUIDType } from "src/common";
import type { SettingsService } from "src/settings/settings.service";

const USER_ID = "user-1" as UUIDType;
const EMAIL = "student@example.com";
const PASSWORD = "correct-horse-battery-staple";

function buildSelectChain(result: unknown[]) {
  const where = jest.fn().mockResolvedValue(result);
  const leftJoin = jest.fn().mockReturnValue({ where });
  const from = jest.fn().mockReturnValue({ leftJoin });
  return jest.fn().mockReturnValue({ from });
}

function buildUpdateReturningChain(result: unknown[]) {
  const returning = jest.fn().mockResolvedValue(result);
  const where = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });
  return { set, updateFn: jest.fn().mockReturnValue({ set }) };
}

function buildUpdateAwaitedChain() {
  const where = jest.fn().mockResolvedValue(undefined);
  const set = jest.fn().mockReturnValue({ where });
  return { set, updateFn: jest.fn().mockReturnValue({ set }) };
}

function buildUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: EMAIL,
    firstName: "Ada",
    lastName: "Lovelace",
    password: bcrypt.hashSync(PASSWORD, 1),
    requiresPasswordChange: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archived: false,
    avatarReference: null,
    deletedAt: null,
    tenantId: "tenant-1",
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

function buildService(db: DatabasePg, settingsService: Partial<SettingsService>) {
  return new AuthService(
    db,
    db,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    settingsService as SettingsService,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

describe("AuthService — account lockout", () => {
  const settingsService: Partial<SettingsService> = {
    getGlobalSettings: jest
      .fn()
      .mockResolvedValue({ maxFailedLoginAttempts: 3, lockoutMinutes: 15 }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (settingsService.getGlobalSettings as jest.Mock).mockResolvedValue({
      maxFailedLoginAttempts: 3,
      lockoutMinutes: 15,
    });
  });

  it("returns the user and resets nothing on a correct password with no prior failures", async () => {
    const db = { select: buildSelectChain([buildUserRow()]) } as unknown as DatabasePg;
    const service = buildService(db, settingsService);

    const user = await service.validateUser(EMAIL, PASSWORD);

    expect(user).toMatchObject({ id: USER_ID, email: EMAIL });
    expect((user as { password?: string }).password).toBeUndefined();
  });

  it("throws the generic invalid-credentials error and increments the counter on a wrong password", async () => {
    const { updateFn, set } = buildUpdateReturningChain([{ failedLoginAttempts: 1 }]);
    const db = {
      select: buildSelectChain([buildUserRow()]),
      update: updateFn,
    } as unknown as DatabasePg;
    const service = buildService(db, settingsService);

    await expect(service.validateUser(EMAIL, "wrong-password")).rejects.toMatchObject({
      response: { message: "auth.error.invalidEmailOrPassword" },
    });

    expect(set).toHaveBeenCalledTimes(1);
  });

  it("locks the account once the failure count reaches the configured threshold", async () => {
    const incrementChain = buildUpdateReturningChain([{ failedLoginAttempts: 3 }]);
    const lockChain = buildUpdateAwaitedChain();
    const updateFn = jest
      .fn()
      .mockReturnValueOnce({ set: incrementChain.set })
      .mockReturnValueOnce({ set: lockChain.set });
    const db = {
      select: buildSelectChain([buildUserRow({ failedLoginAttempts: 2 })]),
      update: updateFn,
    } as unknown as DatabasePg;
    const service = buildService(db, settingsService);

    await expect(service.validateUser(EMAIL, "wrong-password")).rejects.toMatchObject({
      response: { message: "auth.error.invalidEmailOrPassword" },
    });

    expect(updateFn).toHaveBeenCalledTimes(2);
    expect(lockChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ lockedUntil: expect.any(String) }),
    );
  });

  it("rejects with the same generic message while the account is still locked, without checking the password", async () => {
    const futureLock = new Date(Date.now() + 60_000).toISOString();
    const db = {
      select: buildSelectChain([buildUserRow({ lockedUntil: futureLock, failedLoginAttempts: 5 })]),
    } as unknown as DatabasePg;
    const service = buildService(db, settingsService);

    await expect(service.validateUser(EMAIL, PASSWORD)).rejects.toMatchObject({
      response: { message: "auth.error.invalidEmailOrPassword" },
    });
  });

  it("resets the failure counter and lock state after a successful login that follows prior failures", async () => {
    const resetChain = buildUpdateAwaitedChain();
    const db = {
      select: buildSelectChain([buildUserRow({ failedLoginAttempts: 2 })]),
      update: resetChain.updateFn,
    } as unknown as DatabasePg;
    const service = buildService(db, settingsService);

    const user = await service.validateUser(EMAIL, PASSWORD);

    expect(user).toMatchObject({ id: USER_ID });
    expect(resetChain.set).toHaveBeenCalledWith({ failedLoginAttempts: 0, lockedUntil: null });
  });

  it("throws generic invalid-credentials for an email that doesn't exist, without touching the database further", async () => {
    const db = { select: buildSelectChain([]) } as unknown as DatabasePg;
    const service = buildService(db, settingsService);

    await expect(service.validateUser("nobody@example.com", PASSWORD)).rejects.toMatchObject({
      response: { message: "auth.error.invalidEmailOrPassword" },
    });
  });
});
