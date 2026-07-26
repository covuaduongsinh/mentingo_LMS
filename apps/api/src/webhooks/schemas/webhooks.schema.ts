import { Type } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

import { WEBHOOK_EVENT_TYPE_VALUES } from "../webhooks.constants";

import type { Static } from "@sinclair/typebox";

export const webhookEventTypeSchema = Type.Union(
  WEBHOOK_EVENT_TYPE_VALUES.map((eventType) => Type.Literal(eventType)),
);

export const webhookEndpointSchema = Type.Object({
  id: UUIDSchema,
  url: Type.String(),
  eventsSubscribed: Type.Array(Type.String()),
  active: Type.Boolean(),
  successRate: Type.Union([Type.Number(), Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
});

export const listWebhookEndpointsResponseSchema = Type.Array(webhookEndpointSchema);

export const createWebhookEndpointBodySchema = Type.Object({
  url: Type.String({ minLength: 1, maxLength: 2048 }),
  events: Type.Array(webhookEventTypeSchema, { minItems: 1 }),
});

export const createWebhookEndpointResponseSchema = Type.Object({
  id: UUIDSchema,
  secret: Type.String(),
});

export const updateWebhookEndpointBodySchema = Type.Object({
  url: Type.Optional(Type.String({ minLength: 1, maxLength: 2048 })),
  events: Type.Optional(Type.Array(webhookEventTypeSchema, { minItems: 1 })),
  active: Type.Optional(Type.Boolean()),
});

export const rotateWebhookSecretResponseSchema = Type.Object({
  id: UUIDSchema,
  secret: Type.String(),
});

export const deleteWebhookEndpointResponseSchema = Type.Object({
  message: Type.String(),
});

export const pingWebhookEndpointResponseSchema = Type.Object({
  success: Type.Boolean(),
  statusCode: Type.Union([Type.Number(), Type.Null()]),
  errorMessage: Type.Union([Type.String(), Type.Null()]),
});

export const webhookDeliverySchema = Type.Object({
  id: UUIDSchema,
  eventType: Type.String(),
  statusCode: Type.Union([Type.Number(), Type.Null()]),
  success: Type.Boolean(),
  attemptCount: Type.Number(),
  errorMessage: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
});

export const listWebhookDeliveriesResponseSchema = Type.Array(webhookDeliverySchema);

export type WebhookEventType = Static<typeof webhookEventTypeSchema>;
export type WebhookEndpoint = Static<typeof webhookEndpointSchema>;
export type CreateWebhookEndpointBody = Static<typeof createWebhookEndpointBodySchema>;
export type CreateWebhookEndpointResponse = Static<typeof createWebhookEndpointResponseSchema>;
export type UpdateWebhookEndpointBody = Static<typeof updateWebhookEndpointBodySchema>;
export type RotateWebhookSecretResponse = Static<typeof rotateWebhookSecretResponseSchema>;
export type DeleteWebhookEndpointResponse = Static<typeof deleteWebhookEndpointResponseSchema>;
export type PingWebhookEndpointResponse = Static<typeof pingWebhookEndpointResponseSchema>;
export type WebhookDelivery = Static<typeof webhookDeliverySchema>;
