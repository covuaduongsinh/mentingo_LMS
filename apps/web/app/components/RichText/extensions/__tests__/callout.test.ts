import { describe, expect, it } from "vitest";

import { DEFAULT_CALLOUT_VARIANT, normalizeCalloutAttrs } from "../callout";

describe("normalizeCalloutAttrs", () => {
  it("keeps a known variant", () => {
    expect(normalizeCalloutAttrs({ variant: "warning" }).variant).toBe("warning");
  });

  it("falls back to the default variant for an unknown value", () => {
    expect(normalizeCalloutAttrs({ variant: "not-a-variant" }).variant).toBe(
      DEFAULT_CALLOUT_VARIANT,
    );
  });

  it("falls back to the default variant when missing", () => {
    expect(normalizeCalloutAttrs({}).variant).toBe(DEFAULT_CALLOUT_VARIANT);
  });
});
