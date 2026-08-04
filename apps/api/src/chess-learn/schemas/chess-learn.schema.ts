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

const chessLearnShapeSchema = Type.Union([
  Type.Object({
    kind: Type.Literal("arrow"),
    from: Type.String(),
    to: Type.String(),
    color: Type.Optional(
      Type.Union([
        Type.Literal("green"),
        Type.Literal("red"),
        Type.Literal("blue"),
        Type.Literal("yellow"),
      ]),
    ),
  }),
  Type.Object({
    kind: Type.Literal("circle"),
    square: Type.String(),
    color: Type.Optional(
      Type.Union([
        Type.Literal("green"),
        Type.Literal("red"),
        Type.Literal("blue"),
        Type.Literal("yellow"),
      ]),
    ),
  }),
]);

export const chessLearnLevelContentSchema = Type.Object({
  id: Type.String(),
  fen: Type.String(),
  hint: Type.String(),
  goal: Type.Union([Type.String(), Type.Null()]),
  mode: Type.Union([
    Type.Literal("exact_line"),
    Type.Literal("predicate"),
    Type.Literal("collect_targets"),
    Type.Literal("clear_side"),
    Type.Literal("scripted"),
  ]),
  shapes: Type.Array(chessLearnShapeSchema),
  targets: Type.Array(Type.String()),
  optimalMoves: Type.Integer({ minimum: 1 }),
  completed: Type.Boolean(),
  bestStars: Type.Integer({ minimum: 0, maximum: 3 }),
  bestScore: Type.Integer({ minimum: 0 }),
});

export const submitChessLearnAttemptBodySchema = Type.Object({
  movesUci: Type.Array(Type.String(), { minItems: 1, maxItems: 20 }),
});

export const chessLearnAttemptResultSchema = Type.Object({
  correct: Type.Boolean(),
  score: Type.Integer({ minimum: 0 }),
  stars: Type.Integer({ minimum: 0, maximum: 3 }),
  bestScore: Type.Integer({ minimum: 0 }),
  bestStars: Type.Integer({ minimum: 0, maximum: 3 }),
});

export type SubmitChessLearnAttemptBody = Static<typeof submitChessLearnAttemptBodySchema>;
