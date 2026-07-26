import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Chess } from "chess.js";

import { ChessAnalysisRepository } from "./chess-analysis.repository";

import type { CreateChessAnalysisSessionBody } from "./schemas/chess-analysis.schema";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

@Injectable()
export class ChessAnalysisService {
  constructor(private readonly chessAnalysisRepository: ChessAnalysisRepository) {}

  async createSession(currentUser: CurrentUserType, body: CreateChessAnalysisSessionBody) {
    if (body.fen) this.assertValidFen(body.fen);

    const session = await this.chessAnalysisRepository.createSession(currentUser.userId, body);

    await this.chessAnalysisRepository.upsertParticipant(session.id, currentUser.userId, "host");

    return session;
  }

  async getSessionState(id: UUIDType, currentUser: CurrentUserType) {
    const session = await this.chessAnalysisRepository.getSessionById(id);
    if (!session) throw new NotFoundException("chess.analysis.errors.sessionNotFound");

    const isHost = session.hostUserId === currentUser.userId;
    const existingRole = await this.chessAnalysisRepository.getParticipantRole(
      id,
      currentUser.userId,
    );
    const role = isHost ? "host" : (existingRole ?? "viewer");

    return {
      id: session.id,
      hostUserId: session.hostUserId,
      name: session.name,
      status: session.status,
      currentFen: session.currentFen,
      moveList: session.moveList,
      role,
      createdAt: session.createdAt,
      endedAt: session.endedAt,
    };
  }

  /** Called when a client emits `join:chess-analysis`. Returns the room name + this user's role. */
  async joinSession(id: UUIDType, currentUser: CurrentUserType) {
    const session = await this.chessAnalysisRepository.getSessionById(id);
    if (!session) throw new NotFoundException("chess.analysis.errors.sessionNotFound");
    if (session.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException("chess.analysis.errors.tenantMismatch");
    }

    const role = session.hostUserId === currentUser.userId ? "host" : "viewer";
    await this.chessAnalysisRepository.upsertParticipant(id, currentUser.userId, role);

    return { session, role };
  }

  async leaveSession(id: UUIDType, currentUser: CurrentUserType) {
    await this.chessAnalysisRepository.markParticipantLeft(id, currentUser.userId);
  }

  /** Re-validates the move server-side against the session's current FEN before persisting. */
  async applyMove(id: UUIDType, currentUser: CurrentUserType, uciMove: string) {
    const session = await this.chessAnalysisRepository.getSessionById(id);
    if (!session) throw new NotFoundException("chess.analysis.errors.sessionNotFound");
    if (session.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException("chess.analysis.errors.tenantMismatch");
    }
    if (session.status === "ended") {
      throw new BadRequestException("chess.analysis.errors.sessionEnded");
    }

    const game = new Chess(session.currentFen);
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

    try {
      const moved = game.move({ from, to, promotion });
      if (!moved) throw new Error("Illegal move");
    } catch {
      throw new BadRequestException("chess.analysis.errors.illegalMove");
    }

    const nextFen = game.fen();
    const nextMoveList = [...session.moveList, uciMove];

    await this.chessAnalysisRepository.applyMove(id, nextFen, nextMoveList);

    return { fen: nextFen, moveList: nextMoveList };
  }

  async resetFen(id: UUIDType, currentUser: CurrentUserType, fen: string) {
    await this.assertHost(id, currentUser);
    this.assertValidFen(fen);

    await this.chessAnalysisRepository.resetFen(id, fen);

    return { fen };
  }

  async endSession(id: UUIDType, currentUser: CurrentUserType) {
    await this.assertHost(id, currentUser);
    await this.chessAnalysisRepository.endSession(id);
  }

  private async assertHost(id: UUIDType, currentUser: CurrentUserType) {
    const session = await this.chessAnalysisRepository.getSessionById(id);
    if (!session) throw new NotFoundException("chess.analysis.errors.sessionNotFound");
    if (session.hostUserId !== currentUser.userId) {
      throw new ForbiddenException("chess.analysis.errors.hostOnly");
    }
    return session;
  }

  private assertValidFen(fen: string) {
    try {
      new Chess(fen);
    } catch {
      throw new BadRequestException("chess.analysis.errors.invalidFen");
    }
  }
}
