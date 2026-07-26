import { Type, type Static } from "@sinclair/typebox";

export const chessLearnLevelProgressSchema = Type.Object({
  id: Type.String(),
  completed: Type.Boolean(),
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
});

export const submitChessLearnAttemptBodySchema = Type.Object({
  movesUci: Type.Array(Type.String(), { minItems: 1, maxItems: 10 }),
});

export const chessLearnAttemptResultSchema = Type.Object({
  correct: Type.Boolean(),
});

export type SubmitChessLearnAttemptBody = Static<typeof submitChessLearnAttemptBodySchema>;
