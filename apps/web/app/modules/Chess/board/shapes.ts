import type { Square } from "chess.js";

/**
 * Board annotations drawn with the right mouse button: arrows between two squares,
 * or a highlighted circle on a single square. Purely client-side, not persisted anywhere
 * in this pass (see docs/specs/interactive-chess-board-business-spec.md).
 */

export type ShapeColor = "green" | "red" | "blue" | "yellow";

export type BoardShape =
  | { kind: "arrow"; from: Square; to: Square; color: ShapeColor }
  | { kind: "circle"; square: Square; color: ShapeColor };

export type ShapeModifierKeys = {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
};

/**
 * Common chess-UI convention for right-click annotation colors: plain drag is green,
 * and a held modifier key switches to red/blue/yellow. Checked in a fixed priority order
 * so holding multiple keys at once still resolves to a single, predictable color.
 */
export function resolveShapeColorFromModifiers(modifiers: ShapeModifierKeys): ShapeColor {
  if (modifiers.shiftKey) return "red";
  if (modifiers.ctrlKey || modifiers.metaKey) return "blue";
  if (modifiers.altKey) return "yellow";
  return "green";
}

/** A same-square drag (mouse down and up on the same square) draws a circle, not an arrow. */
export function buildShapeFromDrag(from: Square, to: Square, color: ShapeColor): BoardShape {
  if (from === to) {
    return { kind: "circle", square: from, color };
  }
  return { kind: "arrow", from, to, color };
}

function shapesMatch(a: BoardShape, b: BoardShape): boolean {
  if (a.kind !== b.kind || a.color !== b.color) return false;
  if (a.kind === "arrow" && b.kind === "arrow") return a.from === b.from && a.to === b.to;
  if (a.kind === "circle" && b.kind === "circle") return a.square === b.square;
  return false;
}

/**
 * Drawing the exact same shape twice (same kind/coordinates/color) removes it instead of
 * stacking a duplicate — matches how right-click annotation tools behave elsewhere.
 */
export function toggleShape(shapes: BoardShape[], candidate: BoardShape): BoardShape[] {
  const existingIndex = shapes.findIndex((shape) => shapesMatch(shape, candidate));
  if (existingIndex === -1) {
    return [...shapes, candidate];
  }
  return [...shapes.slice(0, existingIndex), ...shapes.slice(existingIndex + 1)];
}

export const SHAPE_COLOR_HEX: Record<ShapeColor, string> = {
  green: "#15781B",
  red: "#882020",
  blue: "#003088",
  yellow: "#e68f00",
};
