import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CHESS_GAME_PHASES,
  CHESS_PIECE_TYPES,
  PERMISSIONS,
  classifyChessMoveQuality,
  chessMoveAccuracyFromCentipawnLoss,
  type ChessGamePhase,
} from "@repo/shared";

import { ChessInsightRepository, type ChessInsightInsertRow } from "./chess-insight.repository";
import { ChessMatchRepository } from "./chess-match.repository";
import { ChessEngineService } from "./engine/engine.service";
import {
  classifyGamePhase,
  classifyOpening,
  computeCentipawnLoss,
  computeThinkTimeMs,
  pieceTypeAtSquare,
  resolveEngineScoreCp,
} from "./utils/chess-insight.utils";

import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const ANALYSIS_DEPTH = 10;
const MIN_MOVES_TO_ANALYZE = 2;

/** Self-chosen thresholds — see business spec "Key Technical Context" for rationale. */
const MIN_SAMPLE_MOVES = 5;
const MIN_SAMPLE_GAMES_FOR_OPENING = 3;
const BEHIND_THRESHOLD_CP = -300;
const AHEAD_THRESHOLD_CP = 300;
const TIMEOUT_LOSS_MIN_COUNT = 2;
const TIMEOUT_LOSS_MIN_RATIO = 0.3;

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Injectable()
export class ChessInsightService {
  constructor(
    private readonly repository: ChessInsightRepository,
    private readonly matchRepository: ChessMatchRepository,
    private readonly engineService: ChessEngineService,
  ) {}

  /** Called by the BullMQ worker after a match finishes; safe to re-run (wipes old rows first). */
  async analyzeMatch(matchId: UUIDType) {
    const match = await this.matchRepository.getMatchById(matchId);
    if (!match) return;

    const moves = await this.matchRepository.getMatchMoves(matchId);
    await this.repository.deleteByMatch(matchId);
    if (moves.length < MIN_MOVES_TO_ANALYZE) return;

    const rawScores: number[] = [];
    for (const move of moves) {
      const result = await this.engineService.analyze({
        fen: move.fenAfter,
        depth: ANALYSIS_DEPTH,
      });
      rawScores.push(resolveEngineScoreCp(result));
    }

    const openingKey = classifyOpening(moves.map((move) => move.uci)).key;

    const rows: ChessInsightInsertRow[] = moves.map((move, index) => {
      const fenBeforeMove = index === 0 ? INITIAL_FEN : moves[index - 1].fenAfter;
      const scoreBeforeMoverPerspective = index === 0 ? 0 : rawScores[index - 1];
      const scoreAfterRawOpponentPerspective = rawScores[index];
      const centipawnLoss = computeCentipawnLoss(
        scoreBeforeMoverPerspective,
        scoreAfterRawOpponentPerspective,
      );
      const fromSquare = move.uci.slice(0, 2);
      const previousMomentAt = index === 0 ? match.createdAt : moves[index - 1].createdAt;

      return {
        matchId,
        userId: move.ply % 2 === 0 ? match.whiteUserId : match.blackUserId,
        ply: move.ply,
        phase: classifyGamePhase(move.ply, fenBeforeMove),
        pieceType: pieceTypeAtSquare(fenBeforeMove, fromSquare) ?? CHESS_PIECE_TYPES.PAWN,
        openingKey,
        evaluationCpBefore: Math.round(scoreBeforeMoverPerspective),
        evaluationCpAfter: Math.round(-scoreAfterRawOpponentPerspective),
        centipawnLoss: Math.round(centipawnLoss),
        accuracy: chessMoveAccuracyFromCentipawnLoss(centipawnLoss),
        moveQuality: classifyChessMoveQuality(centipawnLoss),
        thinkTimeMs: computeThinkTimeMs(new Date(move.createdAt), new Date(previousMomentAt)),
        tenantId: match.tenantId,
      };
    });

    await this.repository.bulkInsert(rows);
  }

  async getMatchReport(matchId: UUIDType) {
    const match = await this.matchRepository.getMatchById(matchId);
    if (!match) throw new NotFoundException("chess.insight.errors.matchNotFound");

    const rows = await this.repository.getMatchReport(matchId);
    const summaryFor = (userId: UUIDType) => {
      const own = rows.filter((row) => row.userId === userId);
      const blunders = own.filter((row) => row.moveQuality === "blunder").length;
      const mistakes = own.filter((row) => row.moveQuality === "mistake").length;
      const avgAccuracy =
        own.length > 0 ? own.reduce((sum, row) => sum + row.accuracy, 0) / own.length : null;
      return { moveCount: own.length, avgAccuracy, blunders, mistakes };
    };

    return {
      matchId,
      moves: rows,
      white: summaryFor(match.whiteUserId),
      black: summaryFor(match.blackUserId),
    };
  }

  async getReport(requester: CurrentUserType, targetUserId: UUIDType) {
    if (
      targetUserId !== requester.userId &&
      !requester.permissions.includes(PERMISSIONS.CHESS_INSIGHT_READ_ALL)
    ) {
      throw new ForbiddenException("chess.insight.errors.cannotReadOthersReport");
    }

    const [overall, phaseStats, pieceTypeStats, openingStats, tenantAverageAccuracyRaw] =
      await Promise.all([
        this.repository.getOverallStats(targetUserId),
        this.repository.getPhaseStats(targetUserId),
        this.repository.getPieceTypeStats(targetUserId),
        this.repository.getOpeningStats(targetUserId),
        this.repository.getTenantAverageAccuracy(),
      ]);

    const overallAvgAccuracy = toNumber(overall?.avgAccuracy);

    const phaseRows = phaseStats.map((row) => ({
      phase: row.phase,
      moveCount: row.moveCount,
      avgAccuracy: toNumber(row.avgAccuracy),
      avgCentipawnLoss: toNumber(row.avgCentipawnLoss),
      avgThinkTimeMs: toNumber(row.avgThinkTimeMs),
    }));
    const pieceTypeRows = pieceTypeStats.map((row) => ({
      pieceType: row.pieceType,
      moveCount: row.moveCount,
      avgAccuracy: toNumber(row.avgAccuracy),
      avgCentipawnLoss: toNumber(row.avgCentipawnLoss),
    }));
    const openingRows = openingStats.map((row) => ({
      openingKey: row.openingKey,
      gameCount: row.gameCount,
      avgAccuracy: toNumber(row.avgAccuracy),
    }));

    const weakPhases = phaseRows
      .filter((row) => row.moveCount >= MIN_SAMPLE_MOVES && row.avgAccuracy < overallAvgAccuracy)
      .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
      .map((row) => row.phase);
    const strongPhases = phaseRows
      .filter((row) => row.moveCount >= MIN_SAMPLE_MOVES)
      .sort((a, b) => b.avgAccuracy - a.avgAccuracy)
      .slice(0, 3)
      .map((row) => row.phase);

    const weakPieceTypes = pieceTypeRows
      .filter((row) => row.moveCount >= MIN_SAMPLE_MOVES && row.avgAccuracy < overallAvgAccuracy)
      .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
      .map((row) => row.pieceType);
    const strongPieceTypes = pieceTypeRows
      .filter((row) => row.moveCount >= MIN_SAMPLE_MOVES)
      .sort((a, b) => b.avgAccuracy - a.avgAccuracy)
      .slice(0, 3)
      .map((row) => row.pieceType);

    const weakOpenings = openingRows
      .filter(
        (row) =>
          row.gameCount >= MIN_SAMPLE_GAMES_FOR_OPENING && row.avgAccuracy < overallAvgAccuracy,
      )
      .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
      .map((row) => row.openingKey);
    const strongOpenings = openingRows
      .filter((row) => row.gameCount >= MIN_SAMPLE_GAMES_FOR_OPENING)
      .sort((a, b) => b.avgAccuracy - a.avgAccuracy)
      .slice(0, 3)
      .map((row) => row.openingKey);

    const timeManagement = await this.computeTimeManagementAndOutcomes(targetUserId, phaseRows);

    return {
      hasData: overall !== undefined && overall.moveCount > 0,
      overallAvgAccuracy,
      tenantAverageAccuracy: toNumber(tenantAverageAccuracyRaw),
      byPhase: phaseRows,
      byPieceType: pieceTypeRows,
      byOpening: openingRows,
      weakPhases,
      strongPhases,
      weakPieceTypes,
      strongPieceTypes,
      weakOpenings,
      strongOpenings,
      ...timeManagement,
    };
  }

  private async computeTimeManagementAndOutcomes(
    userId: UUIDType,
    phaseRows: { phase: ChessGamePhase; avgThinkTimeMs: number }[],
  ) {
    const matches = await this.repository.getAnalyzedMatchesForUser(userId);
    const matchIds = matches.map((match) => match.id);
    const insightRows = await this.repository.getInsightRowsForMatches(matchIds);

    const rowsByMatch = new Map<UUIDType, typeof insightRows>();
    for (const row of insightRows) {
      const bucket = rowsByMatch.get(row.matchId) ?? [];
      bucket.push(row);
      rowsByMatch.set(row.matchId, bucket);
    }

    let behindCount = 0;
    let recoveredCount = 0;
    let aheadCount = 0;
    let convertedFailCount = 0;
    let totalLossCount = 0;
    let timeoutLossCount = 0;

    for (const match of matches) {
      const isWhite = match.whiteUserId === userId;
      const outcome: "win" | "loss" | "draw" =
        match.result === null
          ? "draw"
          : match.result === "draw"
            ? "draw"
            : (match.result === "white_win") === isWhite
              ? "win"
              : "loss";

      if (outcome === "loss") {
        totalLossCount += 1;
        if (match.endReason === "timeout") timeoutLossCount += 1;
      }

      const rows = rowsByMatch.get(match.id) ?? [];
      const trajectory = rows.map((row) =>
        row.userId === userId ? row.evaluationCpAfter : -row.evaluationCpAfter,
      );
      if (trajectory.length === 0) continue;

      const min = Math.min(...trajectory);
      const max = Math.max(...trajectory);
      const wasBehind = min <= BEHIND_THRESHOLD_CP;
      const wasAhead = max >= AHEAD_THRESHOLD_CP;

      if (wasBehind) {
        behindCount += 1;
        if (outcome !== "loss") recoveredCount += 1;
      }
      if (wasAhead) {
        aheadCount += 1;
        if (outcome !== "win") convertedFailCount += 1;
      }
    }

    const openingPhase = phaseRows.find((row) => row.phase === CHESS_GAME_PHASES.OPENING);
    const middlegamePhase = phaseRows.find((row) => row.phase === CHESS_GAME_PHASES.MIDDLEGAME);
    const endgamePhase = phaseRows.find((row) => row.phase === CHESS_GAME_PHASES.ENDGAME);

    return {
      timeManagement: {
        avgThinkTimeMsByPhase: {
          opening: openingPhase?.avgThinkTimeMs ?? 0,
          middlegame: middlegamePhase?.avgThinkTimeMs ?? 0,
          endgame: endgamePhase?.avgThinkTimeMs ?? 0,
        },
        totalLossCount,
        timeoutLossCount,
        needsTimeManagementFocus:
          timeoutLossCount >= TIMEOUT_LOSS_MIN_COUNT &&
          totalLossCount > 0 &&
          timeoutLossCount / totalLossCount >= TIMEOUT_LOSS_MIN_RATIO,
      },
      recovery: {
        timesBehind: behindCount,
        recoveredCount,
      },
      conversion: {
        timesAhead: aheadCount,
        failedToConvertCount: convertedFailCount,
      },
    };
  }
}
