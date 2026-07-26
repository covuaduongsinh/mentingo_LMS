import { Module } from "@nestjs/common";

import { ChessAnalysisRepository } from "./chess-analysis.repository";
import { ChessAnalysisService } from "./chess-analysis.service";
import { ChessStudyRepository } from "./chess-study.repository";
import { ChessStudyService } from "./chess-study.service";
import { ChessController } from "./chess.controller";
import { ChessRepository } from "./chess.repository";
import { ChessService } from "./chess.service";
import { ChessEngineController } from "./engine/engine.controller";
import { ChessEngineService } from "./engine/engine.service";

@Module({
  controllers: [ChessController, ChessEngineController],
  providers: [
    ChessService,
    ChessRepository,
    ChessEngineService,
    ChessAnalysisService,
    ChessAnalysisRepository,
    ChessStudyService,
    ChessStudyRepository,
  ],
  exports: [ChessService, ChessEngineService, ChessAnalysisService, ChessStudyService],
})
export class ChessModule {}
