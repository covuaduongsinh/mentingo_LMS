import { Chess } from "chess.js";

export type ParsedBroadcastMove = {
  ply: number;
  uci: string;
  san: string;
  fenAfter: string;
};

export type ParsedPgn = {
  moves: ParsedBroadcastMove[];
  result: string | null;
};

export class InvalidPgnError extends Error {}

export class PgnMismatchError extends Error {}

function moveToUci(move: { from: string; to: string; promotion?: string }): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

/** Parses a full PGN (or bare movetext) into an ordered move list plus the declared result, if any. */
export function parsePgn(pgn: string): ParsedPgn {
  const game = new Chess();

  try {
    game.loadPgn(pgn);
  } catch (error) {
    throw new InvalidPgnError(error instanceof Error ? error.message : "Invalid PGN");
  }

  const moves = game.history({ verbose: true }).map((move, ply) => ({
    ply,
    uci: moveToUci(move),
    san: move.san,
    fenAfter: move.after,
  }));

  const resultTag = game.header().Result;
  const result = resultTag && resultTag !== "*" ? resultTag : null;

  return { moves, result };
}

/**
 * Given the moves already stored for a game (in ply order) and a freshly re-parsed PGN,
 * returns only the NEW moves to append. The existing prefix must match exactly (same uci
 * per ply) or this throws PgnMismatchError — silently overwriting history would corrupt the
 * `ingestedAt` timestamps that broadcast delay is computed from.
 */
export function diffNewMoves(
  existingMoves: { ply: number; uci: string }[],
  parsedMoves: ParsedBroadcastMove[],
): ParsedBroadcastMove[] {
  if (parsedMoves.length < existingMoves.length) {
    throw new PgnMismatchError("chess.broadcast.errors.pgnShorterThanRecorded");
  }

  for (const existing of existingMoves) {
    if (parsedMoves[existing.ply]?.uci !== existing.uci) {
      throw new PgnMismatchError("chess.broadcast.errors.pgnDivergesFromRecorded");
    }
  }

  return parsedMoves.slice(existingMoves.length);
}
