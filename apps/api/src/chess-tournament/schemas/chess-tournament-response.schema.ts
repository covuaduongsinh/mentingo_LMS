import { Type } from "@sinclair/typebox";

import { chessTournamentPairingSchema, chessTournamentSchema } from "./chess-tournament.schema";

export const bulkPairingResponseSchema = Type.Object({
  tournament: chessTournamentSchema,
  pairings: Type.Array(chessTournamentPairingSchema),
});

export const joinTournamentResponseSchema = Type.Object({
  success: Type.Boolean(),
});

export const arenaPairNextResponseSchema = Type.Object({
  paired: Type.Number(),
});
