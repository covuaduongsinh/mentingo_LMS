import { describe, expect, it } from "vitest";

import { filterBlockRegistry } from "../../slashCommand";
import { BLOCK_REGISTRY, BLOCK_REGISTRY_GROUP_ORDER } from "../blockRegistry";

describe("BLOCK_REGISTRY", () => {
  it("has no duplicate ids", () => {
    const ids = BLOCK_REGISTRY.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses groups declared in the group order", () => {
    for (const item of BLOCK_REGISTRY) {
      expect(BLOCK_REGISTRY_GROUP_ORDER).toContain(item.group);
    }
  });

  it("gives every item a non-empty label key and at least one keyword", () => {
    for (const item of BLOCK_REGISTRY) {
      expect(item.labelKey.length).toBeGreaterThan(0);
      expect(item.keywords.length).toBeGreaterThan(0);
    }
  });

  it("marks every media entry as requiring the asset library", () => {
    const mediaItems = BLOCK_REGISTRY.filter((item) => item.group === "media");
    expect(mediaItems.length).toBeGreaterThan(0);
    for (const item of mediaItems) {
      expect(item.requiresAssetLibrary).toBe(true);
    }
  });
});

describe("filterBlockRegistry", () => {
  it("returns every item for an empty query", () => {
    expect(filterBlockRegistry("")).toHaveLength(BLOCK_REGISTRY.length);
  });

  it("matches by id substring, case-insensitively", () => {
    const results = filterBlockRegistry("CALL");
    expect(results.some((item) => item.id === "callout")).toBe(true);
  });

  it("matches by keyword", () => {
    const results = filterBlockRegistry("flashcard");
    expect(results.some((item) => item.id === "flipcard")).toBe(true);
  });

  it("returns nothing for a query that matches no block", () => {
    expect(filterBlockRegistry("zzzznotarealblockzzzz")).toHaveLength(0);
  });
});
