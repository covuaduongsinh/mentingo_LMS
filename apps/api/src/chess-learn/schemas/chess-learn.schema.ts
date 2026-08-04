import { Type, type Static } from "@sinclair/typebox";

export const chessLearnLevelProgressSchema = Type.Object({
  id: Type.String(),
  completed: Type.Boolean(),
  bestStars: Type.Integer({ minimum: 0, maximum: 3 }),
  bestScore: Type.Integer({ minimum: 0 }),
});

export const chessLearnStageProgressSchema = Type.Object({
  id: Type.String(),
  label: Type.String(),
  description: Type.String(),
  totalLevels: Type.Number(),
  completedLevels: Type.Number(),
  levels: Type.Array(chessLearnLevelProgressSchema),
});

export const chessLearnStagesResponseSchema = Type.Object({
  stages: Type.Array(chessLearnStageProgressSchema),
});

export const chessLearnLevelContentSchema = Type.Object({
  id: Type.String(),
  fen: Type.String(),
  hint: Type.String(),
  completed: Type.Boolean(),
  bestStars: Type.Integer({ minimum: 0, maximum: 3 }),
  bestScore: Type.Integer({ minimum: 0 }),
});

export const submitChessLearnAttemptBodySchema = Type.Object({
  movesUci: Type.Array(Type.String(), { minItems: 1, maxItems: 10 }),
});

export const chessLearnAttemptResultSchema = Type.Object({
  correct: Type.Boolean(),
  score: Type.Integer({ minimum: 0 }),
  stars: Type.Integer({ minimum: 0, maximum: 3 }),
  bestScore: Type.Integer({ minimum: 0 }),
  bestStars: Type.Integer({ minimum: 0, maximum: 3 }),
});

export type SubmitChessLearnAttemptBody = Static<typeof submitChessLearnAttemptBodySchema>;
