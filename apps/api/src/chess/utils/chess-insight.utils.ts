import {
  CHESS_GAME_PHASES,
  CHESS_OPENING_BOOK,
  CHESS_PIECE_TYPE_BY_FEN_LETTER,
  type ChessGamePhase,
  type ChessOpeningKey,
  type ChessPieceType,
} from "@repo/shared";
import { Chess, type Square } from "chess.js";

/** Piece values for the endgame-material heuristic — standard beginner point scale. */
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** A position counts as "endgame" once combined non-king material drops to/below this. */
const ENDGAME_MATERIAL_THRESHOLD = 26;

/** A position counts as "opening" for the first this-many plies (10 full moves each side). */
const OPENING_PLY_CUTOFF = 20;

/**
 * Converts a raw engine analyze() result (UCI "score cp"/"mate", always from the
 * perspective of the side to move at that position) into a single signed centipawn
 * number, so mate scores compare sensibly against ordinary centipawn scores.
 */
export function resolveEngineScoreCp(result: {
  scoreCp: number | null;
  mate: number | null;
}): number {
  if (result.mate === null) return result.scoreCp ?? 0;
  return result.mate > 0 ? 100000 - result.mate * 10 : -100000 - result.mate * 10;
}

/**
 * Centipawn loss for the mover: how much worse the position (from the mover's perspective)
 * became compared to what the engine judged achievable before the move.
 * `scoreAfterRawOpponentPerspective` is the raw analyze() score at the resulting position
 * (from the opponent's perspective, since it's their turn there) — negate to compare.
 */
export function computeCentipawnLoss(
  scoreBeforeMoverPerspective: number,
  scoreAfterRawOpponentPerspective: number,
): number {
  const scoreAfterMoverPerspective = -scoreAfterRawOpponentPerspective;
  return Math.max(0, scoreBeforeMoverPerspective - scoreAfterMoverPerspective);
}

function nonKingMaterialTotal(fen: string): number {
  const game = new Chess(fen);
  let total = 0;
  for (const row of game.board()) {
    for (const square of row) {
      if (!square || square.type === "k") continue;
      total += PIECE_VALUE[square.type] ?? 0;
    }
  }
  return total;
}

/** Self-designed heuristic — see business spec for rationale on the thresholds. */
export function classifyGamePhase(ply: number, fenBeforeMove: string): ChessGamePhase {
  if (ply < OPENING_PLY_CUTOFF) return CHESS_GAME_PHASES.OPENING;
  return nonKingMaterialTotal(fenBeforeMove) <= ENDGAME_MATERIAL_THRESHOLD
    ? CHESS_GAME_PHASES.ENDGAME
    : CHESS_GAME_PHASES.MIDDLEGAME;
}

/** Reads the moving piece's type off its origin square in the position before the move. */
export function pieceTypeAtSquare(fenBeforeMove: string, square: string): ChessPieceType | null {
  const game = new Chess(fenBeforeMove);
  const piece = game.get(square as Square);
  if (!piece) return null;
  return CHESS_PIECE_TYPE_BY_FEN_LETTER[piece.type] ?? null;
}

/** Longest-prefix match against the in-house opening book; "unclassified" if nothing matches. */
export function classifyOpening(movesUci: string[]): { key: ChessOpeningKey; nameVi: string } {
  let best: (typeof CHESS_OPENING_BOOK)[number] | null = null;
  for (const entry of CHESS_OPENING_BOOK) {
    if (entry.movesUci.length > movesUci.length) continue;
    const matches = entry.movesUci.every((uci: string, index: number) => movesUci[index] === uci);
    if (matches && (!best || entry.movesUci.length > best.movesUci.length)) {
      best = entry;
    }
  }
  return best
    ? { key: best.key, nameVi: best.nameVi }
    : { key: "unclassified", nameVi: "Chưa phân loại" };
}

/** Thinking time for a move: gap since the previous move (or match creation for the first ply), clamped >= 0. */
export function computeThinkTimeMs(currentMoveCreatedAt: Date, previousMomentAt: Date): number {
  return Math.max(0, currentMoveCreatedAt.getTime() - previousMomentAt.getTime());
}
