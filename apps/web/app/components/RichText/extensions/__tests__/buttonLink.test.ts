import { describe, expect, it } from "vitest";

import { isValidHttpUrl, normalizeButtonLinkAttrs } from "../buttonLink";

describe("isValidHttpUrl", () => {
  it("accepts http/https URLs", () => {
    expect(isValidHttpUrl("https://example.com")).toBe(true);
    expect(isValidHttpUrl("http://example.com/path?query=1")).toBe(true);
  });

  it("rejects other schemes and malformed URLs", () => {
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
    expect(isValidHttpUrl("not a url")).toBe(false);
    expect(isValidHttpUrl("")).toBe(false);
  });
});

describe("normalizeButtonLinkAttrs", () => {
  it("keeps a valid href and label", () => {
    expect(
      normalizeButtonLinkAttrs({
        label: "Solve now",
        href: "https://example.com",
        openInNewTab: false,
      }),
    ).toEqual({ label: "Solve now", href: "https://example.com", openInNewTab: false });
  });

  it("clears an invalid href instead of keeping unsafe input", () => {
    expect(normalizeButtonLinkAttrs({ href: "javascript:alert(1)" }).href).toBe("");
  });

  it("defaults openInNewTab to true", () => {
    expect(normalizeButtonLinkAttrs({}).openInNewTab).toBe(true);
  });
});
