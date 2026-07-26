import { createHmac, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

import { Injectable, NotFoundException } from "@nestjs/common";

import { ENCRYPTION_ALG } from "src/env/env.config";
import { QUEUE_NAMES, QueueService } from "src/queue";

import {
  postWebhookSafely,
  WebhookDeliveryError,
  type SafeWebhookPostResult,
} from "./utils/safe-webhook-post";
import { WEBHOOK_DELIVERY_MAX_ATTEMPTS, WEBHOOK_PING_EVENT_TYPE } from "./webhooks.constants";
import { WebhooksRepository } from "./webhooks.repository";

import type {
  CreateWebhookEndpointBody,
  UpdateWebhookEndpointBody,
} from "./schemas/webhooks.schema";
import type { UUIDType } from "src/common";
import type { WebhookDeliveryJobData } from "src/queue/queue.types";

@Injectable()
export class WebhooksService {
  private readonly keyEncryptionKey: Buffer;

  constructor(
    private readonly webhooksRepository: WebhooksRepository,
    private readonly queueService: QueueService,
  ) {
    this.keyEncryptionKey = Buffer.from(process.env.MASTER_KEY!, "base64");
  }

  async listEndpoints() {
    const endpoints = await this.webhooksRepository.listEndpoints();

    return Promise.all(
      endpoints.map(async (endpoint) => ({
        ...endpoint,
        successRate: await this.webhooksRepository.getRecentSuccessRate(endpoint.id),
      })),
    );
  }

  async createEndpoint(body: CreateWebhookEndpointBody) {
    const secret = this.generateSecret();
    const encryptedSecret = this.encryptSecret(secret);

    const endpoint = await this.webhooksRepository.createEndpoint(body, encryptedSecret);

    return { id: endpoint.id, secret };
  }

  async updateEndpoint(id: UUIDType, body: UpdateWebhookEndpointBody) {
    await this.assertEndpointExists(id);

    await this.webhooksRepository.updateEndpoint(id, {
      ...(body.url !== undefined && { url: body.url }),
      ...(body.events !== undefined && { eventsSubscribed: body.events }),
      ...(body.active !== undefined && { active: body.active }),
    });

    return { id };
  }

  async rotateSecret(id: UUIDType) {
    await this.assertEndpointExists(id);

    const secret = this.generateSecret();
    const encryptedSecret = this.encryptSecret(secret);

    await this.webhooksRepository.updateSecret(id, encryptedSecret);

    return { id, secret };
  }

  async deleteEndpoint(id: UUIDType) {
    await this.assertEndpointExists(id);
    await this.webhooksRepository.deleteEndpoint(id);

    return { message: "webhooks.toast.endpointDeletedSuccessfully" };
  }

  async listDeliveries(webhookEndpointId: UUIDType) {
    await this.assertEndpointExists(webhookEndpointId);

    return this.webhooksRepository.listRecentDeliveries(webhookEndpointId);
  }

  async pingEndpoint(id: UUIDType) {
    const endpoint = await this.assertEndpointExists(id);
    const secret = this.decryptSecret(endpoint);

    const payload = this.buildPayload(WEBHOOK_PING_EVENT_TYPE, endpoint.tenantId, {
      message: "This is a test delivery from mentingo.",
    });
    const body = JSON.stringify(payload);

    try {
      const result = await this.sendOnce(endpoint.url, body, secret, WEBHOOK_PING_EVENT_TYPE);

      return {
        success: result.statusCode >= 200 && result.statusCode < 300,
        statusCode: result.statusCode,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: null,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /** Called by WebhookDispatchService (event handlers) — finds subscribed active endpoints and enqueues one delivery job per endpoint. */
  async dispatchEvent(tenantId: UUIDType, eventType: string, data: Record<string, unknown>) {
    const endpoints = await this.webhooksRepository.getActiveEndpointsForEvent(eventType);

    const payload = this.buildPayload(eventType, tenantId, data);

    await Promise.all(
      endpoints.map((endpoint) =>
        this.queueService.enqueue<WebhookDeliveryJobData>(
          QUEUE_NAMES.WEBHOOK_DELIVERY,
          "webhook-delivery",
          { tenantId, webhookEndpointId: endpoint.id, eventType, payload },
          {
            attempts: WEBHOOK_DELIVERY_MAX_ATTEMPTS,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: true,
          },
        ),
      ),
    );
  }

  /** Called by WebhookDeliveryWorker (already inside tenant RLS context) for a single delivery attempt. Throws on failure so BullMQ retries per the job's attempts/backoff config. */
  async deliverOnce(
    webhookEndpointId: UUIDType,
    eventType: string,
    payload: Record<string, unknown>,
    attemptNumber: number,
  ) {
    const endpoint = await this.webhooksRepository.getEndpointById(webhookEndpointId);
    if (!endpoint) return;

    const secret = this.decryptSecret(endpoint);
    const body = JSON.stringify(payload);

    try {
      const result = await this.sendOnce(endpoint.url, body, secret, eventType);
      const success = result.statusCode >= 200 && result.statusCode < 300;

      await this.webhooksRepository.logDelivery({
        webhookEndpointId,
        eventType,
        statusCode: result.statusCode,
        success,
        attemptCount: attemptNumber,
        errorMessage: success ? null : `Unexpected status code ${result.statusCode}`,
      });

      if (!success) throw new WebhookDeliveryError(`Unexpected status code ${result.statusCode}`);
    } catch (error) {
      if (!(error instanceof WebhookDeliveryError)) {
        await this.webhooksRepository.logDelivery({
          webhookEndpointId,
          eventType,
          statusCode: null,
          success: false,
          attemptCount: attemptNumber,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
      throw error;
    }
  }

  private async sendOnce(
    url: string,
    body: string,
    secret: string,
    eventType: string,
  ): Promise<SafeWebhookPostResult> {
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    return postWebhookSafely(url, body, {
      "X-Webhook-Signature": `sha256=${signature}`,
      "X-Webhook-Event": eventType,
    });
  }

  private buildPayload(eventType: string, tenantId: UUIDType, data: Record<string, unknown>) {
    return {
      event: eventType,
      occurredAt: new Date().toISOString(),
      tenantId,
      data,
    };
  }

  private async assertEndpointExists(id: UUIDType) {
    const endpoint = await this.webhooksRepository.getEndpointById(id);
    if (!endpoint) throw new NotFoundException("webhooks.error.endpointNotFound");
    return endpoint;
  }

  private generateSecret() {
    return randomBytes(32).toString("hex");
  }

  private encryptSecret(secret: string) {
    const dek = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv(ENCRYPTION_ALG, dek, iv);
    const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    const dekIv = randomBytes(12);
    const dekCipher = createCipheriv(ENCRYPTION_ALG, this.keyEncryptionKey, dekIv);
    const encryptedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
    const dekTag = dekCipher.getAuthTag();

    return {
      secretCiphertext: ciphertext.toString("base64"),
      secretIv: iv.toString("base64"),
      secretTag: tag.toString("base64"),
      secretDekIv: dekIv.toString("base64"),
      secretEncryptedDek: encryptedDek.toString("base64"),
      secretDekTag: dekTag.toString("base64"),
    };
  }

  private decryptSecret(endpoint: {
    secretCiphertext: string;
    secretIv: string;
    secretTag: string;
    secretDekIv: string;
    secretEncryptedDek: string;
    secretDekTag: string;
  }) {
    const decipherDek = createDecipheriv(
      ENCRYPTION_ALG,
      this.keyEncryptionKey,
      Buffer.from(endpoint.secretDekIv, "base64"),
    );
    decipherDek.setAuthTag(Buffer.from(endpoint.secretDekTag, "base64"));
    const dek = Buffer.concat([
      decipherDek.update(Buffer.from(endpoint.secretEncryptedDek, "base64")),
      decipherDek.final(),
    ]);

    const decipherCiphertext = createDecipheriv(
      ENCRYPTION_ALG,
      dek,
      Buffer.from(endpoint.secretIv, "base64"),
    );
    decipherCiphertext.setAuthTag(Buffer.from(endpoint.secretTag, "base64"));

    return Buffer.concat([
      decipherCiphertext.update(Buffer.from(endpoint.secretCiphertext, "base64")),
      decipherCiphertext.final(),
    ]).toString("utf8");
  }
}
