import { Type } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

export const chessGamePhaseSchema = Type.Union([
  Type.Literal("opening"),
  Type.Literal("middlegame"),
  Type.Literal("endgame"),
]);

export const chessPieceTypeSchema = Type.Union([
  Type.Literal("pawn"),
  Type.Literal("knight"),
  Type.Literal("bishop"),
  Type.Literal("rook"),
  Type.Literal("queen"),
  Type.Literal("king"),
]);

export const chessMoveQualitySchema = Type.Union([
  Type.Literal("best"),
  Type.Literal("good"),
  Type.Literal("inaccuracy"),
  Type.Literal("mistake"),
  Type.Literal("blunder"),
]);

export const chessGameInsightMoveSchema = Type.Object({
  id: UUIDSchema,
  matchId: UUIDSchema,
  userId: UUIDSchema,
  ply: Type.Number(),
  phase: chessGamePhaseSchema,
  pieceType: chessPieceTypeSchema,
  openingKey: Type.String(),
  evaluationCpBefore: Type.Number(),
  evaluationCpAfter: Type.Number(),
  centipawnLoss: Type.Number(),
  accuracy: Type.Number(),
  moveQuality: chessMoveQualitySchema,
  thinkTimeMs: Type.Number(),
});

const playerSummarySchema = Type.Object({
  moveCount: Type.Number(),
  avgAccuracy: Type.Union([Type.Number(), Type.Null()]),
  blunders: Type.Number(),
  mistakes: Type.Number(),
});

export const chessMatchInsightReportResponseSchema = Type.Object({
  matchId: UUIDSchema,
  moves: Type.Array(chessGameInsightMoveSchema),
  white: playerSummarySchema,
  black: playerSummarySchema,
});

const phaseStatSchema = Type.Object({
  phase: chessGamePhaseSchema,
  moveCount: Type.Number(),
  avgAccuracy: Type.Number(),
  avgCentipawnLoss: Type.Number(),
  avgThinkTimeMs: Type.Number(),
});

const pieceTypeStatSchema = Type.Object({
  pieceType: chessPieceTypeSchema,
  moveCount: Type.Number(),
  avgAccuracy: Type.Number(),
  avgCentipawnLoss: Type.Number(),
});

const openingStatSchema = Type.Object({
  openingKey: Type.String(),
  gameCount: Type.Number(),
  avgAccuracy: Type.Number(),
});

export const chessInsightReportResponseSchema = Type.Object({
  hasData: Type.Boolean(),
  overallAvgAccuracy: Type.Number(),
  tenantAverageAccuracy: Type.Number(),
  byPhase: Type.Array(phaseStatSchema),
  byPieceType: Type.Array(pieceTypeStatSchema),
  byOpening: Type.Array(openingStatSchema),
  weakPhases: Type.Array(chessGamePhaseSchema),
  strongPhases: Type.Array(chessGamePhaseSchema),
  weakPieceTypes: Type.Array(chessPieceTypeSchema),
  strongPieceTypes: Type.Array(chessPieceTypeSchema),
  weakOpenings: Type.Array(Type.String()),
  strongOpenings: Type.Array(Type.String()),
  timeManagement: Type.Object({
    avgThinkTimeMsByPhase: Type.Object({
      opening: Type.Number(),
      middlegame: Type.Number(),
      endgame: Type.Number(),
    }),
    totalLossCount: Type.Number(),
    timeoutLossCount: Type.Number(),
    needsTimeManagementFocus: Type.Boolean(),
  }),
  recovery: Type.Object({
    timesBehind: Type.Number(),
    recoveredCount: Type.Number(),
  }),
  conversion: Type.Object({
    timesAhead: Type.Number(),
    failedToConvertCount: Type.Number(),
  }),
});
