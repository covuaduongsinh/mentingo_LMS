import type { Square } from "chess.js";

/** Shared square/pixel geometry so ChessBoard and its overlays (shapes) agree on layout. */

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export type BoardOrientation = "white" | "black";

export function squareName(fileIndex: number, rankIndex: number): Square {
  return `${FILES[fileIndex]}${RANKS[rankIndex]}` as Square;
}

export function squareIndices(square: Square): { fileIndex: number; rankIndex: number } {
  const fileIndex = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rankIndex = RANKS.indexOf(Number(square[1]) as (typeof RANKS)[number]);
  return { fileIndex, rankIndex };
}

/** Grid offset (0 = top-left of the rendered grid) for a square under the given orientation. */
export function squareGridOffset(square: Square, orientation: BoardOrientation) {
  const { fileIndex, rankIndex } = squareIndices(square);
  const fileOffset = orientation === "white" ? fileIndex : 7 - fileIndex;
  const rankOffset = orientation === "white" ? rankIndex : 7 - rankIndex;
  return { fileOffset, rankOffset };
}

/** Pixel center of a square within a `size`×`size` board rendered at the given orientation. */
export function squarePixelCenter(
  square: Square,
  orientation: BoardOrientation,
  size: number,
): { x: number; y: number } {
  const { fileOffset, rankOffset } = squareGridOffset(square, orientation);
  const cellSize = size / 8;
  return { x: fileOffset * cellSize + cellSize / 2, y: rankOffset * cellSize + cellSize / 2 };
}
