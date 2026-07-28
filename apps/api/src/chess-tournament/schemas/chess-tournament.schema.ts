import { CHESS_TOURNAMENT_FORMATS } from "@repo/shared";
import { Type, type Static } from "@sinclair/typebox";

import { chessTimeControlIdSchema } from "src/chess/schemas/chess-match.schema";
import { UUIDSchema } from "src/common";

export const chessTournamentFormatSchema = Type.Enum(CHESS_TOURNAMENT_FORMATS);

export const createTournamentBodySchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 200 }),
  format: chessTournamentFormatSchema,
  groupId: Type.Optional(UUIDSchema),
  // Đợt C5 — same "bulk eligibility, not auto-join" scoping as groupId, for the Classroom
  // entity. A tournament may set either, both, or neither.
  classroomId: Type.Optional(UUIDSchema),
  timeControlId: chessTimeControlIdSchema,
  rated: Type.Optional(Type.Boolean()),
  roundCount: Type.Optional(Type.Integer({ minimum: 1, maximum: 30 })),
  durationMinutes: Type.Optional(Type.Integer({ minimum: 1, maximum: 24 * 60 })),
  minRating: Type.Optional(Type.Integer()),
  maxRating: Type.Optional(Type.Integer()),
  minGamesPlayed: Type.Optional(Type.Integer({ minimum: 0 })),
  participantUserIds: Type.Optional(Type.Array(UUIDSchema)),
});

export const bulkPairingBodySchema = Type.Object({
  groupId: UUIDSchema,
  timeControlId: chessTimeControlIdSchema,
  rated: Type.Optional(Type.Boolean()),
  pairs: Type.Optional(
    Type.Array(Type.Object({ whiteUserId: UUIDSchema, blackUserId: UUIDSchema })),
  ),
  auto: Type.Optional(Type.Boolean()),
});

export const chessTournamentSchema = Type.Object({
  id: UUIDSchema,
  name: Type.String(),
  format: Type.String(),
  groupId: Type.Union([UUIDSchema, Type.Null()]),
  classroomId: Type.Union([UUIDSchema, Type.Null()]),
  timeControlId: Type.String(),
  rated: Type.Boolean(),
  roundCount: Type.Union([Type.Number(), Type.Null()]),
  durationMinutes: Type.Union([Type.Number(), Type.Null()]),
  hostUserId: Type.Union([UUIDSchema, Type.Null()]),
  status: Type.String(),
  currentRound: Type.Number(),
  startsAt: Type.Union([Type.String(), Type.Null()]),
  endsAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
});

export const chessTournamentPairingSchema = Type.Object({
  id: UUIDSchema,
  round: Type.Number(),
  whiteUserId: UUIDSchema,
  blackUserId: Type.Union([UUIDSchema, Type.Null()]),
  matchId: Type.Union([UUIDSchema, Type.Null()]),
  result: Type.Union([Type.String(), Type.Null()]),
});

export const chessTournamentStandingRowSchema = Type.Object({
  userId: UUIDSchema,
  displayName: Type.String(),
  score: Type.Number(),
  buchholz: Type.Number(),
  sonnebornBerger: Type.Number(),
  gamesPlayed: Type.Number(),
});

export const chessTournamentStandingsResponseSchema = Type.Object({
  round: Type.Number(),
  standings: Type.Array(chessTournamentStandingRowSchema),
});

export type CreateTournamentBody = Static<typeof createTournamentBodySchema>;
export type BulkPairingBody = Static<typeof bulkPairingBodySchema>;
