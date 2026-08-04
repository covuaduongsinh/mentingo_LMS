import { Chess } from "chess.js";

import type { ChessLearnRule } from "@repo/shared";

/**
 * Evaluate a whitelist Learn rule against a chess.js position after a transcript of moves.
 * Mentingo-owned DSL — not derived from external source code.
 */
export function evaluateLearnRule(
  rule: ChessLearnRule,
  chess: Chess,
  lastMoveUci: string | null,
): boolean {
  switch (rule.op) {
    case "piece_on": {
      const piece = chess.get(rule.square as never);
      if (!piece) return false;
      const fenChar = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
      return fenChar === rule.piece;
    }
    case "piece_not_on": {
      const piece = chess.get(rule.square as never);
      if (!piece) return true;
      const fenChar = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
      return fenChar !== rule.piece;
    }
    case "empty_squares":
      return rule.squares.every((square) => !chess.get(square as never));
    case "board_empty_of": {
      const board = chess.board();
      for (const row of board) {
        for (const cell of row) {
          if (cell && cell.color === rule.color) return false;
        }
      }
      return true;
    }
    case "in_check": {
      const turn = chess.turn();
      if (rule.color && rule.color !== turn) {
        // chess.js only reports check for the side to move; if we need the other color,
        // invert by testing whether that side would be in check if it were their turn —
        // for teaching "I just checked black", after White moves turn is black → isCheck works.
        return false;
      }
      return chess.isCheck();
    }
    case "checkmate":
      return chess.isCheckmate();
    case "stalemate":
      return chess.isStalemate();
    case "last_move_uci":
      return (lastMoveUci ?? "").toLowerCase() === rule.uci.toLowerCase();
    case "and":
      return rule.rules.every((child) => evaluateLearnRule(child, chess, lastMoveUci));
    case "or":
      return rule.rules.some((child) => evaluateLearnRule(child, chess, lastMoveUci));
    case "not":
      return !evaluateLearnRule(rule.rule, chess, lastMoveUci);
    default: {
      const _exhaustive: never = rule;
      return _exhaustive;
    }
  }
}

/** Replay UCI moves from a FEN; returns null if any move is illegal. */
export function replayMovesFromFen(
  fen: string,
  movesUci: string[],
): { chess: Chess; lastMoveUci: string | null } | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }

  let lastMoveUci: string | null = null;
  for (const raw of movesUci) {
    const uci = raw.trim().toLowerCase();
    if (uci.length < 4) return null;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      const result = chess.move({
        from,
        to,
        promotion: promotion as "q" | "r" | "b" | "n" | undefined,
      });
      if (!result) return null;
    } catch {
      return null;
    }
    lastMoveUci = uci;
  }

  return { chess, lastMoveUci };
}
