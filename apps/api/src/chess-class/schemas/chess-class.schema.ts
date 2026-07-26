import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

export const bulkCreateStudentsBodySchema = Type.Object({
  names: Type.Array(Type.String({ minLength: 1, maxLength: 100 }), {
    minItems: 1,
    maxItems: 200,
  }),
});

export const createdStudentSchema = Type.Object({
  userId: UUIDSchema,
  username: Type.String(),
  temporaryPassword: Type.String(),
  realName: Type.String(),
});

export const bulkCreateStudentsResponseSchema = Type.Object({
  students: Type.Array(createdStudentSchema),
});

export const resetStudentPasswordResponseSchema = Type.Object({
  temporaryPassword: Type.String(),
});

export const releaseStudentAccountBodySchema = Type.Object({
  email: Type.String({ format: "email" }),
});

export const releaseStudentAccountResponseSchema = Type.Object({
  createToken: Type.String(),
});

export const generateLoginCodesResponseSchema = Type.Object({
  codes: Type.Array(
    Type.Object({
      userId: UUIDSchema,
      username: Type.Union([Type.String(), Type.Null()]),
      displayName: Type.String(),
      code: Type.String(),
    }),
  ),
  expiresAt: Type.String(),
});

export const chessClassStudentProgressSchema = Type.Object({
  userId: UUIDSchema,
  username: Type.Union([Type.String(), Type.Null()]),
  displayName: Type.String(),
  isManagedAccount: Type.Boolean(),
  ratings: Type.Array(
    Type.Object({
      category: Type.String(),
      rating: Type.Number(),
      gamesPlayed: Type.Number(),
    }),
  ),
  ratingHistory: Type.Array(
    Type.Object({
      category: Type.String(),
      rating: Type.Number(),
      recordedAt: Type.String(),
    }),
  ),
  matchesPlayed: Type.Number(),
  matchesWon: Type.Number(),
  winRate: Type.Number(),
  puzzlesAttempted: Type.Number(),
  puzzlesCorrect: Type.Number(),
  weakMotifs: Type.Array(Type.String()),
  strongMotifs: Type.Array(Type.String()),
});

export const chessClassProgressResponseSchema = Type.Object({
  groupId: UUIDSchema,
  days: Type.Number(),
  students: Type.Array(chessClassStudentProgressSchema),
  classAverage: Type.Object({
    winRate: Type.Number(),
    puzzleAccuracy: Type.Number(),
  }),
});

export type BulkCreateStudentsBody = Static<typeof bulkCreateStudentsBodySchema>;
export type ReleaseStudentAccountBody = Static<typeof releaseStudentAccountBodySchema>;
