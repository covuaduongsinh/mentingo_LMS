import { Type, type Static } from "@sinclair/typebox";

import { CHESS_ENGINE_LEVELS } from "../engine/engine.types";

export const chessEngineLevelSchema = Type.Union([
  Type.Literal(CHESS_ENGINE_LEVELS.EASY),
  Type.Literal(CHESS_ENGINE_LEVELS.MEDIUM),
  Type.Literal(CHESS_ENGINE_LEVELS.HARD),
]);

export const engineBestMoveBodySchema = Type.Object({
  fen: Type.String({ minLength: 10 }),
  movesUci: Type.Optional(Type.Array(Type.String())),
  level: Type.Optional(chessEngineLevelSchema),
});

export const engineBestMoveResultSchema = Type.Object({
  bestMoveUci: Type.String(),
  engine: Type.Union([Type.Literal("arasan"), Type.Literal("builtin")]),
  depth: Type.Number(),
});

export const engineAnalyzeBodySchema = Type.Object({
  fen: Type.String({ minLength: 10 }),
  movesUci: Type.Optional(Type.Array(Type.String())),
  depth: Type.Optional(Type.Number({ minimum: 1, maximum: 16 })),
});

export const engineAnalyzeResultSchema = Type.Object({
  bestMoveUci: Type.Union([Type.String(), Type.Null()]),
  scoreCp: Type.Union([Type.Number(), Type.Null()]),
  mate: Type.Union([Type.Number(), Type.Null()]),
  pv: Type.Array(Type.String()),
  depth: Type.Number(),
  engine: Type.Union([Type.Literal("arasan"), Type.Literal("builtin")]),
});

export const engineStatusSchema = Type.Object({
  arasanConfigured: Type.Boolean(),
  arasanAvailable: Type.Boolean(),
  defaultEngine: Type.Union([Type.Literal("arasan"), Type.Literal("builtin")]),
  levels: Type.Array(Type.String()),
});

export type EngineBestMoveBody = Static<typeof engineBestMoveBodySchema>;
export type EngineAnalyzeBody = Static<typeof engineAnalyzeBodySchema>;
