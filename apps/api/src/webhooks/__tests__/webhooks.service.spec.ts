import { NotFoundException } from "@nestjs/common";

import { postWebhookSafely } from "../utils/safe-webhook-post";
import { WebhooksService } from "../webhooks.service";

import type { WebhooksRepository } from "../webhooks.repository";
import type { QueueService } from "src/queue";

jest.mock("../utils/safe-webhook-post", () => {
  const actual = jest.requireActual("../utils/safe-webhook-post");
  return {
    ...actual,
    postWebhookSafely: jest.fn(),
  };
});

const mockedPostWebhookSafely = postWebhookSafely as jest.Mock;

const ENDPOINT_ID = "endpoint-1";

describe("WebhooksService", () => {
  const originalMasterKey = process.env.MASTER_KEY;

  beforeAll(() => {
    process.env.MASTER_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  afterAll(() => {
    process.env.MASTER_KEY = originalMasterKey;
  });

  beforeEach(() => {
    mockedPostWebhookSafely.mockReset();
  });

  const buildService = (repositoryOverrides: Partial<WebhooksRepository> = {}) => {
    const repository = {
      createEndpoint: jest.fn().mockResolvedValue({ id: ENDPOINT_ID }),
      getEndpointById: jest.fn(),
      updateSecret: jest.fn().mockResolvedValue(undefined),
      getActiveEndpointsForEvent: jest.fn().mockResolvedValue([]),
      logDelivery: jest.fn().mockResolvedValue(undefined),
      ...repositoryOverrides,
    } as unknown as WebhooksRepository;

    const queueService = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    } as unknown as QueueService;

    return { service: new WebhooksService(repository, queueService), repository, queueService };
  };

  const encryptedEndpointRow = (service: WebhooksService, url = "https://example.com/hook") => {
    // Round-trip through the service's own encryptSecret to build a realistic row.
    // Access the private method via bracket notation, mirroring the codebase's
    // existing test style for testing crypto helpers indirectly.
    const encrypt = (
      service as unknown as { encryptSecret: (s: string) => any }
    ).encryptSecret.bind(service);
    const secretFields = encrypt("test-secret-value");

    return {
      id: ENDPOINT_ID,
      url,
      tenantId: "tenant-1",
      active: true,
      eventsSubscribed: ["course.completed"],
      ...secretFields,
    };
  };

  describe("createEndpoint", () => {
    it("generates and returns a plaintext secret exactly once", async () => {
      const { service, repository } = buildService();

      const result = await service.createEndpoint({
        url: "https://example.com/hook",
        events: ["course.completed"],
      });

      expect(result.id).toBe(ENDPOINT_ID);
      expect(result.secret).toEqual(expect.any(String));
      expect(result.secret.length).toBeGreaterThan(0);
      expect(repository.createEndpoint).toHaveBeenCalledWith(
        expect.objectContaining({ url: "https://example.com/hook" }),
        expect.objectContaining({ secretCiphertext: expect.any(String) }),
      );
    });
  });

  describe("pingEndpoint", () => {
    it("reports success for a 2xx response", async () => {
      const { service, repository } = buildService();
      const row = encryptedEndpointRow(service);
      (repository.getEndpointById as jest.Mock).mockResolvedValue(row);
      mockedPostWebhookSafely.mockResolvedValue({ statusCode: 200 });

      const result = await service.pingEndpoint(ENDPOINT_ID);

      expect(result).toEqual({ success: true, statusCode: 200, errorMessage: null });
    });

    it("reports failure without throwing when the endpoint errors", async () => {
      const { service, repository } = buildService();
      const row = encryptedEndpointRow(service);
      (repository.getEndpointById as jest.Mock).mockResolvedValue(row);
      mockedPostWebhookSafely.mockRejectedValue(new Error("Address not allowed"));

      const result = await service.pingEndpoint(ENDPOINT_ID);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe("Address not allowed");
    });

    it("throws NotFoundException for a missing endpoint", async () => {
      const { service, repository } = buildService();
      (repository.getEndpointById as jest.Mock).mockResolvedValue(undefined);

      await expect(service.pingEndpoint(ENDPOINT_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("dispatchEvent", () => {
    it("enqueues one delivery job per subscribed active endpoint", async () => {
      const { service, repository, queueService } = buildService({
        getActiveEndpointsForEvent: jest
          .fn()
          .mockResolvedValue([
            { id: "a" },
            { id: "b" },
          ]) as unknown as WebhooksRepository["getActiveEndpointsForEvent"],
      });

      await service.dispatchEvent("tenant-1", "course.completed", { userId: "u1", courseId: "c1" });

      expect(queueService.enqueue).toHaveBeenCalledTimes(2);
      expect(repository.getActiveEndpointsForEvent).toHaveBeenCalledWith("course.completed");
    });

    it("enqueues nothing when no endpoint is subscribed", async () => {
      const { service, queueService } = buildService({
        getActiveEndpointsForEvent: jest.fn().mockResolvedValue([]),
      });

      await service.dispatchEvent("tenant-1", "course.completed", {});

      expect(queueService.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("deliverOnce", () => {
    it("logs a successful delivery and does not throw on a 2xx response", async () => {
      const { service, repository } = buildService();
      const row = encryptedEndpointRow(service);
      (repository.getEndpointById as jest.Mock).mockResolvedValue(row);
      mockedPostWebhookSafely.mockResolvedValue({ statusCode: 204 });

      await service.deliverOnce(ENDPOINT_ID, "course.completed", { userId: "u1" }, 1);

      expect(repository.logDelivery).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, statusCode: 204, attemptCount: 1 }),
      );
    });

    it("logs a failed delivery and throws to trigger a BullMQ retry on a non-2xx response", async () => {
      const { service, repository } = buildService();
      const row = encryptedEndpointRow(service);
      (repository.getEndpointById as jest.Mock).mockResolvedValue(row);
      mockedPostWebhookSafely.mockResolvedValue({ statusCode: 500 });

      await expect(
        service.deliverOnce(ENDPOINT_ID, "course.completed", { userId: "u1" }, 2),
      ).rejects.toThrow();

      expect(repository.logDelivery).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, statusCode: 500, attemptCount: 2 }),
      );
    });

    it("signs the request body with an HMAC-SHA256 signature header", async () => {
      const { service, repository } = buildService();
      const row = encryptedEndpointRow(service);
      (repository.getEndpointById as jest.Mock).mockResolvedValue(row);
      mockedPostWebhookSafely.mockResolvedValue({ statusCode: 200 });

      await service.deliverOnce(ENDPOINT_ID, "course.completed", { userId: "u1" }, 1);

      const [, , headers] = mockedPostWebhookSafely.mock.calls[0];
      expect(headers["X-Webhook-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);
      expect(headers["X-Webhook-Event"]).toBe("course.completed");
    });
  });
});
