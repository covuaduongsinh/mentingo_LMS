import { Module } from "@nestjs/common";

import { ChessModule } from "src/chess/chess.module";
import { GroupModule } from "src/group/group.module";
import { SettingsModule } from "src/settings/settings.module";

import { ChessClassController } from "./chess-class.controller";
import { ChessClassRepository } from "./chess-class.repository";
import { ChessClassService } from "./chess-class.service";

@Module({
  imports: [GroupModule, ChessModule, SettingsModule],
  controllers: [ChessClassController],
  providers: [ChessClassService, ChessClassRepository],
  exports: [ChessClassService],
})
export class ChessClassModule {}
