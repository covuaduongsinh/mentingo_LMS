import { Module } from "@nestjs/common";

import { ChessBroadcastController } from "./chess-broadcast.controller";
import { ChessBroadcastCron } from "./chess-broadcast.cron";
import { ChessBroadcastRepository } from "./chess-broadcast.repository";
import { ChessBroadcastService } from "./chess-broadcast.service";

@Module({
  controllers: [ChessBroadcastController],
  providers: [ChessBroadcastService, ChessBroadcastRepository, ChessBroadcastCron],
})
export class ChessBroadcastModule {}
