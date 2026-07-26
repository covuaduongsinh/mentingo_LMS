import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";

import { ChessMatchService } from "./chess-match.service";

@Injectable()
export class ChessMatchCron {
  constructor(
    private readonly chessMatchService: ChessMatchService,
    private readonly tenantRunner: TenantDbRunnerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireStaleSeeksPerTenant() {
    await this.tenantRunner.runForEachTenant(async () => {
      await this.chessMatchService.expireStaleSeeks();
    });
  }
}
