import { describe, expect, it } from "vitest";

import { buildShapeFromDrag, resolveShapeColorFromModifiers, toggleShape } from "../shapes";

import type { BoardShape } from "../shapes";

describe("resolveShapeColorFromModifiers", () => {
  it("defaults to green with no modifier held", () => {
    expect(resolveShapeColorFromModifiers({})).toBe("green");
  });

  it("maps shift to red, ctrl/meta to blue, alt to yellow", () => {
    expect(resolveShapeColorFromModifiers({ shiftKey: true })).toBe("red");
    expect(resolveShapeColorFromModifiers({ ctrlKey: true })).toBe("blue");
    expect(resolveShapeColorFromModifiers({ metaKey: true })).toBe("blue");
    expect(resolveShapeColorFromModifiers({ altKey: true })).toBe("yellow");
  });

  it("resolves multiple held keys to a single predictable color (shift wins)", () => {
    expect(resolveShapeColorFromModifiers({ shiftKey: true, altKey: true })).toBe("red");
  });
});

describe("buildShapeFromDrag", () => {
  it("builds an arrow when the drag starts and ends on different squares", () => {
    expect(buildShapeFromDrag("e2", "e4", "green")).toEqual({
      kind: "arrow",
      from: "e2",
      to: "e4",
      color: "green",
    });
  });

  it("builds a circle when the drag starts and ends on the same square", () => {
    expect(buildShapeFromDrag("e4", "e4", "red")).toEqual({
      kind: "circle",
      square: "e4",
      color: "red",
    });
  });
});

describe("toggleShape", () => {
  it("adds a shape that isn't already present", () => {
    const result = toggleShape([], { kind: "arrow", from: "e2", to: "e4", color: "green" });
    expect(result).toHaveLength(1);
  });

  it("removes an identical shape already present (draw-again-to-erase)", () => {
    const shape: BoardShape = { kind: "arrow", from: "e2", to: "e4", color: "green" };
    const result = toggleShape([shape], shape);
    expect(result).toEqual([]);
  });

  it("treats a same-coordinates shape in a different color as distinct, not a match", () => {
    const green: BoardShape = { kind: "arrow", from: "e2", to: "e4", color: "green" };
    const red: BoardShape = { kind: "arrow", from: "e2", to: "e4", color: "red" };
    expect(toggleShape([green], red)).toEqual([green, red]);
  });

  it("does not mutate the input array", () => {
    const shapes: BoardShape[] = [{ kind: "circle", square: "d4", color: "blue" }];
    const snapshot = [...shapes];
    toggleShape(shapes, { kind: "circle", square: "e5", color: "blue" });
    expect(shapes).toEqual(snapshot);
  });
});
