import { Module } from "@nestjs/common";

import { ChessLearnController } from "./chess-learn.controller";
import { ChessLearnRepository } from "./chess-learn.repository";
import { ChessLearnService } from "./chess-learn.service";

@Module({
  controllers: [ChessLearnController],
  providers: [ChessLearnService, ChessLearnRepository],
  exports: [ChessLearnService],
})
export class ChessLearnModule {}
