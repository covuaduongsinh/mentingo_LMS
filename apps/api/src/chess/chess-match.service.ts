import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CHESS_COLOR_PREFERENCES,
  CHESS_MATCH_END_REASONS,
  CHESS_MATCH_RESULTS,
  CHESS_MATCH_STATUSES,
  CHESS_MATCH_TIME_CONTROL_LIST,
  CHESS_SEEK_STATUSES,
  chessRatingCategoryForTimeControl,
  type ChessMatchEndReason,
} from "@repo/shared";
import { Chess } from "chess.js";

import { QUEUE_NAMES, QueueService } from "src/queue";

import { ChessMatchRepository } from "./chess-match.repository";
import { ChessPuzzleRepository } from "./chess-puzzle.repository";
import { createDefaultRating, updateRating } from "./glicko/glicko2";

import type { CreateChessSeekBody } from "./schemas/chess-match.schema";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

const SEEK_EXPIRY_MS = 5 * 60 * 1000;
/** Skip Insight analysis for near-empty games (e.g. immediate abandonment). */
const MIN_MOVES_FOR_INSIGHT_ANALYSIS = 2;

function timeControlBaseMs(timeControlId: string): number {
  const control = CHESS_MATCH_TIME_CONTROL_LIST.find((entry) => entry.id === timeControlId);
  if (!control || control.baseSeconds === null) {
    throw new BadRequestException("chess.match.errors.invalidTimeControl");
  }
  return control.baseSeconds * 1000;
}

function timeControlIncrementMs(timeControlId: string): number {
  const control = CHESS_MATCH_TIME_CONTROL_LIST.find((entry) => entry.id === timeControlId);
  return (control?.incrementSeconds ?? 0) * 1000;
}

@Injectable()
export class ChessMatchService {
  constructor(
    private readonly repository: ChessMatchRepository,
    private readonly puzzleRepository: ChessPuzzleRepository,
    private readonly queueService: QueueService,
  ) {}

  async createSeek(user: CurrentUserType, body: CreateChessSeekBody) {
    if (body.challengedUserId === user.userId) {
      throw new BadRequestException("chess.match.errors.cannotChallengeSelf");
    }
    timeControlBaseMs(body.timeControlId); // validates the time control exists and has a clock

    return this.repository.createSeek({
      creatorUserId: user.userId,
      challengedUserId: body.challengedUserId,
      timeControlId: body.timeControlId,
      colorPreference: body.colorPreference ?? CHESS_COLOR_PREFERENCES.RANDOM,
      rated: body.rated ?? true,
    });
  }

  async listOpenSeeks(user: CurrentUserType) {
    return this.repository.listOpenSeeks(user.userId);
  }

  async cancelSeek(user: CurrentUserType, seekId: UUIDType) {
    const seek = await this.getSeekOrThrow(seekId);
    if (seek.creatorUserId !== user.userId) {
      throw new ForbiddenException("chess.match.errors.notSeekOwner");
    }
    if (seek.status !== CHESS_SEEK_STATUSES.PENDING) {
      throw new BadRequestException("chess.match.errors.seekNotPending");
    }
    await this.repository.markSeekStatus(seekId, "cancelled");
  }

  async acceptSeek(user: CurrentUserType, seekId: UUIDType) {
    const seek = await this.getSeekOrThrow(seekId);
    if (seek.status !== CHESS_SEEK_STATUSES.PENDING) {
      throw new BadRequestException("chess.match.errors.seekNotPending");
    }
    if (seek.creatorUserId === user.userId) {
      throw new BadRequestException("chess.match.errors.cannotAcceptOwnSeek");
    }
    if (seek.challengedUserId && seek.challengedUserId !== user.userId) {
      throw new ForbiddenException("chess.match.errors.notChallenged");
    }

    const baseMs = timeControlBaseMs(seek.timeControlId);
    const creatorIsWhite =
      seek.colorPreference === CHESS_COLOR_PREFERENCES.WHITE
        ? true
        : seek.colorPreference === CHESS_COLOR_PREFERENCES.BLACK
          ? false
          : Math.random() < 0.5;

    const match = await this.repository.createMatch({
      whiteUserId: creatorIsWhite ? seek.creatorUserId : user.userId,
      blackUserId: creatorIsWhite ? user.userId : seek.creatorUserId,
      timeControlId: seek.timeControlId,
      rated: seek.rated,
      whiteTimeRemainingMs: baseMs,
      blackTimeRemainingMs: baseMs,
    });

    await this.repository.markSeekMatched(seekId, match.id);
    await this.scheduleTimeoutCheck(
      match.tenantId,
      match.id,
      new Date(match.lastMoveAt).getTime(),
      match.whiteUserId,
      baseMs,
    );
    return match;
  }

  /**
   * Creates a match directly, skipping the seek/accept flow — used by bulk pairing,
   * Swiss/Arena round generation, and Simul (chess-tournament module). Schedules the
   * same timeout-check job acceptSeek does, so an absent player still auto-loses on time.
   */
  async createDirectMatch(params: {
    whiteUserId: UUIDType;
    blackUserId: UUIDType;
    timeControlId: string;
    rated: boolean;
  }) {
    const baseMs = timeControlBaseMs(params.timeControlId);
    const match = await this.repository.createMatch({
      whiteUserId: params.whiteUserId,
      blackUserId: params.blackUserId,
      timeControlId: params.timeControlId,
      rated: params.rated,
      whiteTimeRemainingMs: baseMs,
      blackTimeRemainingMs: baseMs,
    });

    await this.scheduleTimeoutCheck(
      match.tenantId,
      match.id,
      new Date(match.lastMoveAt).getTime(),
      match.whiteUserId,
      baseMs,
    );

    return match;
  }

  async getMatchState(user: CurrentUserType, matchId: UUIDType) {
    const match = await this.getMatchOrThrow(matchId);
    const moves = await this.repository.getMatchMoves(matchId);
    const role = this.roleFor(match, user.userId);
    return { ...match, moves, role };
  }

  private roleFor(
    match: { whiteUserId: string; blackUserId: string },
    userId: string,
  ): "white" | "black" | "viewer" {
    if (match.whiteUserId === userId) return "white";
    if (match.blackUserId === userId) return "black";
    return "viewer";
  }

  async applyMove(user: CurrentUserType, matchId: UUIDType, uci: string) {
    const match = await this.getMatchOrThrow(matchId);
    if (match.status !== CHESS_MATCH_STATUSES.ACTIVE) {
      throw new BadRequestException("chess.match.errors.matchEnded");
    }

    const game = new Chess(match.currentFen);
    const turn = game.turn() === "w" ? "white" : "black";
    const moverUserId = turn === "white" ? match.whiteUserId : match.blackUserId;
    if (moverUserId !== user.userId) {
      throw new ForbiddenException("chess.match.errors.notYourTurn");
    }

    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    let moved;
    try {
      moved = game.move({ from, to, promotion });
    } catch {
      moved = null;
    }
    if (!moved) {
      throw new BadRequestException("chess.match.errors.illegalMove");
    }

    const now = new Date();
    const elapsedMs = now.getTime() - new Date(match.lastMoveAt).getTime();
    const incrementMs = timeControlIncrementMs(match.timeControlId);

    let whiteTimeRemainingMs = match.whiteTimeRemainingMs;
    let blackTimeRemainingMs = match.blackTimeRemainingMs;
    if (turn === "white") {
      whiteTimeRemainingMs = Math.max(0, whiteTimeRemainingMs - elapsedMs) + incrementMs;
    } else {
      blackTimeRemainingMs = Math.max(0, blackTimeRemainingMs - elapsedMs) + incrementMs;
    }

    if (turn === "white" && whiteTimeRemainingMs <= 0) {
      return this.endMatch(matchId, CHESS_MATCH_RESULTS.BLACK_WIN, CHESS_MATCH_END_REASONS.TIMEOUT);
    }
    if (turn === "black" && blackTimeRemainingMs <= 0) {
      return this.endMatch(matchId, CHESS_MATCH_RESULTS.WHITE_WIN, CHESS_MATCH_END_REASONS.TIMEOUT);
    }

    const ply = await this.repository.getMoveCount(matchId);
    await this.repository.appendMoveAndUpdateClock({
      matchId,
      ply,
      uci,
      san: moved.san,
      fenAfter: game.fen(),
      currentFen: game.fen(),
      whiteTimeRemainingMs,
      blackTimeRemainingMs,
      lastMoveAt: now,
      drawOfferedByUserId: null, // playing a move implicitly declines any pending draw offer
    });

    const nextTimeRemainingMs = turn === "white" ? blackTimeRemainingMs : whiteTimeRemainingMs;

    if (game.isCheckmate()) {
      const winner =
        turn === "white" ? CHESS_MATCH_RESULTS.WHITE_WIN : CHESS_MATCH_RESULTS.BLACK_WIN;
      return this.endMatch(matchId, winner, CHESS_MATCH_END_REASONS.CHECKMATE);
    }
    if (game.isStalemate()) {
      return this.endMatch(matchId, CHESS_MATCH_RESULTS.DRAW, CHESS_MATCH_END_REASONS.STALEMATE);
    }
    if (game.isInsufficientMaterial()) {
      return this.endMatch(
        matchId,
        CHESS_MATCH_RESULTS.DRAW,
        CHESS_MATCH_END_REASONS.INSUFFICIENT_MATERIAL,
      );
    }
    if (game.isThreefoldRepetition()) {
      return this.endMatch(matchId, CHESS_MATCH_RESULTS.DRAW, CHESS_MATCH_END_REASONS.THREEFOLD);
    }
    if (game.isDrawByFiftyMoves()) {
      return this.endMatch(matchId, CHESS_MATCH_RESULTS.DRAW, CHESS_MATCH_END_REASONS.FIFTY_MOVE);
    }

    const nextMoverUserId = turn === "white" ? match.blackUserId : match.whiteUserId;
    await this.scheduleTimeoutCheck(
      match.tenantId,
      match.id,
      now.getTime(),
      nextMoverUserId,
      nextTimeRemainingMs,
    );

    return {
      fen: game.fen(),
      san: moved.san,
      whiteTimeRemainingMs,
      blackTimeRemainingMs,
      finished: false as const,
      lastMoveAtMs: now.getTime(),
    };
  }

  private async scheduleTimeoutCheck(
    tenantId: UUIDType,
    matchId: UUIDType,
    lastMoveAtMs: number,
    expiringUserId: UUIDType,
    delayMs: number,
  ) {
    await this.queueService
      .getQueue(QUEUE_NAMES.CHESS_MATCH_TIMEOUT_CHECK)
      .add(
        "timeout-check",
        { tenantId, matchId, expectedLastMoveAtMs: lastMoveAtMs, expiringUserId },
        { delay: Math.max(0, delayMs) },
      );
  }

  async resign(user: CurrentUserType, matchId: UUIDType) {
    const match = await this.getMatchOrThrow(matchId);
    if (match.status !== CHESS_MATCH_STATUSES.ACTIVE) {
      throw new BadRequestException("chess.match.errors.matchEnded");
    }
    const role = this.roleFor(match, user.userId);
    if (role === "viewer") {
      throw new ForbiddenException("chess.match.errors.notAPlayer");
    }
    const winner = role === "white" ? CHESS_MATCH_RESULTS.BLACK_WIN : CHESS_MATCH_RESULTS.WHITE_WIN;
    return this.endMatch(matchId, winner, CHESS_MATCH_END_REASONS.RESIGNATION);
  }

  async offerDraw(user: CurrentUserType, matchId: UUIDType) {
    const match = await this.getMatchOrThrow(matchId);
    if (match.status !== CHESS_MATCH_STATUSES.ACTIVE) {
      throw new BadRequestException("chess.match.errors.matchEnded");
    }
    if (this.roleFor(match, user.userId) === "viewer") {
      throw new ForbiddenException("chess.match.errors.notAPlayer");
    }
    await this.repository.setDrawOffer(matchId, user.userId);
  }

  async acceptDraw(user: CurrentUserType, matchId: UUIDType) {
    const match = await this.getMatchOrThrow(matchId);
    if (match.status !== CHESS_MATCH_STATUSES.ACTIVE) {
      throw new BadRequestException("chess.match.errors.matchEnded");
    }
    if (!match.drawOfferedByUserId || match.drawOfferedByUserId === user.userId) {
      throw new BadRequestException("chess.match.errors.noDrawOffer");
    }
    return this.endMatch(matchId, CHESS_MATCH_RESULTS.DRAW, CHESS_MATCH_END_REASONS.DRAW_AGREED);
  }

  /** Called by the timeout-check worker; no-ops if a move has happened since the check was scheduled. */
  async handleTimeoutCheck(
    matchId: UUIDType,
    expectedLastMoveAtMs: number,
    expiringUserId: UUIDType,
  ) {
    const match = await this.repository.getMatchById(matchId);
    if (!match || match.status !== CHESS_MATCH_STATUSES.ACTIVE) return null;
    if (new Date(match.lastMoveAt).getTime() !== expectedLastMoveAtMs) return null; // a move happened since

    const winner =
      expiringUserId === match.whiteUserId
        ? CHESS_MATCH_RESULTS.BLACK_WIN
        : CHESS_MATCH_RESULTS.WHITE_WIN;
    return this.endMatch(matchId, winner, CHESS_MATCH_END_REASONS.TIMEOUT);
  }

  private async endMatch(
    matchId: UUIDType,
    result: (typeof CHESS_MATCH_RESULTS)[keyof typeof CHESS_MATCH_RESULTS],
    endReason: ChessMatchEndReason,
  ) {
    const match = await this.getMatchOrThrow(matchId);
    await this.repository.finishMatch(matchId, result, endReason);

    if (match.rated) {
      await this.updateRatingsForMatch(match, result);
    }

    const moveCount = await this.repository.getMoveCount(matchId);
    if (moveCount >= MIN_MOVES_FOR_INSIGHT_ANALYSIS) {
      await this.queueService
        .getQueue(QUEUE_NAMES.CHESS_MATCH_INSIGHT_ANALYSIS)
        .add("analyze-match", { tenantId: match.tenantId, matchId });
    }

    return {
      finished: true as const,
      result,
      endReason,
      whiteUserId: match.whiteUserId,
      blackUserId: match.blackUserId,
    };
  }

  private async updateRatingsForMatch(
    match: { whiteUserId: string; blackUserId: string; timeControlId: string },
    result: (typeof CHESS_MATCH_RESULTS)[keyof typeof CHESS_MATCH_RESULTS],
  ) {
    const control = CHESS_MATCH_TIME_CONTROL_LIST.find((entry) => entry.id === match.timeControlId);
    if (!control || control.baseSeconds === null) return;
    const category = chessRatingCategoryForTimeControl(control.baseSeconds);

    const whiteScore: 0 | 0.5 | 1 =
      result === CHESS_MATCH_RESULTS.WHITE_WIN ? 1 : result === CHESS_MATCH_RESULTS.DRAW ? 0.5 : 0;
    const blackScore: 0 | 0.5 | 1 = whiteScore === 1 ? 0 : whiteScore === 0 ? 1 : 0.5;

    const whiteRatingRow = (await this.puzzleRepository.getOrCreateRating(
      match.whiteUserId,
      category,
    )) ?? {
      ...createDefaultRating(),
    };
    const blackRatingRow = (await this.puzzleRepository.getOrCreateRating(
      match.blackUserId,
      category,
    )) ?? {
      ...createDefaultRating(),
    };

    const newWhiteRating = updateRating(whiteRatingRow, [
      { opponent: blackRatingRow, score: whiteScore },
    ]);
    const newBlackRating = updateRating(blackRatingRow, [
      { opponent: whiteRatingRow, score: blackScore },
    ]);

    await this.puzzleRepository.saveRating(match.whiteUserId, category, newWhiteRating, true);
    await this.puzzleRepository.saveRating(match.blackUserId, category, newBlackRating, true);
  }

  private async getSeekOrThrow(seekId: UUIDType) {
    const seek = await this.repository.getSeekById(seekId);
    if (!seek) throw new NotFoundException("chess.match.errors.seekNotFound");
    return seek;
  }

  private async getMatchOrThrow(matchId: UUIDType) {
    const match = await this.repository.getMatchById(matchId);
    if (!match) throw new NotFoundException("chess.match.errors.matchNotFound");
    return match;
  }

  async expireStaleSeeks() {
    await this.repository.expireStaleSeeks(new Date(Date.now() - SEEK_EXPIRY_MS));
  }
}
