import { describe, expect, it } from "vitest";

import { BADGE_TEXT_MAX_LENGTH, normalizeBadgeAttrs } from "../badge";

describe("normalizeBadgeAttrs", () => {
  it("keeps a known color and short text", () => {
    expect(normalizeBadgeAttrs({ text: "New", color: "green" })).toEqual({
      text: "New",
      color: "green",
    });
  });

  it("defaults to gray for an unknown color", () => {
    expect(normalizeBadgeAttrs({ text: "New", color: "chartreuse" }).color).toBe("gray");
  });

  it("truncates text longer than the max length", () => {
    const longText = "x".repeat(BADGE_TEXT_MAX_LENGTH + 20);
    expect(normalizeBadgeAttrs({ text: longText }).text).toHaveLength(BADGE_TEXT_MAX_LENGTH);
  });

  it("defaults text to an empty string when missing", () => {
    expect(normalizeBadgeAttrs({}).text).toBe("");
  });
});
