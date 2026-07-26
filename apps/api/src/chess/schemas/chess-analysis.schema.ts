import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

export const chessAnalysisSessionStatusSchema = Type.Union([
  Type.Literal("active"),
  Type.Literal("ended"),
]);

export const chessAnalysisParticipantRoleSchema = Type.Union([
  Type.Literal("host"),
  Type.Literal("viewer"),
]);

export const chessAnalysisSessionSchema = Type.Object({
  id: UUIDSchema,
  hostUserId: Type.Union([UUIDSchema, Type.Null()]),
  name: Type.Union([Type.String(), Type.Null()]),
  status: chessAnalysisSessionStatusSchema,
  currentFen: Type.String(),
  moveList: Type.Array(Type.String()),
  role: chessAnalysisParticipantRoleSchema,
  createdAt: Type.String({ format: "date-time" }),
  endedAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
});

export const createChessAnalysisSessionBodySchema = Type.Object({
  name: Type.Optional(Type.String({ maxLength: 255 })),
  fen: Type.Optional(Type.String()),
});

export const createChessAnalysisSessionResponseSchema = Type.Object({
  id: UUIDSchema,
});

export type CreateChessAnalysisSessionBody = Static<typeof createChessAnalysisSessionBodySchema>;
export type ChessAnalysisSession = Static<typeof chessAnalysisSessionSchema>;
