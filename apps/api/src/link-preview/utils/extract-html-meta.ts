const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 300;

type ExtractedMeta = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
};

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'");

const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const clean = (value: string, maxLength: number): string =>
  truncate(decodeHtmlEntities(value).trim().replace(/\s+/g, " "), maxLength);

const findMetaContent = (html: string, attr: "property" | "name", key: string): string | null => {
  const pattern = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  const reversedPattern = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${key}["'][^>]*>`,
    "i",
  );

  return pattern.exec(html)?.[1] ?? reversedPattern.exec(html)?.[1] ?? null;
};

const findTitleTag = (html: string): string | null =>
  /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? null;

const isAbsoluteUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Extracts Open Graph / Twitter Card / plain <title>/<meta name="description">
 * metadata from a raw HTML string, in priority order, for link preview cards.
 * Deliberately regex-based (no DOM/HTML parser dependency) since only a
 * handful of well-known tags need to be read from a truncated HTML prefix.
 */
export const extractHtmlMeta = (html: string): ExtractedMeta => {
  const rawTitle =
    findMetaContent(html, "property", "og:title") ??
    findMetaContent(html, "name", "twitter:title") ??
    findTitleTag(html);

  const rawDescription =
    findMetaContent(html, "property", "og:description") ??
    findMetaContent(html, "name", "twitter:description") ??
    findMetaContent(html, "name", "description");

  const rawImage =
    findMetaContent(html, "property", "og:image") ?? findMetaContent(html, "name", "twitter:image");

  return {
    title: rawTitle ? clean(rawTitle, TITLE_MAX_LENGTH) : null,
    description: rawDescription ? clean(rawDescription, DESCRIPTION_MAX_LENGTH) : null,
    imageUrl:
      rawImage && isAbsoluteUrl(decodeHtmlEntities(rawImage.trim()))
        ? decodeHtmlEntities(rawImage.trim())
        : null,
  };
};
