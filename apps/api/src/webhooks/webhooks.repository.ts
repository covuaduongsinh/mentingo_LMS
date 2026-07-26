import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { DB } from "src/storage/db/db.providers";
import { webhookDeliveries, webhookEndpoints } from "src/storage/schema";

import { WEBHOOK_DELIVERY_LOG_LIMIT } from "./webhooks.constants";

import type { CreateWebhookEndpointBody } from "./schemas/webhooks.schema";

type EncryptedSecret = {
  secretCiphertext: string;
  secretIv: string;
  secretTag: string;
  secretDekIv: string;
  secretEncryptedDek: string;
  secretDekTag: string;
};

@Injectable()
export class WebhooksRepository {
  constructor(@Inject(DB) private readonly db: DatabasePg) {}

  async createEndpoint(body: CreateWebhookEndpointBody, secret: EncryptedSecret) {
    const [endpoint] = await this.db
      .insert(webhookEndpoints)
      .values({
        url: body.url,
        eventsSubscribed: body.events,
        ...secret,
      })
      .returning({ id: webhookEndpoints.id });

    return endpoint;
  }

  async listEndpoints() {
    return this.db
      .select({
        id: webhookEndpoints.id,
        url: webhookEndpoints.url,
        eventsSubscribed: webhookEndpoints.eventsSubscribed,
        active: webhookEndpoints.active,
        createdAt: sql<string>`${webhookEndpoints.createdAt}::text`,
      })
      .from(webhookEndpoints)
      .orderBy(desc(webhookEndpoints.createdAt));
  }

  async getRecentSuccessRate(webhookEndpointId: UUIDType) {
    const recentDeliveries = await this.db
      .select({ success: webhookDeliveries.success })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookEndpointId, webhookEndpointId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(WEBHOOK_DELIVERY_LOG_LIMIT);

    if (!recentDeliveries.length) return null;

    const successCount = recentDeliveries.filter((delivery) => delivery.success).length;

    return Math.round((successCount / recentDeliveries.length) * 100);
  }

  async getEndpointById(id: UUIDType) {
    const [endpoint] = await this.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, id))
      .limit(1);

    return endpoint;
  }

  async getActiveEndpointsForEvent(eventType: string) {
    return this.db
      .select()
      .from(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.active, true),
          sql`${webhookEndpoints.eventsSubscribed} @> ${JSON.stringify([eventType])}::jsonb`,
        ),
      );
  }

  async updateEndpoint(
    id: UUIDType,
    values: Partial<{ url: string; eventsSubscribed: string[]; active: boolean }>,
  ) {
    await this.db.update(webhookEndpoints).set(values).where(eq(webhookEndpoints.id, id));
  }

  async updateSecret(id: UUIDType, secret: EncryptedSecret) {
    await this.db.update(webhookEndpoints).set(secret).where(eq(webhookEndpoints.id, id));
  }

  async deleteEndpoint(id: UUIDType) {
    await this.db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id));
  }

  async logDelivery(params: {
    webhookEndpointId: UUIDType;
    eventType: string;
    statusCode: number | null;
    success: boolean;
    attemptCount: number;
    errorMessage: string | null;
  }) {
    await this.db.insert(webhookDeliveries).values(params);
  }

  async listRecentDeliveries(webhookEndpointId: UUIDType) {
    return this.db
      .select({
        id: webhookDeliveries.id,
        eventType: webhookDeliveries.eventType,
        statusCode: webhookDeliveries.statusCode,
        success: webhookDeliveries.success,
        attemptCount: webhookDeliveries.attemptCount,
        errorMessage: webhookDeliveries.errorMessage,
        createdAt: sql<string>`${webhookDeliveries.createdAt}::text`,
      })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookEndpointId, webhookEndpointId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(WEBHOOK_DELIVERY_LOG_LIMIT);
  }
}
