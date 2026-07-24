import { Module } from "@nestjs/common";

import { ChessController } from "./chess.controller";
import { ChessRepository } from "./chess.repository";
import { ChessService } from "./chess.service";
import { ChessEngineController } from "./engine/engine.controller";
import { ChessEngineService } from "./engine/engine.service";

@Module({
  controllers: [ChessController, ChessEngineController],
  providers: [ChessService, ChessRepository, ChessEngineService],
  exports: [ChessService, ChessEngineService],
})
export class ChessModule {}
