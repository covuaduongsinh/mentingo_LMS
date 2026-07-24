/**
 * Normalize UCI move tokens for comparison (case-insensitive, ignore separators).
 * Example: "E2E4 e7e5" -> ["e2e4", "e7e5"]
 */
export function normalizeUciMoves(input: string | string[] | undefined | null): string[] {
  if (!input) {
    return [];
  }

  const raw = Array.isArray(input) ? input.join(" ") : input;
  return raw
    .toLowerCase()
    .replace(/[,;|]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
}

export function uciMoveSequencesEqual(
  expected: string | string[] | undefined | null,
  actual: string | string[] | undefined | null,
  options?: { exactLength?: boolean },
): boolean {
  const expectedMoves = normalizeUciMoves(expected);
  const actualMoves = normalizeUciMoves(actual);

  if (expectedMoves.length === 0) {
    return false;
  }

  if (options?.exactLength === false) {
    if (actualMoves.length < expectedMoves.length) {
      return false;
    }
    return expectedMoves.every((move, index) => move === actualMoves[index]);
  }

  if (expectedMoves.length !== actualMoves.length) {
    return false;
  }

  return expectedMoves.every((move, index) => move === actualMoves[index]);
}

/** Count pieces on board from FEN placement field (before first space). */
export function fenPieceCount(fen: string | null | undefined): number {
  if (!fen) {
    return 0;
  }
  const placement = fen.trim().split(/\s+/)[0] ?? "";
  let count = 0;
  for (const char of placement) {
    if (/[pnbrqkPNBRQK]/.test(char)) {
      count += 1;
    }
  }
  return count;
}
