import { extractHtmlMeta } from "../extract-html-meta";

describe("extractHtmlMeta", () => {
  it("prefers Open Graph tags over Twitter Card and <title>", () => {
    const html = `
      <html><head>
        <title>Fallback title</title>
        <meta name="twitter:title" content="Twitter title" />
        <meta property="og:title" content="OG title" />
        <meta property="og:description" content="OG description" />
        <meta property="og:image" content="https://example.com/og.png" />
      </head></html>
    `;

    expect(extractHtmlMeta(html)).toEqual({
      title: "OG title",
      description: "OG description",
      imageUrl: "https://example.com/og.png",
    });
  });

  it("falls back to <title> and <meta name=description> when OG/Twitter are missing", () => {
    const html = `
      <html><head>
        <title>Plain title</title>
        <meta name="description" content="Plain description">
      </head></html>
    `;

    expect(extractHtmlMeta(html)).toEqual({
      title: "Plain title",
      description: "Plain description",
      imageUrl: null,
    });
  });

  it("decodes HTML entities and collapses whitespace", () => {
    const html = `<meta property="og:title" content="Rook &amp; Bishop  vs\n  Knight" />`;

    expect(extractHtmlMeta(html).title).toBe("Rook & Bishop vs Knight");
  });

  it("ignores a relative image URL", () => {
    const html = `<meta property="og:image" content="/images/og.png" />`;

    expect(extractHtmlMeta(html).imageUrl).toBeNull();
  });

  it("returns nulls when nothing is present", () => {
    expect(extractHtmlMeta("<html><head></head></html>")).toEqual({
      title: null,
      description: null,
      imageUrl: null,
    });
  });

  it("truncates an overly long title", () => {
    const longTitle = "a".repeat(250);
    const html = `<title>${longTitle}</title>`;

    const result = extractHtmlMeta(html);
    expect(result.title?.length).toBe(200);
    expect(result.title?.endsWith("…")).toBe(true);
  });
});
