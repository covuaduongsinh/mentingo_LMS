import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Worker, type Job } from "bullmq";

import { QUEUE_NAMES, QueueService, type ChessMatchTimeoutCheckJobData } from "src/queue";
import { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";
import { REALTIME_PUBLISHER, type RealtimePublisher } from "src/websocket/realtime.publisher";

import { ChessMatchService } from "./chess-match.service";

const getChessMatchRoomName = (matchId: string) => `chess-match:${matchId}`;

@Injectable()
export class ChessMatchTimeoutWorker implements OnModuleDestroy {
  private readonly logger = new Logger(ChessMatchTimeoutWorker.name);
  private readonly worker: Worker<ChessMatchTimeoutCheckJobData, void>;

  constructor(
    private readonly queueService: QueueService,
    private readonly chessMatchService: ChessMatchService,
    private readonly tenantDbRunnerService: TenantDbRunnerService,
    @Inject(REALTIME_PUBLISHER) private readonly realtimePublisher: RealtimePublisher,
  ) {
    this.worker = new Worker<ChessMatchTimeoutCheckJobData, void>(
      QUEUE_NAMES.CHESS_MATCH_TIMEOUT_CHECK,
      (job) => this.handleTimeoutCheck(job),
      { connection: this.queueService.getConnection(), concurrency: 5 },
    );
  }

  private async handleTimeoutCheck(job: Job<ChessMatchTimeoutCheckJobData>): Promise<void> {
    const { tenantId, matchId, expectedLastMoveAtMs, expiringUserId } = job.data;

    const outcome = await this.tenantDbRunnerService.runWithTenant(tenantId, () =>
      this.chessMatchService.handleTimeoutCheck(matchId, expectedLastMoveAtMs, expiringUserId),
    );

    if (outcome) {
      this.realtimePublisher.emitToRoom("chess-match:end", getChessMatchRoomName(matchId), outcome);
      this.logger.log(`Match ${matchId} ended by timeout (job ${job.id})`);
    }
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
