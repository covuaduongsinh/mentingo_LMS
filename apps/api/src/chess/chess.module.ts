import { Module } from "@nestjs/common";

import { ChessAnalysisRepository } from "./chess-analysis.repository";
import { ChessAnalysisService } from "./chess-analysis.service";
import { ChessMatchTimeoutWorker } from "./chess-match-timeout.worker";
import { ChessMatchCron } from "./chess-match.cron";
import { ChessMatchRepository } from "./chess-match.repository";
import { ChessMatchService } from "./chess-match.service";
import { ChessPuzzleImportWorker } from "./chess-puzzle-import.worker";
import { ChessPuzzleRepository } from "./chess-puzzle.repository";
import { ChessPuzzleService } from "./chess-puzzle.service";
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
    ChessPuzzleService,
    ChessPuzzleRepository,
    ChessPuzzleImportWorker,
    ChessMatchService,
    ChessMatchRepository,
    ChessMatchTimeoutWorker,
    ChessMatchCron,
  ],
  exports: [
    ChessService,
    ChessEngineService,
    ChessAnalysisService,
    ChessStudyService,
    ChessPuzzleService,
    ChessPuzzleRepository,
    ChessMatchService,
  ],
})
export class ChessModule {}
