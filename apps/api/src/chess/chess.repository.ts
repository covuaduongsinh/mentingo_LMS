import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import {
  chessExerciseAttempts,
  chessExercises,
  chessGames,
  chessPlaySessions,
} from "src/storage/schema";

import type {
  ChessExerciseRecord,
  ChessGameRecord,
  ChessPlaySessionRecord,
  ListChessExercisesParams,
  ListChessGamesParams,
  ListChessPlaySessionsParams,
} from "./chess.types";
import type {
  CreateChessExerciseBody,
  CreateChessGameBody,
  CreateChessPlaySessionBody,
  UpdateChessExerciseBody,
  UpdateChessGameBody,
} from "./schemas/chess.schema";

@Injectable()
export class ChessRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async listExercises(params: ListChessExercisesParams): Promise<{
    data: ChessExerciseRecord[];
    pagination: { totalItems: number; page: number; perPage: number };
  }> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const offset = (page - 1) * perPage;

    const conditions = [];
    if (params.publishedOnly) {
      conditions.push(eq(chessExercises.published, true));
    }
    if (params.search) {
      conditions.push(ilike(chessExercises.title, `%${params.search}%`));
    }
    if (params.audience) {
      conditions.push(eq(chessExercises.audience, params.audience));
    }
    if (params.format) {
      conditions.push(eq(chessExercises.format, params.format));
    }
    if (params.topic) {
      conditions.push(sql`${params.topic} = ANY(${chessExercises.topics})`);
    }
    if (params.minDifficulty != null) {
      conditions.push(sql`${chessExercises.difficulty} >= ${params.minDifficulty}`);
    }
    if (params.maxDifficulty != null) {
      conditions.push(sql`${chessExercises.difficulty} <= ${params.maxDifficulty}`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(chessExercises)
        .where(where)
        .orderBy(desc(chessExercises.updatedAt))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(chessExercises).where(where),
    ]);

    return {
      data: rows as ChessExerciseRecord[],
      pagination: {
        totalItems: Number(totalRow[0]?.total ?? 0),
        page,
        perPage,
      },
    };
  }

  async getExerciseById(id: UUIDType): Promise<ChessExerciseRecord | null> {
    const [row] = await this.db.select().from(chessExercises).where(eq(chessExercises.id, id));
    return (row as ChessExerciseRecord | undefined) ?? null;
  }

  async createExercise(
    body: CreateChessExerciseBody,
    authorId: UUIDType,
  ): Promise<ChessExerciseRecord> {
    const [row] = await this.db
      .insert(chessExercises)
      .values({
        title: body.title,
        audience: body.audience,
        topics: body.topics ?? [],
        difficulty: body.difficulty,
        format: body.format,
        fen: body.fen ?? null,
        solution: body.solution ?? {},
        explanation: body.explanation ?? null,
        source: body.source,
        pieceCount: body.pieceCount ?? null,
        rating: body.rating ?? null,
        published: body.published ?? false,
        authorId,
      })
      .returning();

    return row as ChessExerciseRecord;
  }

  async updateExercise(
    id: UUIDType,
    body: UpdateChessExerciseBody,
  ): Promise<ChessExerciseRecord | null> {
    const [row] = await this.db
      .update(chessExercises)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.audience !== undefined ? { audience: body.audience } : {}),
        ...(body.topics !== undefined ? { topics: body.topics } : {}),
        ...(body.difficulty !== undefined ? { difficulty: body.difficulty } : {}),
        ...(body.format !== undefined ? { format: body.format } : {}),
        ...(body.fen !== undefined ? { fen: body.fen } : {}),
        ...(body.solution !== undefined ? { solution: body.solution } : {}),
        ...(body.explanation !== undefined ? { explanation: body.explanation } : {}),
        ...(body.source !== undefined ? { source: body.source } : {}),
        ...(body.pieceCount !== undefined ? { pieceCount: body.pieceCount } : {}),
        ...(body.rating !== undefined ? { rating: body.rating } : {}),
        ...(body.published !== undefined ? { published: body.published } : {}),
      })
      .where(eq(chessExercises.id, id))
      .returning();

    return (row as ChessExerciseRecord | undefined) ?? null;
  }

  async deleteExercise(id: UUIDType): Promise<boolean> {
    const deleted = await this.db
      .delete(chessExercises)
      .where(eq(chessExercises.id, id))
      .returning({ id: chessExercises.id });
    return deleted.length > 0;
  }

  async listGames(params: ListChessGamesParams): Promise<{
    data: ChessGameRecord[];
    pagination: { totalItems: number; page: number; perPage: number };
  }> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const offset = (page - 1) * perPage;

    const conditions = [];
    if (params.publishedOnly) {
      conditions.push(eq(chessGames.published, true));
    }
    if (params.search) {
      conditions.push(ilike(chessGames.title, `%${params.search}%`));
    }
    if (params.level) {
      conditions.push(eq(chessGames.level, params.level));
    }
    if (params.topic) {
      conditions.push(sql`${params.topic} = ANY(${chessGames.topics})`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(chessGames)
        .where(where)
        .orderBy(desc(chessGames.updatedAt))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(chessGames).where(where),
    ]);

    return {
      data: rows as ChessGameRecord[],
      pagination: {
        totalItems: Number(totalRow[0]?.total ?? 0),
        page,
        perPage,
      },
    };
  }

  async getGameById(id: UUIDType): Promise<ChessGameRecord | null> {
    const [row] = await this.db.select().from(chessGames).where(eq(chessGames.id, id));
    return (row as ChessGameRecord | undefined) ?? null;
  }

  async createGame(body: CreateChessGameBody, authorId: UUIDType): Promise<ChessGameRecord> {
    const [row] = await this.db
      .insert(chessGames)
      .values({
        title: body.title,
        pgn: body.pgn,
        topics: body.topics ?? [],
        level: body.level,
        teachingNotes: body.teachingNotes ?? null,
        tags: body.tags ?? [],
        published: body.published ?? false,
        authorId,
      })
      .returning();

    return row as ChessGameRecord;
  }

  async updateGame(id: UUIDType, body: UpdateChessGameBody): Promise<ChessGameRecord | null> {
    const [row] = await this.db
      .update(chessGames)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.pgn !== undefined ? { pgn: body.pgn } : {}),
        ...(body.topics !== undefined ? { topics: body.topics } : {}),
        ...(body.level !== undefined ? { level: body.level } : {}),
        ...(body.teachingNotes !== undefined ? { teachingNotes: body.teachingNotes } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        ...(body.published !== undefined ? { published: body.published } : {}),
      })
      .where(eq(chessGames.id, id))
      .returning();

    return (row as ChessGameRecord | undefined) ?? null;
  }

  async deleteGame(id: UUIDType): Promise<boolean> {
    const deleted = await this.db
      .delete(chessGames)
      .where(eq(chessGames.id, id))
      .returning({ id: chessGames.id });
    return deleted.length > 0;
  }

  async createPlaySession(
    userId: UUIDType,
    body: CreateChessPlaySessionBody,
  ): Promise<ChessPlaySessionRecord> {
    const [row] = await this.db
      .insert(chessPlaySessions)
      .values({
        userId,
        playerColor: body.playerColor,
        level: body.level,
        engine: body.engine,
        outcome: body.outcome,
        endReason: body.endReason,
        pgn: body.pgn,
        movesUci: body.movesUci,
        timeControl: body.timeControl ?? null,
        playerTimeLeftMs: body.playerTimeLeftMs ?? null,
        engineTimeLeftMs: body.engineTimeLeftMs ?? null,
        durationMs: body.durationMs ?? null,
        moveCount: body.movesUci.length,
      })
      .returning();

    return row as ChessPlaySessionRecord;
  }

  async listPlaySessions(
    userId: UUIDType,
    params: ListChessPlaySessionsParams,
  ): Promise<{
    data: ChessPlaySessionRecord[];
    pagination: { totalItems: number; page: number; perPage: number };
  }> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const offset = (page - 1) * perPage;

    const where = eq(chessPlaySessions.userId, userId);

    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(chessPlaySessions)
        .where(where)
        .orderBy(desc(chessPlaySessions.createdAt))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(chessPlaySessions).where(where),
    ]);

    return {
      data: rows as ChessPlaySessionRecord[],
      pagination: {
        totalItems: Number(totalRow[0]?.total ?? 0),
        page,
        perPage,
      },
    };
  }

  async getPlaySessionById(id: UUIDType, userId: UUIDType): Promise<ChessPlaySessionRecord | null> {
    const [row] = await this.db
      .select()
      .from(chessPlaySessions)
      .where(and(eq(chessPlaySessions.id, id), eq(chessPlaySessions.userId, userId)));
    return (row as ChessPlaySessionRecord | undefined) ?? null;
  }

  async insertExerciseAttempt(input: {
    exerciseId: UUIDType;
    userId: UUIDType;
    isCorrect: boolean;
    answer: Record<string, unknown>;
    timeMs?: number;
  }) {
    const [row] = await this.db
      .insert(chessExerciseAttempts)
      .values({
        exerciseId: input.exerciseId,
        userId: input.userId,
        isCorrect: input.isCorrect,
        answer: input.answer,
        timeMs: input.timeMs ?? null,
      })
      .returning();
    return row;
  }
}
