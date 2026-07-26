import { CHESS_COLOR_PREFERENCES, CHESS_MATCH_TIME_CONTROL_LIST } from "@repo/shared";
import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

export const chessTimeControlIdSchema = Type.Union(
  CHESS_MATCH_TIME_CONTROL_LIST.map((control) => Type.Literal(control.id)),
);

export const chessColorPreferenceSchema = Type.Enum(CHESS_COLOR_PREFERENCES);

export const createChessSeekBodySchema = Type.Object({
  challengedUserId: Type.Optional(UUIDSchema),
  timeControlId: chessTimeControlIdSchema,
  colorPreference: Type.Optional(chessColorPreferenceSchema),
  rated: Type.Optional(Type.Boolean()),
});

export const chessSeekSchema = Type.Object({
  id: UUIDSchema,
  creatorUserId: UUIDSchema,
  challengedUserId: Type.Union([UUIDSchema, Type.Null()]),
  timeControlId: Type.String(),
  colorPreference: Type.String(),
  rated: Type.Boolean(),
  status: Type.String(),
  matchId: Type.Union([UUIDSchema, Type.Null()]),
  createdAt: Type.String(),
});

export const chessMatchSchema = Type.Object({
  id: UUIDSchema,
  whiteUserId: UUIDSchema,
  blackUserId: UUIDSchema,
  timeControlId: Type.String(),
  rated: Type.Boolean(),
  status: Type.String(),
  result: Type.Union([Type.String(), Type.Null()]),
  endReason: Type.Union([Type.String(), Type.Null()]),
  currentFen: Type.String(),
  whiteTimeRemainingMs: Type.Number(),
  blackTimeRemainingMs: Type.Number(),
  drawOfferedByUserId: Type.Union([UUIDSchema, Type.Null()]),
  moves: Type.Array(
    Type.Object({
      ply: Type.Number(),
      uci: Type.String(),
      san: Type.String(),
      fenAfter: Type.String(),
    }),
  ),
});

export type CreateChessSeekBody = Static<typeof createChessSeekBodySchema>;
