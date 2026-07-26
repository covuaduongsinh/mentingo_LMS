import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Worker } from "bullmq";

import { QUEUE_NAMES, QueueService } from "src/queue";
import { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";

import { WebhooksService } from "../webhooks.service";

import type { Job } from "bullmq";
import type { WebhookDeliveryJobData } from "src/queue/queue.types";

@Injectable()
export class WebhookDeliveryWorker implements OnModuleDestroy {
  private readonly logger = new Logger(WebhookDeliveryWorker.name);
  private readonly worker: Worker;

  constructor(
    private readonly queueService: QueueService,
    private readonly webhooksService: WebhooksService,
    private readonly tenantDbRunnerService: TenantDbRunnerService,
  ) {
    const connection = this.queueService.getConnection();

    this.worker = new Worker(
      QUEUE_NAMES.WEBHOOK_DELIVERY,
      async (job: Job<WebhookDeliveryJobData>) => this.handleDelivery(job),
      { connection, concurrency: Number(process.env.WORKER_CONCURRENCY || 10) },
    );

    this.worker.on("ready", () => {
      this.logger.log(`Worker ready for queue: ${QUEUE_NAMES.WEBHOOK_DELIVERY}`);
    });

    this.worker.on("failed", (job, error) => {
      this.logger.warn(
        `Webhook delivery attempt failed: id=${job?.id}, attempt=${job?.attemptsMade}, reason=${error?.message}`,
      );
    });

    this.worker.on("error", (error) => {
      this.logger.error(`Webhook delivery worker error: ${error.message}`, error.stack);
    });
  }

  private async handleDelivery(job: Job<WebhookDeliveryJobData>) {
    const { tenantId, webhookEndpointId, eventType, payload } = job.data;

    if (!tenantId) throw new Error(`Missing tenantId for webhook delivery job ${job.id}`);

    await this.tenantDbRunnerService.runWithTenant(tenantId, () =>
      this.webhooksService.deliverOnce(webhookEndpointId, eventType, payload, job.attemptsMade + 1),
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
