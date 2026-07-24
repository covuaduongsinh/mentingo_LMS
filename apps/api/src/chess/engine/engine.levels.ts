import { CHESS_ENGINE_LEVELS, type ChessEngineLevel, type LevelSearchParams } from "./engine.types";

export function resolveLevelParams(level?: ChessEngineLevel): LevelSearchParams {
  switch (level) {
    case CHESS_ENGINE_LEVELS.HARD:
      return { depth: 10, movetimeMs: 1500 };
    case CHESS_ENGINE_LEVELS.MEDIUM:
      return { depth: 6, movetimeMs: 600 };
    case CHESS_ENGINE_LEVELS.EASY:
    default:
      return { depth: 3, movetimeMs: 250 };
  }
}
