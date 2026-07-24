import { Injectable, NotFoundException } from "@nestjs/common";
import { CHESS_EXERCISE_FORMATS, type ChessTopic } from "@repo/shared";
import { match } from "ts-pattern";

import { ChessRepository } from "./chess.repository";
import { fenPieceCount, uciMoveSequencesEqual } from "./utils/chess-moves.utils";

import type {
  ListChessExercisesParams,
  ListChessGamesParams,
  ListChessPlaySessionsParams,
} from "./chess.types";
import type {
  CreateChessExerciseBody,
  CreateChessGameBody,
  CreateChessPlaySessionBody,
  SubmitChessExerciseAttemptBody,
  UpdateChessExerciseBody,
  UpdateChessGameBody,
} from "./schemas/chess.schema";
import type { UUIDType } from "src/common";

@Injectable()
export class ChessService {
  constructor(private readonly chessRepository: ChessRepository) {}

  listExercises(params: ListChessExercisesParams) {
    return this.chessRepository.listExercises(params);
  }

  async getExercise(id: UUIDType, options?: { requirePublished?: boolean }) {
    const exercise = await this.chessRepository.getExerciseById(id);
    if (!exercise) {
      throw new NotFoundException("Chess exercise not found");
    }
    if (options?.requirePublished && !exercise.published) {
      throw new NotFoundException("Chess exercise not found");
    }
    return exercise;
  }

  async createExercise(body: CreateChessExerciseBody, authorId: UUIDType) {
    const pieceCount = body.pieceCount ?? (body.fen ? fenPieceCount(body.fen) : null);
    return this.chessRepository.createExercise({ ...body, pieceCount }, authorId);
  }

  async updateExercise(id: UUIDType, body: UpdateChessExerciseBody) {
    await this.getExercise(id);
    const pieceCount =
      body.pieceCount !== undefined
        ? body.pieceCount
        : body.fen
          ? fenPieceCount(body.fen)
          : undefined;

    const updated = await this.chessRepository.updateExercise(id, {
      ...body,
      ...(pieceCount !== undefined ? { pieceCount } : {}),
    });
    if (!updated) {
      throw new NotFoundException("Chess exercise not found");
    }
    return updated;
  }

  async deleteExercise(id: UUIDType) {
    const deleted = await this.chessRepository.deleteExercise(id);
    if (!deleted) {
      throw new NotFoundException("Chess exercise not found");
    }
    return { id };
  }

  listGames(params: ListChessGamesParams) {
    return this.chessRepository.listGames(params);
  }

  async getGame(id: UUIDType, options?: { requirePublished?: boolean }) {
    const game = await this.chessRepository.getGameById(id);
    if (!game) {
      throw new NotFoundException("Chess game not found");
    }
    if (options?.requirePublished && !game.published) {
      throw new NotFoundException("Chess game not found");
    }
    return game;
  }

  createGame(body: CreateChessGameBody, authorId: UUIDType) {
    return this.chessRepository.createGame(body, authorId);
  }

  async updateGame(id: UUIDType, body: UpdateChessGameBody) {
    await this.getGame(id);
    const updated = await this.chessRepository.updateGame(id, body);
    if (!updated) {
      throw new NotFoundException("Chess game not found");
    }
    return updated;
  }

  async deleteGame(id: UUIDType) {
    const deleted = await this.chessRepository.deleteGame(id);
    if (!deleted) {
      throw new NotFoundException("Chess game not found");
    }
    return { id };
  }

  createPlaySession(userId: UUIDType, body: CreateChessPlaySessionBody) {
    return this.chessRepository.createPlaySession(userId, body);
  }

  listPlaySessions(userId: UUIDType, params: ListChessPlaySessionsParams) {
    return this.chessRepository.listPlaySessions(userId, params);
  }

  async getPlaySession(id: UUIDType, userId: UUIDType) {
    const session = await this.chessRepository.getPlaySessionById(id, userId);
    if (!session) {
      throw new NotFoundException("Chess play session not found");
    }
    return session;
  }

  async submitExerciseAttempt(
    exerciseId: UUIDType,
    userId: UUIDType,
    body: SubmitChessExerciseAttemptBody,
  ) {
    const exercise = await this.getExercise(exerciseId, { requirePublished: true });

    const isCorrect = match(exercise.format)
      .with(CHESS_EXERCISE_FORMATS.CHESS_FIND_BEST, CHESS_EXERCISE_FORMATS.CHESS_MOVE_LINE, () =>
        uciMoveSequencesEqual(exercise.solution.movesUci, body.movesUci, {
          exactLength: exercise.format === CHESS_EXERCISE_FORMATS.CHESS_MOVE_LINE,
        }),
      )
      .with(CHESS_EXERCISE_FORMATS.TRUE_FALSE, () => body.isTrue === exercise.solution.isTrue)
      .with(CHESS_EXERCISE_FORMATS.BRIEF_RESPONSE, () => {
        const expected = (exercise.solution.text ?? "").trim().toLowerCase();
        const actual = (body.text ?? "").trim().toLowerCase();
        return expected.length > 0 && expected === actual;
      })
      .with(CHESS_EXERCISE_FORMATS.SINGLE_CHOICE, () => {
        const expected = new Set(exercise.solution.choiceIds ?? []);
        const actual = body.choiceIds ?? [];
        return actual.length === expected.size && actual.every((id) => expected.has(id));
      })
      .exhaustive();

    await this.chessRepository.insertExerciseAttempt({
      exerciseId,
      userId,
      isCorrect,
      answer: {
        movesUci: body.movesUci,
        choiceIds: body.choiceIds,
        isTrue: body.isTrue,
        text: body.text,
      },
      timeMs: body.timeMs,
    });

    return {
      isCorrect,
      explanation: isCorrect || exercise.explanation ? exercise.explanation : null,
    };
  }

  getTopics(): { id: ChessTopic; labelKey: string }[] {
    return [
      { id: "intro", labelKey: "chess.topics.intro" },
      { id: "rules", labelKey: "chess.topics.rules" },
      { id: "tournament_rules", labelKey: "chess.topics.tournament_rules" },
      { id: "opening", labelKey: "chess.topics.opening" },
      { id: "middlegame", labelKey: "chess.topics.middlegame" },
      { id: "endgame", labelKey: "chess.topics.endgame" },
      { id: "tactics", labelKey: "chess.topics.tactics" },
      { id: "strategy", labelKey: "chess.topics.strategy" },
      { id: "story", labelKey: "chess.topics.story" },
      { id: "competitive_psychology", labelKey: "chess.topics.competitive_psychology" },
      { id: "student_psychology", labelKey: "chess.topics.student_psychology" },
      { id: "pedagogy", labelKey: "chess.topics.pedagogy" },
    ];
  }
}
