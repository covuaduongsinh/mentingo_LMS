import { Chess } from "chess.js";

/** Same UCI-replay approach as ChessMoveQuestion.tsx's local helper — applies a move list to a starting FEN. */
export function applyUciMoves(startFen: string, moves: string[]): string {
  try {
    const game = new Chess(startFen);
    for (const uci of moves) {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      game.move({ from, to, promotion });
    }
    return game.fen();
  } catch {
    return startFen;
  }
}

export const DEFAULT_CHESS_START_FEN = new Chess().fen();
