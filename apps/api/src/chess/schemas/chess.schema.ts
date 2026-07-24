import {
  CHESS_AUDIENCES,
  CHESS_CONTENT_SOURCE,
  CHESS_DIFFICULTY,
  CHESS_EXERCISE_FORMATS,
  CHESS_GAME_LEVELS,
  CHESS_TOPICS,
} from "@repo/shared";
import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

export const chessTopicSchema = Type.Enum(CHESS_TOPICS);
export const chessAudienceSchema = Type.Enum(CHESS_AUDIENCES);
export const chessExerciseFormatSchema = Type.Enum(CHESS_EXERCISE_FORMATS);
export const chessGameLevelSchema = Type.Enum(CHESS_GAME_LEVELS);
export const chessContentSourceSchema = Type.Enum(CHESS_CONTENT_SOURCE);

export const chessExerciseSolutionSchema = Type.Object({
  movesUci: Type.Optional(Type.Array(Type.String())),
  choiceIds: Type.Optional(Type.Array(UUIDSchema)),
  isTrue: Type.Optional(Type.Boolean()),
  text: Type.Optional(Type.String()),
});

export const chessExerciseSchema = Type.Object({
  id: UUIDSchema,
  title: Type.String(),
  audience: chessAudienceSchema,
  topics: Type.Array(chessTopicSchema),
  difficulty: Type.Number({ minimum: CHESS_DIFFICULTY.MIN, maximum: CHESS_DIFFICULTY.MAX }),
  format: chessExerciseFormatSchema,
  fen: Type.Union([Type.String(), Type.Null()]),
  solution: chessExerciseSolutionSchema,
  explanation: Type.Union([Type.String(), Type.Null()]),
  source: chessContentSourceSchema,
  pieceCount: Type.Union([Type.Number(), Type.Null()]),
  rating: Type.Union([Type.Number(), Type.Null()]),
  published: Type.Boolean(),
  authorId: Type.Union([UUIDSchema, Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const createChessExerciseBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 300 }),
  audience: Type.Optional(chessAudienceSchema),
  topics: Type.Optional(Type.Array(chessTopicSchema)),
  difficulty: Type.Optional(
    Type.Number({ minimum: CHESS_DIFFICULTY.MIN, maximum: CHESS_DIFFICULTY.MAX }),
  ),
  format: chessExerciseFormatSchema,
  fen: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  solution: Type.Optional(chessExerciseSolutionSchema),
  explanation: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  source: Type.Optional(chessContentSourceSchema),
  pieceCount: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  rating: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  published: Type.Optional(Type.Boolean()),
});

export const updateChessExerciseBodySchema = Type.Partial(createChessExerciseBodySchema);

export const chessGameSchema = Type.Object({
  id: UUIDSchema,
  title: Type.String(),
  pgn: Type.String(),
  topics: Type.Array(chessTopicSchema),
  level: chessGameLevelSchema,
  teachingNotes: Type.Union([Type.String(), Type.Null()]),
  tags: Type.Array(Type.String()),
  published: Type.Boolean(),
  authorId: Type.Union([UUIDSchema, Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const createChessGameBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 300 }),
  pgn: Type.String({ minLength: 1 }),
  topics: Type.Optional(Type.Array(chessTopicSchema)),
  level: Type.Optional(chessGameLevelSchema),
  teachingNotes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  tags: Type.Optional(Type.Array(Type.String())),
  published: Type.Optional(Type.Boolean()),
});

export const updateChessGameBodySchema = Type.Partial(createChessGameBodySchema);

export const submitChessExerciseAttemptBodySchema = Type.Object({
  movesUci: Type.Optional(Type.Array(Type.String())),
  choiceIds: Type.Optional(Type.Array(UUIDSchema)),
  isTrue: Type.Optional(Type.Boolean()),
  text: Type.Optional(Type.String()),
  timeMs: Type.Optional(Type.Number({ minimum: 0 })),
});

export const chessExerciseAttemptResultSchema = Type.Object({
  isCorrect: Type.Boolean(),
  explanation: Type.Union([Type.String(), Type.Null()]),
});

export type CreateChessExerciseBody = Static<typeof createChessExerciseBodySchema>;
export type UpdateChessExerciseBody = Static<typeof updateChessExerciseBodySchema>;
export type CreateChessGameBody = Static<typeof createChessGameBodySchema>;
export type UpdateChessGameBody = Static<typeof updateChessGameBodySchema>;
export type SubmitChessExerciseAttemptBody = Static<typeof submitChessExerciseAttemptBodySchema>;
