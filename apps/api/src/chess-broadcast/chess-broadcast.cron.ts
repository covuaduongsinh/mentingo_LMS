import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";

import { ChessBroadcastService } from "./chess-broadcast.service";

@Injectable()
export class ChessBroadcastCron {
  constructor(
    private readonly chessBroadcastService: ChessBroadcastService,
    private readonly tenantRunner: TenantDbRunnerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async autoPullBroadcastGamesPerTenant() {
    await this.tenantRunner.runForEachTenant(async () => {
      await this.chessBroadcastService.autoPullBroadcastGames();
    });
  }
}
