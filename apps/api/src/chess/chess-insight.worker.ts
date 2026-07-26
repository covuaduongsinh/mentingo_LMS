import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Worker, type Job } from "bullmq";

import { QUEUE_NAMES, QueueService, type ChessMatchInsightAnalysisJobData } from "src/queue";
import { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";

import { ChessInsightService } from "./chess-insight.service";

@Injectable()
export class ChessInsightWorker implements OnModuleDestroy {
  private readonly logger = new Logger(ChessInsightWorker.name);
  private readonly worker: Worker<ChessMatchInsightAnalysisJobData, void>;

  constructor(
    private readonly queueService: QueueService,
    private readonly chessInsightService: ChessInsightService,
    private readonly tenantDbRunnerService: TenantDbRunnerService,
  ) {
    this.worker = new Worker<ChessMatchInsightAnalysisJobData, void>(
      QUEUE_NAMES.CHESS_MATCH_INSIGHT_ANALYSIS,
      (job) => this.handleAnalysis(job),
      { connection: this.queueService.getConnection(), concurrency: 2 },
    );
  }

  private async handleAnalysis(job: Job<ChessMatchInsightAnalysisJobData>): Promise<void> {
    const { tenantId, matchId } = job.data;

    await this.tenantDbRunnerService.runWithTenant(tenantId, () =>
      this.chessInsightService.analyzeMatch(matchId),
    );

    this.logger.log(`Analyzed insight data for match ${matchId} (job ${job.id})`);
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
