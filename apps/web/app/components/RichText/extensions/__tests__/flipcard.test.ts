import { describe, expect, it } from "vitest";

import { normalizeFlipcardAttrs } from "../flipcard";

describe("normalizeFlipcardAttrs", () => {
  it("round-trips known values", () => {
    expect(
      normalizeFlipcardAttrs({
        front: "Knight",
        back: "Moves in an L shape",
        color: "blue",
        size: "lg",
      }),
    ).toEqual({ front: "Knight", back: "Moves in an L shape", color: "blue", size: "lg" });
  });

  it("defaults to empty text, neutral color, and medium size", () => {
    expect(normalizeFlipcardAttrs({})).toEqual({
      front: "",
      back: "",
      color: "neutral",
      size: "md",
    });
  });

  it("falls back to defaults for invalid color/size", () => {
    expect(normalizeFlipcardAttrs({ color: "not-a-color", size: "huge" })).toMatchObject({
      color: "neutral",
      size: "md",
    });
  });
});
