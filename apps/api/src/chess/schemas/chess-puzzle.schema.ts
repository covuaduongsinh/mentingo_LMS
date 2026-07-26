import { CHESS_MOTIFS, CHESS_PUZZLE_DIFFICULTY_LIST } from "@repo/shared";
import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

export const chessMotifSchema = Type.Enum(CHESS_MOTIFS);

export const chessPuzzleDifficultySchema = Type.Union(
  CHESS_PUZZLE_DIFFICULTY_LIST.map((value) => Type.Literal(value)),
);

export const chessPuzzleSchema = Type.Object({
  id: UUIDSchema,
  fen: Type.String(),
  rating: Type.Number(),
  ratingDeviation: Type.Number(),
  motifs: Type.Array(chessMotifSchema),
  popularity: Type.Union([Type.Number(), Type.Null()]),
});

/** Includes the solution — only returned once an attempt has been submitted. */
export const chessPuzzleWithSolutionSchema = Type.Intersect([
  chessPuzzleSchema,
  Type.Object({ solutionUci: Type.Array(Type.String()) }),
]);

export const chessRatingSchema = Type.Object({
  category: Type.String(),
  rating: Type.Number(),
  ratingDeviation: Type.Number(),
  volatility: Type.Number(),
  gamesPlayed: Type.Number(),
});

export const submitChessPuzzleAttemptBodySchema = Type.Object({
  movesUci: Type.Array(Type.String(), { minItems: 1 }),
});

export const submitChessPuzzleAttemptResponseSchema = Type.Object({
  correct: Type.Boolean(),
  solutionUci: Type.Array(Type.String()),
  userRatingBefore: Type.Number(),
  userRatingAfter: Type.Number(),
  rating: chessRatingSchema,
});

export const chessPuzzleDashboardThemeStatSchema = Type.Object({
  motif: chessMotifSchema,
  attempts: Type.Number(),
  correct: Type.Number(),
  accuracy: Type.Number(),
});

export const chessPuzzleDashboardResponseSchema = Type.Object({
  rating: chessRatingSchema,
  ratingHistory: Type.Array(Type.Object({ rating: Type.Number(), recordedAt: Type.String() })),
  themeStats: Type.Array(chessPuzzleDashboardThemeStatSchema),
  weakMotifs: Type.Array(chessMotifSchema),
  strongMotifs: Type.Array(chessMotifSchema),
});

export const importChessPuzzlesBodySchema = Type.Object({
  csv: Type.String({ minLength: 1 }),
  minRating: Type.Optional(Type.Number({ minimum: 0 })),
  maxRating: Type.Optional(Type.Number({ minimum: 0 })),
  motifs: Type.Optional(Type.Array(chessMotifSchema)),
  maxCount: Type.Optional(Type.Number({ minimum: 1, maximum: 200000 })),
});

export const importChessPuzzlesResponseSchema = Type.Object({
  jobId: Type.String(),
});

export type ChessPuzzleDifficulty = Static<typeof chessPuzzleDifficultySchema>;
export type SubmitChessPuzzleAttemptBody = Static<typeof submitChessPuzzleAttemptBodySchema>;
export type ImportChessPuzzlesBody = Static<typeof importChessPuzzlesBodySchema>;
