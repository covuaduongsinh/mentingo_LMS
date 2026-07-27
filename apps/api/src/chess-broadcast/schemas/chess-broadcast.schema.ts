import { CHESS_BROADCAST_GAME_RESULTS, CHESS_BROADCAST_STATUSES } from "@repo/shared";
import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

export const chessBroadcastStatusSchema = Type.Enum(CHESS_BROADCAST_STATUSES);
export const chessBroadcastGameResultSchema = Type.Enum(CHESS_BROADCAST_GAME_RESULTS);

export const createBroadcastBodySchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.Optional(Type.String({ maxLength: 2000 })),
  delayMinutes: Type.Optional(Type.Integer({ minimum: 0, maximum: 24 * 60 })),
});

export const updateBroadcastBodySchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  description: Type.Optional(Type.Union([Type.String({ maxLength: 2000 }), Type.Null()])),
  delayMinutes: Type.Optional(Type.Integer({ minimum: 0, maximum: 24 * 60 })),
  status: Type.Optional(chessBroadcastStatusSchema),
});

export const chessBroadcastSchema = Type.Object({
  id: UUIDSchema,
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  status: Type.String(),
  delayMinutes: Type.Number(),
  createdByUserId: Type.Union([UUIDSchema, Type.Null()]),
  createdAt: Type.String(),
});

export const createRoundBodySchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 200 }),
  displayOrder: Type.Optional(Type.Integer({ minimum: 0 })),
});

export const chessBroadcastRoundSchema = Type.Object({
  id: UUIDSchema,
  broadcastId: UUIDSchema,
  name: Type.String(),
  displayOrder: Type.Number(),
  startsAt: Type.Union([Type.String(), Type.Null()]),
});

export const createTeamBodySchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 200 }),
});

export const chessBroadcastTeamSchema = Type.Object({
  id: UUIDSchema,
  broadcastId: UUIDSchema,
  name: Type.String(),
});

export const createGameBodySchema = Type.Object({
  boardNumber: Type.Integer({ minimum: 1 }),
  whiteName: Type.String({ minLength: 1, maxLength: 200 }),
  blackName: Type.String({ minLength: 1, maxLength: 200 }),
  whiteTeamId: Type.Optional(UUIDSchema),
  blackTeamId: Type.Optional(UUIDSchema),
  pgnSourceUrl: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 })),
});

export const updateGameBodySchema = Type.Object({
  whiteName: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  blackName: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  whiteTeamId: Type.Optional(Type.Union([UUIDSchema, Type.Null()])),
  blackTeamId: Type.Optional(Type.Union([UUIDSchema, Type.Null()])),
  pgnSourceUrl: Type.Optional(Type.Union([Type.String({ maxLength: 2000 }), Type.Null()])),
  result: Type.Optional(Type.Union([chessBroadcastGameResultSchema, Type.Null()])),
});

export const pastePgnBodySchema = Type.Object({
  pgn: Type.String({ minLength: 1 }),
});

export const chessBroadcastGameSchema = Type.Object({
  id: UUIDSchema,
  roundId: UUIDSchema,
  boardNumber: Type.Number(),
  whiteName: Type.String(),
  blackName: Type.String(),
  whiteTeamId: Type.Union([UUIDSchema, Type.Null()]),
  blackTeamId: Type.Union([UUIDSchema, Type.Null()]),
  result: Type.Union([Type.String(), Type.Null()]),
  currentFen: Type.String(),
  pgnSourceUrl: Type.Union([Type.String(), Type.Null()]),
  lastFetchedAt: Type.Union([Type.String(), Type.Null()]),
});

export const pastePgnResponseSchema = Type.Object({
  game: chessBroadcastGameSchema,
  insertedMoveCount: Type.Number(),
});

export const chessBroadcastMoveSchema = Type.Object({
  ply: Type.Number(),
  uci: Type.String(),
  san: Type.String(),
  fenAfter: Type.String(),
  ingestedAt: Type.String(),
});

export const chessBroadcastGameViewSchema = Type.Object({
  game: chessBroadcastGameSchema,
  broadcastId: UUIDSchema,
  moves: Type.Array(chessBroadcastMoveSchema),
  fen: Type.String(),
  delayed: Type.Boolean(),
});

export const chessBroadcastRoundWithGamesSchema = Type.Object({
  round: chessBroadcastRoundSchema,
  games: Type.Array(chessBroadcastGameSchema),
});

export const chessBroadcastDetailSchema = Type.Object({
  broadcast: chessBroadcastSchema,
  teams: Type.Array(chessBroadcastTeamSchema),
  rounds: Type.Array(chessBroadcastRoundWithGamesSchema),
});

export const chessBroadcastStandingRowSchema = Type.Object({
  teamId: UUIDSchema,
  teamName: Type.String(),
  score: Type.Number(),
  gamesPlayed: Type.Number(),
});

export const chessBroadcastStandingsResponseSchema = Type.Object({
  standings: Type.Array(chessBroadcastStandingRowSchema),
});

export type CreateBroadcastBody = Static<typeof createBroadcastBodySchema>;
export type UpdateBroadcastBody = Static<typeof updateBroadcastBodySchema>;
export type CreateRoundBody = Static<typeof createRoundBodySchema>;
export type CreateTeamBody = Static<typeof createTeamBodySchema>;
export type CreateGameBody = Static<typeof createGameBodySchema>;
export type UpdateGameBody = Static<typeof updateGameBodySchema>;
export type PastePgnBody = Static<typeof pastePgnBodySchema>;
