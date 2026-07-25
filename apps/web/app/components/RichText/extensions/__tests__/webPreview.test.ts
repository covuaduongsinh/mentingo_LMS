import { describe, expect, it } from "vitest";

import { normalizeWebPreviewAttrs } from "../webPreview";

describe("normalizeWebPreviewAttrs", () => {
  it("round-trips a fully fetched preview", () => {
    expect(
      normalizeWebPreviewAttrs({
        url: "https://example.com/article",
        title: "An article",
        description: "About something",
        imageUrl: "https://example.com/og.png",
        domain: "example.com",
        metaFetched: true,
      }),
    ).toEqual({
      url: "https://example.com/article",
      title: "An article",
      description: "About something",
      imageUrl: "https://example.com/og.png",
      domain: "example.com",
      metaFetched: true,
    });
  });

  it("clears an invalid/unsafe URL instead of keeping it", () => {
    expect(normalizeWebPreviewAttrs({ url: "javascript:alert(1)" }).url).toBe("");
  });

  it("defaults metaFetched to false and other fields to null", () => {
    expect(normalizeWebPreviewAttrs({ url: "https://example.com" })).toEqual({
      url: "https://example.com",
      title: null,
      description: null,
      imageUrl: null,
      domain: null,
      metaFetched: false,
    });
  });
});
