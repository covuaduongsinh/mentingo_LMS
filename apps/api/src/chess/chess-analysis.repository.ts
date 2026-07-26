import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { DB } from "src/storage/db/db.providers";
import { chessAnalysisSessionParticipants, chessAnalysisSessions } from "src/storage/schema";

import type { CreateChessAnalysisSessionBody } from "./schemas/chess-analysis.schema";

@Injectable()
export class ChessAnalysisRepository {
  constructor(@Inject(DB) private readonly db: DatabasePg) {}

  async createSession(hostUserId: UUIDType, body: CreateChessAnalysisSessionBody) {
    const [session] = await this.db
      .insert(chessAnalysisSessions)
      .values({
        hostUserId,
        name: body.name,
        ...(body.fen ? { currentFen: body.fen } : {}),
      })
      .returning({ id: chessAnalysisSessions.id });

    return session;
  }

  async getSessionById(id: UUIDType) {
    const [session] = await this.db
      .select()
      .from(chessAnalysisSessions)
      .where(eq(chessAnalysisSessions.id, id))
      .limit(1);

    return session;
  }

  async upsertParticipant(sessionId: UUIDType, userId: UUIDType, role: "host" | "viewer") {
    await this.db
      .insert(chessAnalysisSessionParticipants)
      .values({
        sessionId,
        userId,
        role,
        firstJoinedAt: sql`NOW()`,
      })
      .onConflictDoUpdate({
        target: [
          chessAnalysisSessionParticipants.sessionId,
          chessAnalysisSessionParticipants.userId,
        ],
        set: { lastLeftAt: null },
      });
  }

  async markParticipantLeft(sessionId: UUIDType, userId: UUIDType) {
    await this.db
      .update(chessAnalysisSessionParticipants)
      .set({ lastLeftAt: sql`NOW()` })
      .where(
        and(
          eq(chessAnalysisSessionParticipants.sessionId, sessionId),
          eq(chessAnalysisSessionParticipants.userId, userId),
        ),
      );
  }

  async getParticipantRole(sessionId: UUIDType, userId: UUIDType) {
    const [participant] = await this.db
      .select({ role: chessAnalysisSessionParticipants.role })
      .from(chessAnalysisSessionParticipants)
      .where(
        and(
          eq(chessAnalysisSessionParticipants.sessionId, sessionId),
          eq(chessAnalysisSessionParticipants.userId, userId),
        ),
      )
      .limit(1);

    return participant?.role;
  }

  async applyMove(id: UUIDType, fen: string, moveList: string[]) {
    await this.db
      .update(chessAnalysisSessions)
      .set({ currentFen: fen, moveList })
      .where(eq(chessAnalysisSessions.id, id));
  }

  async resetFen(id: UUIDType, fen: string) {
    await this.db
      .update(chessAnalysisSessions)
      .set({ currentFen: fen, moveList: [] })
      .where(eq(chessAnalysisSessions.id, id));
  }

  async endSession(id: UUIDType) {
    await this.db
      .update(chessAnalysisSessions)
      .set({ status: "ended", endedAt: sql`NOW()` })
      .where(eq(chessAnalysisSessions.id, id));
  }
}
