import { Chess } from "chess.js";

import type { ChessLearnLevel, ChessLearnScriptStep } from "@repo/shared";

export type GradeResult = {
  correct: boolean;
  /** Points from targets/captures/script steps before efficiency bonus. */
  eventPoints: number;
  eventMaxPoints: number;
};

const POINTS_PER_TARGET = 50;
const POINTS_PER_CAPTURE_FLAT = 50;
const POINTS_PER_SCRIPT_STEP = 50;

/**
 * Drill replay: learner keeps the same side to move after each ply (teaching positions
 * are not full games). Restores turn via FEN patch after each legal move.
 */
function replaySameSide(fen: string, movesUci: string[]): Chess | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const learnerColor = chess.turn();

  for (const raw of movesUci) {
    const uci = raw.trim().toLowerCase();
    if (uci.length < 4) return null;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      const move = chess.move({
        from,
        to,
        promotion: promotion as "q" | "r" | "b" | "n" | undefined,
      });
      if (!move) return null;
    } catch {
      return null;
    }
    // Force turn back to the learner for the next drill move.
    if (chess.turn() !== learnerColor) {
      const parts = chess.fen().split(" ");
      parts[1] = learnerColor;
      try {
        chess.load(parts.join(" "));
      } catch {
        return null;
      }
    }
  }

  return chess;
}

/**
 * Grade collect_targets: each move that lands on a remaining target clears it.
 * Sparse FENs keep paths open; same-side drill replay (not full alternating game).
 */
export function gradeCollectTargets(level: ChessLearnLevel, movesUci: string[]): GradeResult {
  const targets = new Set((level.targets ?? []).map((s) => s.toLowerCase()));
  const initialCount = targets.size;
  if (initialCount === 0) {
    return { correct: false, eventPoints: 0, eventMaxPoints: 0 };
  }

  const remaining = new Set(targets);
  const chess = replaySameSide(level.fen, movesUci);
  if (!chess) {
    // Still credit partial visits if prefix was legal — re-walk until failure.
    return gradeCollectTargetsPartial(level.fen, movesUci, remaining, initialCount);
  }

  // Re-walk destinations for scoring (replay already validated legality).
  for (const raw of movesUci) {
    const to = raw.trim().toLowerCase().slice(2, 4);
    if (remaining.has(to)) remaining.delete(to);
  }

  const cleared = initialCount - remaining.size;
  return {
    correct: remaining.size === 0,
    eventPoints: cleared * POINTS_PER_TARGET,
    eventMaxPoints: initialCount * POINTS_PER_TARGET,
  };
}

function gradeCollectTargetsPartial(
  fen: string,
  movesUci: string[],
  remaining: Set<string>,
  initialCount: number,
): GradeResult {
  const chess = replaySameSide(fen, []);
  if (!chess) {
    return { correct: false, eventPoints: 0, eventMaxPoints: initialCount * POINTS_PER_TARGET };
  }
  const learnerColor = chess.turn();
  for (const raw of movesUci) {
    const uci = raw.trim().toLowerCase();
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      const move = chess.move({
        from,
        to,
        promotion: promotion as "q" | "r" | "b" | "n" | undefined,
      });
      if (!move) break;
    } catch {
      break;
    }
    if (remaining.has(to)) remaining.delete(to);
    if (chess.turn() !== learnerColor) {
      const parts = chess.fen().split(" ");
      parts[1] = learnerColor;
      try {
        chess.load(parts.join(" "));
      } catch {
        break;
      }
    }
  }
  const cleared = initialCount - remaining.size;
  return {
    correct: remaining.size === 0,
    eventPoints: cleared * POINTS_PER_TARGET,
    eventMaxPoints: initialCount * POINTS_PER_TARGET,
  };
}

export function gradeClearSide(level: ChessLearnLevel, movesUci: string[]): GradeResult {
  const clearColor = level.clearColor ?? "b";
  // Kings stay on the board for chess.js validity; drills clear non-king pieces only.
  const countNonKings = (chess: Chess, color: "w" | "b") => {
    let n = 0;
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell && cell.color === color && cell.type !== "k") n += 1;
      }
    }
    return n;
  };

  let startCount = 0;
  try {
    startCount = countNonKings(new Chess(level.fen), clearColor);
  } catch {
    startCount = 0;
  }

  const eventMaxPoints = Math.max(1, startCount) * POINTS_PER_CAPTURE_FLAT;
  const chess = replaySameSide(level.fen, movesUci);
  if (!chess) {
    return { correct: false, eventPoints: 0, eventMaxPoints };
  }

  const remaining = countNonKings(chess, clearColor);
  const captures = Math.max(0, startCount - remaining);
  return {
    correct: remaining === 0,
    eventPoints: captures * POINTS_PER_CAPTURE_FLAT,
    eventMaxPoints,
  };
}

export function gradeScripted(level: ChessLearnLevel, movesUci: string[]): GradeResult {
  const steps = level.scriptSteps ?? [];
  const playerSteps = steps.filter((s) => s.actor === "player");
  const eventMaxPoints = playerSteps.length * POINTS_PER_SCRIPT_STEP;

  if (steps.length === 0) {
    return { correct: false, eventPoints: 0, eventMaxPoints: 0 };
  }

  // Expected player transcript is the player UCI list; opponent plies are auto and not submitted.
  // Client may send player moves only OR full interleaved transcript.
  const expectedPlayer = playerSteps.map((s) => s.uci.toLowerCase());
  const actual = movesUci.map((m) => m.trim().toLowerCase());

  // Accept full interleaved transcript matching all steps where actor is player at those indices.
  const fullExpected = expandScriptedPlayerTranscript(steps);
  const matchesPlayerOnly =
    actual.length === expectedPlayer.length && expectedPlayer.every((uci, i) => uci === actual[i]);
  const matchesFull =
    actual.length === fullExpected.length && fullExpected.every((uci, i) => uci === actual[i]);

  const correct = matchesPlayerOnly || matchesFull;
  return {
    correct,
    eventPoints: correct ? eventMaxPoints : 0,
    eventMaxPoints,
  };
}

/** Full UCI list including opponent plies in order (for clients that send complete transcript). */
export function expandScriptedPlayerTranscript(steps: ChessLearnScriptStep[]): string[] {
  return steps.map((s) => s.uci.toLowerCase());
}

export { POINTS_PER_TARGET, POINTS_PER_CAPTURE_FLAT, POINTS_PER_SCRIPT_STEP };
