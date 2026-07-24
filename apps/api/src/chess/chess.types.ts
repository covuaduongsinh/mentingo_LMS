import type {
  ChessAudience,
  ChessContentSource,
  ChessEngineLevelShared,
  ChessEngineName,
  ChessExerciseFormat,
  ChessGameLevel,
  ChessPlayEndReason,
  ChessPlayOutcome,
  ChessTopic,
} from "@repo/shared";
import type { UUIDType } from "src/common";
import type { ChessExerciseSolution } from "src/storage/schema";

export type ChessExerciseRecord = {
  id: UUIDType;
  title: string;
  audience: ChessAudience;
  topics: ChessTopic[];
  difficulty: number;
  format: ChessExerciseFormat;
  fen: string | null;
  solution: ChessExerciseSolution;
  explanation: string | null;
  source: ChessContentSource;
  pieceCount: number | null;
  rating: number | null;
  published: boolean;
  authorId: UUIDType | null;
  createdAt: string;
  updatedAt: string;
};

export type ChessGameRecord = {
  id: UUIDType;
  title: string;
  pgn: string;
  topics: ChessTopic[];
  level: ChessGameLevel;
  teachingNotes: string | null;
  tags: string[];
  published: boolean;
  authorId: UUIDType | null;
  createdAt: string;
  updatedAt: string;
};

export type ListChessExercisesParams = {
  page?: number;
  perPage?: number;
  search?: string;
  topic?: ChessTopic;
  audience?: ChessAudience;
  format?: ChessExerciseFormat;
  publishedOnly?: boolean;
  minDifficulty?: number;
  maxDifficulty?: number;
};

export type ListChessGamesParams = {
  page?: number;
  perPage?: number;
  search?: string;
  topic?: ChessTopic;
  level?: ChessGameLevel;
  publishedOnly?: boolean;
};

export type ChessPlaySessionRecord = {
  id: UUIDType;
  userId: UUIDType;
  playerColor: "w" | "b";
  level: ChessEngineLevelShared;
  engine: ChessEngineName;
  outcome: ChessPlayOutcome;
  endReason: ChessPlayEndReason;
  pgn: string;
  movesUci: string[];
  timeControl: string | null;
  playerTimeLeftMs: number | null;
  engineTimeLeftMs: number | null;
  durationMs: number | null;
  moveCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ListChessPlaySessionsParams = {
  page?: number;
  perPage?: number;
};
