import { BadRequestException, NotFoundException } from "@nestjs/common";

import { GdprService } from "../gdpr.service";

import type { DatabasePg } from "src/common";
import type { OutboxPublisher } from "src/outbox/outbox.publisher";

// userHasPermissionCondition builds a real innerJoin/exists subquery that
// this spec's lightweight db mock can't represent — the tests only need it
// to contribute a condition, so mock it to a no-op filtered out by `and()`.
jest.mock("src/common/permissions/permission-sql.utils", () => ({
  userHasPermissionCondition: jest.fn(),
}));

const USER_ID = "user-1";
const TENANT_ID = "tenant-1";

const buildSelectChain = (result: unknown) => {
  // The service sometimes awaits `.where(...)` directly (aggregate counts)
  // and sometimes chains `.limit(1)` after it — make the where-result both
  // a thenable (awaitable as-is) and expose `.limit()` resolving the same value.
  const whereResult = {
    then: (onResolve: (value: unknown) => unknown) => Promise.resolve(result).then(onResolve),
    limit: jest.fn().mockResolvedValue(result),
  };
  const where = jest.fn().mockReturnValue(whereResult);
  const from = jest.fn().mockReturnValue({ where });
  return { from, where };
};

describe("GdprService", () => {
  const actor = { userId: "admin-1", tenantId: TENANT_ID } as unknown as Parameters<
    GdprService["anonymizeUser"]
  >[0];

  const buildService = (selectResults: unknown[]) => {
    const select = jest.fn();
    selectResults.forEach((result) => {
      select.mockImplementationOnce(() => buildSelectChain(result));
    });

    const trxUpdateSet = jest
      .fn()
      .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
    const trxUpdate = jest.fn().mockReturnValue({ set: trxUpdateSet });
    const trxDelete = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });

    const trx = { update: trxUpdate, delete: trxDelete };
    const transaction = jest.fn((callback: (trx: unknown) => Promise<void>) => callback(trx));

    const db = { select, transaction } as unknown as DatabasePg;
    const outboxPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as OutboxPublisher;

    return { service: new GdprService(db, outboxPublisher), trxUpdate, trxDelete, outboxPublisher };
  };

  describe("anonymizeUser", () => {
    it("throws NotFoundException when the target user does not exist", async () => {
      const { service } = buildService([[]]);

      await expect(service.anonymizeUser(actor, USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects anonymizing the last remaining admin of the tenant", async () => {
      const { service } = buildService([
        [{ id: USER_ID, tenantId: TENANT_ID }], // target lookup
        [{ remainingAdmins: 0 }], // count of other admins
        [{ id: USER_ID }], // target is itself an admin
      ]);

      await expect(service.anonymizeUser(actor, USER_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("scrubs PII and publishes UserAnonymizedEvent when at least one other admin remains", async () => {
      const { service, trxUpdate, trxDelete, outboxPublisher } = buildService([
        [{ id: USER_ID, tenantId: TENANT_ID }],
        [{ remainingAdmins: 1 }],
        [{ id: USER_ID }],
      ]);

      const result = await service.anonymizeUser(actor, USER_ID);

      expect(trxUpdate).toHaveBeenCalled();
      expect(trxDelete).toHaveBeenCalled();
      expect(outboxPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          userAnonymizedData: expect.objectContaining({ userId: USER_ID, actor }),
        }),
        expect.anything(),
      );
      expect(result).toEqual({ message: "user.gdpr.toast.anonymizeSuccess" });
    });

    it("allows anonymizing a non-admin user even when no other admins remain", async () => {
      const { service, trxUpdate } = buildService([
        [{ id: USER_ID, tenantId: TENANT_ID }],
        [{ remainingAdmins: 0 }],
        [], // target is not an admin itself
      ]);

      await service.anonymizeUser(actor, USER_ID);

      expect(trxUpdate).toHaveBeenCalled();
    });
  });
});
