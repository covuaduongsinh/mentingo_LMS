import { Chess } from "chess.js";

import type { EngineAnalyzeResult, EngineBestMoveResult } from "./engine.types";

/** Piece values for a simple MIT-safe evaluation (no external GPL engine). */
const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

function evaluate(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === "w" ? -100000 : 100000;
  }
  if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
    return 0;
  }

  let score = 0;
  const board = game.board();
  for (const row of board) {
    for (const square of row) {
      if (!square) continue;
      const value = PIECE_VALUE[square.type] ?? 0;
      score += square.color === "w" ? value : -value;
    }
  }
  return score;
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluate(game);
  }

  const moves = game.moves({ verbose: true });
  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const score = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxEval;
  }

  let minEval = Infinity;
  for (const move of moves) {
    game.move(move);
    const score = minimax(game, depth - 1, alpha, beta, true);
    game.undo();
    minEval = Math.min(minEval, score);
    beta = Math.min(beta, score);
    if (beta <= alpha) break;
  }
  return minEval;
}

function loadPosition(fen: string, movesUci?: string[]): Chess {
  const game = new Chess(fen);
  for (const uci of movesUci ?? []) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const result = game.move({ from, to, promotion });
    if (!result) {
      throw new Error(`Illegal move in sequence: ${uci}`);
    }
  }
  return game;
}

function moveToUci(move: { from: string; to: string; promotion?: string }): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

/**
 * Lightweight MIT minimax used when Arasan binary is unavailable.
 * Not tournament-strength — suitable for school-level play/demo.
 */
export function builtinBestMove(
  fen: string,
  movesUci: string[] | undefined,
  depth: number,
): EngineBestMoveResult {
  const searchDepth = Math.max(1, Math.min(depth, 4));
  const game = loadPosition(fen, movesUci);
  if (game.isGameOver()) {
    throw new Error("Game is already over");
  }

  const maximizing = game.turn() === "w";
  let bestMoveUci: string | null = null;
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const move of game.moves({ verbose: true })) {
    game.move(move);
    const score = minimax(game, searchDepth - 1, -Infinity, Infinity, !maximizing);
    game.undo();

    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMoveUci = moveToUci(move);
    }
  }

  if (!bestMoveUci) {
    throw new Error("No legal moves");
  }

  return {
    bestMoveUci,
    engine: "builtin",
    depth: searchDepth,
  };
}

export function builtinAnalyze(
  fen: string,
  movesUci: string[] | undefined,
  depth: number,
): EngineAnalyzeResult {
  const result = builtinBestMove(fen, movesUci, depth);
  const game = loadPosition(fen, movesUci);
  const scoreCp = evaluate(game);

  return {
    bestMoveUci: result.bestMoveUci,
    scoreCp: game.turn() === "w" ? scoreCp : -scoreCp,
    mate: game.isCheckmate() ? 0 : null,
    pv: [result.bestMoveUci],
    depth: result.depth,
    engine: "builtin",
  };
}
