import { CHESS_PRACTICE_GOAL_TYPES, type ChessPracticeGoalType } from "@repo/shared";
import { Chess } from "chess.js";

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** White total minus Black total, standard piece-value scale (P1 N3 B3 R5 Q9). */
export function materialBalance(fen: string): number {
  const board = new Chess(fen).board();
  let balance = 0;
  for (const row of board) {
    for (const square of row) {
      if (!square) continue;
      const value = PIECE_VALUES[square.type] ?? 0;
      balance += square.color === "w" ? value : -value;
    }
  }
  return balance;
}

export type PracticeGoalReplayResult =
  | { legal: true; finalFen: string; movesUsed: number }
  | { legal: false };

/** Replays a UCI move sequence from rootFen server-side — never trusts the client's claimed outcome. */
export function replayPracticeMoves(rootFen: string, movesUci: string[]): PracticeGoalReplayResult {
  const game = new Chess(rootFen);

  for (const uci of movesUci) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;

    let moved;
    try {
      moved = game.move({ from, to, promotion });
    } catch {
      moved = null;
    }
    if (!moved) return { legal: false };
  }

  return { legal: true, finalFen: game.fen(), movesUsed: movesUci.length };
}

/**
 * `movesUsed` is a ply count (each side's move counts individually), matching the length
 * of the submitted UCI array — see chess-learn-business-spec.md. Material-advantage goals
 * are evaluated as White-minus-Black by convention (author the chapter accordingly).
 */
export function evaluatePracticeGoal(
  goalType: ChessPracticeGoalType,
  targetValue: number | null,
  finalFen: string,
  movesUsed: number,
): boolean {
  const game = new Chess(finalFen);

  if (goalType === CHESS_PRACTICE_GOAL_TYPES.CHECKMATE_IN_N) {
    return game.isCheckmate() && (targetValue === null || movesUsed <= targetValue);
  }
  if (goalType === CHESS_PRACTICE_GOAL_TYPES.DRAW) {
    return game.isDraw();
  }
  if (goalType === CHESS_PRACTICE_GOAL_TYPES.REACH_MATERIAL_ADVANTAGE) {
    return targetValue !== null && materialBalance(finalFen) >= targetValue;
  }
  return false;
}
