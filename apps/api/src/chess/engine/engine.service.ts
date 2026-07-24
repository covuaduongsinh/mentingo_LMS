import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Chess } from "chess.js";

import { ArasanUciManager } from "./arasan-uci.manager";
import { builtinAnalyze, builtinBestMove } from "./builtin-engine";
import { resolveLevelParams } from "./engine.levels";

import type { ChessEngineLevel, EngineAnalyzeResult, EngineBestMoveResult } from "./engine.types";

@Injectable()
export class ChessEngineService {
  private readonly logger = new Logger(ChessEngineService.name);
  private readonly arasanPath: string | undefined;
  private readonly preferBuiltin: boolean;

  constructor(private readonly configService: ConfigService) {
    this.arasanPath = this.configService.get<string>("ARASAN_PATH") || process.env.ARASAN_PATH;
    this.preferBuiltin =
      this.configService.get<string>("CHESS_ENGINE_BUILTIN_ONLY") === "true" ||
      process.env.CHESS_ENGINE_BUILTIN_ONLY === "true";
  }

  getStatus() {
    const arasanAvailable = ArasanUciManager.isBinaryAvailable(this.arasanPath);
    return {
      arasanConfigured: Boolean(this.arasanPath?.trim()),
      arasanAvailable,
      defaultEngine: !this.preferBuiltin && arasanAvailable ? "arasan" : "builtin",
      levels: ["easy", "medium", "hard"],
    };
  }

  async bestMove(input: {
    fen: string;
    movesUci?: string[];
    level?: ChessEngineLevel;
  }): Promise<EngineBestMoveResult> {
    this.assertValidPosition(input.fen, input.movesUci);
    const params = resolveLevelParams(input.level);

    if (!this.preferBuiltin && ArasanUciManager.isBinaryAvailable(this.arasanPath)) {
      try {
        const manager = new ArasanUciManager(this.arasanPath!);
        return await manager.bestMove({
          fen: input.fen,
          movesUci: input.movesUci,
          depth: params.depth,
          movetimeMs: params.movetimeMs,
        });
      } catch (error) {
        this.logger.warn(
          `Arasan bestmove failed, falling back to builtin: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return builtinBestMove(input.fen, input.movesUci, params.depth);
  }

  async analyze(input: {
    fen: string;
    movesUci?: string[];
    depth?: number;
  }): Promise<EngineAnalyzeResult> {
    this.assertValidPosition(input.fen, input.movesUci, { allowGameOver: true });
    const depth = Math.max(1, Math.min(input.depth ?? 8, 16));

    if (!this.preferBuiltin && ArasanUciManager.isBinaryAvailable(this.arasanPath)) {
      try {
        const manager = new ArasanUciManager(this.arasanPath!);
        return await manager.analyze({
          fen: input.fen,
          movesUci: input.movesUci,
          depth,
        });
      } catch (error) {
        this.logger.warn(
          `Arasan analyze failed, falling back to builtin: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return builtinAnalyze(input.fen, input.movesUci, Math.min(depth, 4));
  }

  private assertValidPosition(
    fen: string,
    movesUci?: string[],
    options?: { allowGameOver?: boolean },
  ) {
    let game: Chess;
    try {
      game = new Chess(fen);
    } catch {
      throw new BadRequestException("Invalid FEN");
    }

    for (const uci of movesUci ?? []) {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const moved = game.move({ from, to, promotion });
      if (!moved) {
        throw new BadRequestException(`Illegal move: ${uci}`);
      }
    }

    if (!options?.allowGameOver && game.isGameOver()) {
      throw new BadRequestException("Position is already game over");
    }
  }

  /** Strict mode helper if product wants hard fail without Arasan */
  requireArasanOrThrow() {
    if (!ArasanUciManager.isBinaryAvailable(this.arasanPath)) {
      throw new ServiceUnavailableException(
        "Arasan engine is not configured. Set ARASAN_PATH to the Arasan UCI binary.",
      );
    }
  }
}
