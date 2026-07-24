import { randomUUID } from "node:crypto";

import { CHESS_TEST_DATA } from "../data/test-data/chess.data";

import type { FixtureApiClient } from "../utils/api-client";
import type {
  CreateExerciseBody,
  CreateGameBody,
  GetExerciseResponse,
  GetGameResponse,
  UpdateExerciseBody,
  UpdateGameBody,
} from "~/api/generated-api";

export type ChessExerciseFactoryRecord = GetExerciseResponse["data"];
export type ChessGameFactoryRecord = GetGameResponse["data"];

const createExerciseTitle = () =>
  `${CHESS_TEST_DATA.exercise.titlePrefix} ${randomUUID().slice(0, 8)}`;

const createGameTitle = () => `E2E Chess Game ${randomUUID().slice(0, 8)}`;

const SAMPLE_PGN = `[Event "E2E sample game"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 *`;

export class ChessExerciseFactory {
  constructor(private readonly apiClient: FixtureApiClient) {}

  /** Defaults to a published "find the best move" back-rank mate-in-one, ready to solve. */
  async create(overrides?: Partial<CreateExerciseBody>): Promise<ChessExerciseFactoryRecord> {
    const response = await this.apiClient.api.chessControllerCreateExercise({
      title: createExerciseTitle(),
      format: "chess_find_best",
      audience: "student",
      topics: ["tactics"],
      difficulty: 3,
      fen: CHESS_TEST_DATA.exercise.mateInOneFen,
      solution: { movesUci: [CHESS_TEST_DATA.exercise.mateInOneSolutionUci] },
      published: true,
      ...overrides,
    });

    return this.getById(response.data.data.id);
  }

  async getById(id: string): Promise<ChessExerciseFactoryRecord> {
    const response = await this.apiClient.api.chessControllerGetExercise(id);
    return response.data.data;
  }

  async findByTitle(title: string): Promise<ChessExerciseFactoryRecord | null> {
    const response = await this.apiClient.api.chessControllerListExercises({
      search: title,
      page: 1,
      perPage: 20,
    });

    return response.data.data.find((exercise) => exercise.title === title) ?? null;
  }

  async update(id: string, data: UpdateExerciseBody): Promise<ChessExerciseFactoryRecord> {
    const response = await this.apiClient.api.chessControllerUpdateExercise(id, data);
    return response.data.data;
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.api.chessControllerDeleteExercise(id);
  }
}

export class ChessGameFactory {
  constructor(private readonly apiClient: FixtureApiClient) {}

  async create(overrides?: Partial<CreateGameBody>): Promise<ChessGameFactoryRecord> {
    const response = await this.apiClient.api.chessControllerCreateGame({
      title: createGameTitle(),
      pgn: SAMPLE_PGN,
      topics: ["story"],
      level: "beginner",
      published: true,
      ...overrides,
    });

    return this.getById(response.data.data.id);
  }

  async getById(id: string): Promise<ChessGameFactoryRecord> {
    const response = await this.apiClient.api.chessControllerGetGame(id);
    return response.data.data;
  }

  async update(id: string, data: UpdateGameBody): Promise<ChessGameFactoryRecord> {
    const response = await this.apiClient.api.chessControllerUpdateGame(id, data);
    return response.data.data;
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.api.chessControllerDeleteGame(id);
  }
}

export class ChessPlaySessionFactory {
  constructor(private readonly apiClient: FixtureApiClient) {}

  async list(params?: { page?: number; perPage?: number }) {
    const response = await this.apiClient.api.chessControllerListPlaySessions(params);
    return response.data.data;
  }

  async findLatestByEndReason(endReason: string) {
    const sessions = await this.list({ page: 1, perPage: 20 });
    return sessions.find((session) => session.endReason === endReason) ?? null;
  }
}
