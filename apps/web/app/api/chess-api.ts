import {
  CHESS_AUDIENCES,
  CHESS_CONTENT_SOURCE,
  CHESS_EXERCISE_FORMATS,
  CHESS_GAME_LEVELS,
  type ChessAudience,
  type ChessContentSource,
  type ChessExerciseFormat,
  type ChessGameLevel,
  type ChessTopic,
} from "@repo/shared";

import { ApiClient } from "~/api/api-client";

/**
 * Chess HTTP client.
 * Uses the shared ApiClient axios instance (auth cookies, interceptors).
 * After API swagger is regenerated (`pnpm generate:client`), prefer generated methods.
 */

export type ChessExerciseSolution = {
  movesUci?: string[];
  choiceIds?: string[];
  isTrue?: boolean;
  text?: string;
};

export type ChessExercise = {
  id: string;
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
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChessGame = {
  id: string;
  title: string;
  pgn: string;
  topics: ChessTopic[];
  level: ChessGameLevel;
  teachingNotes: string | null;
  tags: string[];
  published: boolean;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChessPagination = {
  totalItems: number;
  page: number;
  perPage: number;
};

export type CreateChessExerciseBody = {
  title: string;
  audience?: ChessAudience;
  topics?: ChessTopic[];
  difficulty?: number;
  format: ChessExerciseFormat;
  fen?: string | null;
  solution?: ChessExerciseSolution;
  explanation?: string | null;
  source?: ChessContentSource;
  pieceCount?: number | null;
  rating?: number | null;
  published?: boolean;
};

export type UpdateChessExerciseBody = Partial<CreateChessExerciseBody>;

export type CreateChessGameBody = {
  title: string;
  pgn: string;
  topics?: ChessTopic[];
  level?: ChessGameLevel;
  teachingNotes?: string | null;
  tags?: string[];
  published?: boolean;
};

export type UpdateChessGameBody = Partial<CreateChessGameBody>;

export type ListChessExercisesParams = {
  page?: number;
  perPage?: number;
  search?: string;
  topic?: ChessTopic;
  audience?: ChessAudience;
  format?: ChessExerciseFormat;
  publishedOnly?: boolean;
};

export type ListChessGamesParams = {
  page?: number;
  perPage?: number;
  search?: string;
  topic?: ChessTopic;
  level?: ChessGameLevel;
  publishedOnly?: boolean;
};

type BaseData<T> = { data: T };
type PaginatedData<T> = { data: T; pagination: ChessPagination };

async function getData<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await ApiClient.instance.get<T>(path, { params });
  return response.data;
}

async function postData<T>(path: string, body?: unknown): Promise<T> {
  const response = await ApiClient.instance.post<T>(path, body);
  return response.data;
}

async function patchData<T>(path: string, body?: unknown): Promise<T> {
  const response = await ApiClient.instance.patch<T>(path, body);
  return response.data;
}

async function deleteData<T>(path: string): Promise<T> {
  const response = await ApiClient.instance.delete<T>(path);
  return response.data;
}

export const chessApi = {
  getTopics: () => getData<BaseData<{ id: ChessTopic; labelKey: string }[]>>("/api/chess/topics"),

  listExercises: (params?: ListChessExercisesParams) =>
    getData<PaginatedData<ChessExercise[]>>("/api/chess/exercises", params),

  getExercise: (id: string) => getData<BaseData<ChessExercise>>(`/api/chess/exercises/${id}`),

  createExercise: (body: CreateChessExerciseBody) =>
    postData<BaseData<ChessExercise>>("/api/chess/exercises", body),

  updateExercise: (id: string, body: UpdateChessExerciseBody) =>
    patchData<BaseData<ChessExercise>>(`/api/chess/exercises/${id}`, body),

  deleteExercise: (id: string) =>
    deleteData<BaseData<{ id: string }>>(`/api/chess/exercises/${id}`),

  submitExerciseAttempt: (
    id: string,
    body: {
      movesUci?: string[];
      choiceIds?: string[];
      isTrue?: boolean;
      text?: string;
      timeMs?: number;
    },
  ) =>
    postData<BaseData<{ isCorrect: boolean; explanation: string | null }>>(
      `/api/chess/exercises/${id}/attempts`,
      body,
    ),

  listGames: (params?: ListChessGamesParams) =>
    getData<PaginatedData<ChessGame[]>>("/api/chess/games", params),

  getGame: (id: string) => getData<BaseData<ChessGame>>(`/api/chess/games/${id}`),

  createGame: (body: CreateChessGameBody) =>
    postData<BaseData<ChessGame>>("/api/chess/games", body),

  updateGame: (id: string, body: UpdateChessGameBody) =>
    patchData<BaseData<ChessGame>>(`/api/chess/games/${id}`, body),

  deleteGame: (id: string) => deleteData<BaseData<{ id: string }>>(`/api/chess/games/${id}`),

  getEngineStatus: () => getData<BaseData<ChessEngineStatus>>("/api/chess/engine/status"),

  engineBestMove: (body: { fen: string; movesUci?: string[]; level?: ChessEnginePlayLevel }) =>
    postData<BaseData<ChessEngineBestMoveResult>>("/api/chess/engine/bestmove", body),

  engineAnalyze: (body: { fen: string; movesUci?: string[]; depth?: number }) =>
    postData<BaseData<ChessEngineAnalyzeResult>>("/api/chess/engine/analyze", body),
};

export type ChessEnginePlayLevel = "easy" | "medium" | "hard";

export type ChessEngineStatus = {
  arasanConfigured: boolean;
  arasanAvailable: boolean;
  defaultEngine: "arasan" | "builtin";
  levels: string[];
};

export type ChessEngineBestMoveResult = {
  bestMoveUci: string;
  engine: "arasan" | "builtin";
  depth: number;
};

export type ChessEngineAnalyzeResult = {
  bestMoveUci: string | null;
  scoreCp: number | null;
  mate: number | null;
  pv: string[];
  depth: number;
  engine: "arasan" | "builtin";
};

export const CHESS_FORMAT_OPTIONS = Object.values(CHESS_EXERCISE_FORMATS);
export const CHESS_AUDIENCE_OPTIONS = Object.values(CHESS_AUDIENCES);
export const CHESS_LEVEL_OPTIONS = Object.values(CHESS_GAME_LEVELS);
export const CHESS_SOURCE_OPTIONS = Object.values(CHESS_CONTENT_SOURCE);
