import { Module } from "@nestjs/common";

import { ChessModule } from "src/chess/chess.module";

import { ChessTournamentController } from "./chess-tournament.controller";
import { ChessTournamentRepository } from "./chess-tournament.repository";
import { ChessTournamentService } from "./chess-tournament.service";

@Module({
  imports: [ChessModule],
  controllers: [ChessTournamentController],
  providers: [ChessTournamentService, ChessTournamentRepository],
  exports: [ChessTournamentService],
})
export class ChessTournamentModule {}
