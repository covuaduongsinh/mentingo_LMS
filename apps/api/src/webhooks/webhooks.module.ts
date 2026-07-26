import { Module } from "@nestjs/common";

import { WebhookEventHandler } from "./handlers/webhook-event.handler";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksRepository } from "./webhooks.repository";
import { WebhooksService } from "./webhooks.service";
import { WebhookDeliveryWorker } from "./workers/webhook-delivery.worker";

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksRepository, WebhookEventHandler, WebhookDeliveryWorker],
})
export class WebhooksModule {}
