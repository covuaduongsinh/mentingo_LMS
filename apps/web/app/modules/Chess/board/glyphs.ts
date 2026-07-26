/**
 * Standard chess move-annotation symbols (Numeric Annotation Glyphs), attached to a specific
 * node of a move tree — see moveTree.ts. These six symbols are chess notation conventions
 * (ISO-style), not an invention of any particular chess platform.
 */

export const GLYPH_SYMBOLS = ["!", "?", "!!", "??", "!?", "?!"] as const;

export type GlyphSymbol = (typeof GLYPH_SYMBOLS)[number];

export const GLYPH_LABEL_KEYS: Record<GlyphSymbol, string> = {
  "!": "chess.glyphs.good",
  "?": "chess.glyphs.mistake",
  "!!": "chess.glyphs.brilliant",
  "??": "chess.glyphs.blunder",
  "!?": "chess.glyphs.interesting",
  "?!": "chess.glyphs.dubious",
};

export const GLYPH_DEFAULT_LABELS: Record<GlyphSymbol, string> = {
  "!": "Good move",
  "?": "Mistake",
  "!!": "Brilliant move",
  "??": "Blunder",
  "!?": "Interesting move",
  "?!": "Dubious move",
};
