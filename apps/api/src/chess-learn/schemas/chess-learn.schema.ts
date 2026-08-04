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
  intro: Type.Union([Type.String(), Type.Null()]),
  complete: Type.Union([Type.String(), Type.Null()]),
  totalLevels: Type.Number(),
  completedLevels: Type.Number(),
  locked: Type.Boolean(),
  levels: Type.Array(chessLearnLevelProgressSchema),
});

export const chessLearnCategorySchema = Type.Object({
  id: Type.String(),
  label: Type.String(),
  description: Type.String(),
  stages: Type.Array(chessLearnStageProgressSchema),
});

export const chessLearnStagesResponseSchema = Type.Object({
  sequentialLock: Type.Boolean(),
  stages: Type.Array(chessLearnStageProgressSchema),
  categories: Type.Array(chessLearnCategorySchema),
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
  stageIntro: Type.Union([Type.String(), Type.Null()]),
  stageComplete: Type.Union([Type.String(), Type.Null()]),
  locked: Type.Boolean(),
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

export const chessLearnCompletionSummarySchema = Type.Object({
  totalLevels: Type.Integer({ minimum: 0 }),
  completedLevels: Type.Integer({ minimum: 0 }),
  percent: Type.Integer({ minimum: 0, maximum: 100 }),
  byUserId: Type.Array(
    Type.Object({
      userId: Type.String({ format: "uuid" }),
      completedLevels: Type.Integer({ minimum: 0 }),
      percent: Type.Integer({ minimum: 0, maximum: 100 }),
    }),
  ),
});

export const submitCoordinateScoreBodySchema = Type.Object({
  mode: Type.Union([Type.Literal("find"), Type.Literal("name")]),
  orientation: Type.Union([Type.Literal("white"), Type.Literal("black")]),
  score: Type.Integer({ minimum: 0, maximum: 10_000 }),
});

export const coordinateHighScoreSchema = Type.Object({
  mode: Type.String(),
  orientation: Type.String(),
  bestScore: Type.Integer({ minimum: 0 }),
  updatedAt: Type.Union([Type.String(), Type.Null()]),
});

export const coordinateHighScoresResponseSchema = Type.Object({
  scores: Type.Array(coordinateHighScoreSchema),
});

export const submitCoordinateScoreResultSchema = Type.Object({
  bestScore: Type.Integer({ minimum: 0 }),
  isNewBest: Type.Boolean(),
});

export type SubmitChessLearnAttemptBody = Static<typeof submitChessLearnAttemptBodySchema>;
export type SubmitCoordinateScoreBody = Static<typeof submitCoordinateScoreBodySchema>;
