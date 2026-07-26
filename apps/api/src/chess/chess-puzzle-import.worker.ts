import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Worker, type Job } from "bullmq";

import { QUEUE_NAMES, QueueService, type ChessPuzzleImportJobData } from "src/queue";
import { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";

import { ChessPuzzleService } from "./chess-puzzle.service";
import { parsePuzzleCsv } from "./utils/puzzle-csv.utils";

import type { ChessMotif } from "@repo/shared";

@Injectable()
export class ChessPuzzleImportWorker implements OnModuleDestroy {
  private readonly logger = new Logger(ChessPuzzleImportWorker.name);
  private readonly worker: Worker<ChessPuzzleImportJobData, { imported: number }>;

  constructor(
    private readonly queueService: QueueService,
    private readonly chessPuzzleService: ChessPuzzleService,
    private readonly tenantDbRunnerService: TenantDbRunnerService,
  ) {
    this.worker = new Worker<ChessPuzzleImportJobData, { imported: number }>(
      QUEUE_NAMES.CHESS_PUZZLE_IMPORT,
      (job) => this.handleImport(job),
      { connection: this.queueService.getConnection(), concurrency: 1 },
    );
  }

  private async handleImport(job: Job<ChessPuzzleImportJobData>): Promise<{ imported: number }> {
    const { tenantId, csv, minRating, maxRating, motifs, maxCount } = job.data;

    const rows = parsePuzzleCsv(csv, {
      minRating,
      maxRating,
      motifs: motifs as ChessMotif[] | undefined,
      maxCount,
    });

    const imported = await this.tenantDbRunnerService.runWithTenant(tenantId, () =>
      this.chessPuzzleService.importPuzzles(rows),
    );

    this.logger.log(`Imported ${imported} puzzles for tenant ${tenantId} (job ${job.id})`);
    return { imported };
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
