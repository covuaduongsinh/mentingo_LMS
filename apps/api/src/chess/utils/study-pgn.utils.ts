import { randomUUID } from "crypto";

import { Chess } from "chess.js";

import type { ChessStudyFlatMoveNode } from "src/storage/schema";

export const STUDY_PGN_MAX_CHARS = 500_000;
export const STUDY_PGN_MAX_CHAPTERS_PER_IMPORT = 32;
export const STUDY_PGN_MAX_NODES_PER_CHAPTER = 1500;

const STANDARD_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export class StudyPgnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudyPgnError";
  }
}

export type StudyPgnChapterDraft = {
  title: string;
  rootFen: string;
  moveNodes: ChessStudyFlatMoveNode[];
  pgnTags: Record<string, string>;
  orientation: "white" | "black";
};

function moveToUci(move: { from: string; to: string; promotion?: string }): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

/** Split a multi-game PGN blob into individual game strings. */
export function splitMultiPgn(pgn: string): string[] {
  const trimmed = pgn.trim();
  if (!trimmed) return [];

  // Games typically start with [Tag "value"] blocks separated by blank lines after movetext.
  const parts = trimmed.split(/\n\s*\n(?=\[)/);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseHeaders(pgn: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const re = /\[(\w+)\s+"([^"]*)"\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(pgn)) !== null) {
    tags[match[1]] = match[2];
  }
  return tags;
}

function titleFromTags(tags: Record<string, string>, fallbackIndex: number): string {
  if (tags.Event && tags.Event !== "?" && tags.Event.trim()) {
    return tags.Event.slice(0, 300);
  }
  const white = tags.White?.trim();
  const black = tags.Black?.trim();
  if (white || black) {
    return `${white || "White"} - ${black || "Black"}`.slice(0, 300);
  }
  return `Chapter ${fallbackIndex}`;
}

function orientationFromTags(tags: Record<string, string>): "white" | "black" {
  // Optional custom / common convention; default white.
  const raw = (tags.Orientation || tags.StartColor || "").toLowerCase();
  if (raw === "black" || raw === "b") return "black";
  return "white";
}

/**
 * Parse a single PGN game into a study chapter draft (mainline only — best effort).
 * Variations nested in parentheses are not expanded in S1; chess.js loads the mainline.
 */
export function parseStudyPgnGame(pgn: string, chapterIndex: number): StudyPgnChapterDraft {
  const tags = parseHeaders(pgn);
  const game = new Chess();

  try {
    game.loadPgn(pgn);
  } catch (error) {
    throw new StudyPgnError(error instanceof Error ? error.message : "Invalid PGN");
  }

  const history = game.history({ verbose: true });
  if (history.length > STUDY_PGN_MAX_NODES_PER_CHAPTER) {
    throw new StudyPgnError("chess.study.errors.pgnTooManyNodes");
  }

  // Root FEN: if PGN started from a non-standard position, reconstruct from first move's `before`.
  let rootFen = STANDARD_START_FEN;
  if (tags.FEN) {
    rootFen = tags.FEN;
  } else if (history.length > 0 && history[0].before) {
    rootFen = history[0].before;
  }

  const moveNodes: ChessStudyFlatMoveNode[] = [];
  let parentId: string | null = null;
  for (const [index, move] of history.entries()) {
    const id = randomUUID();
    moveNodes.push({
      id,
      parentId,
      uci: moveToUci(move),
      san: move.san,
      fenAfter: move.after,
      order: 0,
    });
    parentId = id;
    // silence unused index for clarity if tree later branches
    void index;
  }

  return {
    title: titleFromTags(tags, chapterIndex),
    rootFen,
    moveNodes,
    pgnTags: tags,
    orientation: orientationFromTags(tags),
  };
}

export function parseStudyPgnImport(pgn: string): StudyPgnChapterDraft[] {
  if (pgn.length > STUDY_PGN_MAX_CHARS) {
    throw new StudyPgnError("chess.study.errors.pgnTooLarge");
  }
  const games = splitMultiPgn(pgn);
  if (games.length === 0) {
    throw new StudyPgnError("chess.study.errors.pgnEmpty");
  }
  if (games.length > STUDY_PGN_MAX_CHAPTERS_PER_IMPORT) {
    throw new StudyPgnError("chess.study.errors.pgnTooManyChapters");
  }
  return games.map((game, index) => parseStudyPgnGame(game, index + 1));
}

function escapeTagValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatTags(tags: Record<string, string>, rootFen: string): string {
  const orderedKeys = [
    "Event",
    "Site",
    "Date",
    "Round",
    "White",
    "Black",
    "Result",
    "ECO",
    "Opening",
    "FEN",
    "SetUp",
    "Orientation",
  ];
  const merged: Record<string, string> = { ...tags };
  if (rootFen && rootFen !== STANDARD_START_FEN) {
    merged.FEN = rootFen;
    merged.SetUp = "1";
  }
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const key of orderedKeys) {
    if (merged[key] !== undefined) {
      lines.push(`[${key} "${escapeTagValue(merged[key])}"]`);
      seen.add(key);
    }
  }
  for (const [key, value] of Object.entries(merged)) {
    if (!seen.has(key)) {
      lines.push(`[${key} "${escapeTagValue(value)}"]`);
    }
  }
  if (lines.length === 0) {
    lines.push(`[Event "Study chapter"]`);
  }
  return lines.join("\n");
}

/** Export mainline (+ variations) movetext from a flat adjacency list. */
export function movetextFromFlatNodes(flatNodes: ChessStudyFlatMoveNode[]): string {
  const byParent = new Map<string | null, ChessStudyFlatMoveNode[]>();
  for (const node of flatNodes) {
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.order - b.order);
  }

  function moveNumberPrefix(zeroBasedPly: number): string {
    const moveNumber = Math.floor(zeroBasedPly / 2) + 1;
    return zeroBasedPly % 2 === 0 ? `${moveNumber}.` : `${moveNumber}...`;
  }

  function walk(parentId: string | null, ply: number, forceNumber: boolean): string {
    const siblings = byParent.get(parentId) ?? [];
    if (siblings.length === 0) return "";
    const [main, ...variations] = siblings;
    const prefix = forceNumber || ply % 2 === 0 ? moveNumberPrefix(ply) : "";
    let out = `${prefix}${main.san}${main.glyph ?? ""}`;
    if (main.comment) {
      out += ` {${main.comment.replace(/\}/g, "")}}`;
    }
    for (const variation of variations) {
      const head = `${moveNumberPrefix(ply)}${variation.san}${variation.glyph ?? ""}`;
      const rest = walk(variation.id, ply + 1, false);
      const body = rest ? `${head} ${rest}` : head;
      if (variation.comment) {
        out += ` (${body} {${variation.comment.replace(/\}/g, "")}})`;
      } else {
        out += ` (${body})`;
      }
    }
    const continuation = walk(main.id, ply + 1, false);
    if (continuation) out += ` ${continuation}`;
    return out;
  }

  return walk(null, 0, true);
}

export function exportChapterPgn(params: {
  rootFen: string;
  moveNodes: ChessStudyFlatMoveNode[];
  pgnTags?: Record<string, string> | null;
  orientation?: "white" | "black" | null;
  result?: string | null;
}): string {
  const tags: Record<string, string> = { ...(params.pgnTags ?? {}) };
  if (params.orientation) {
    tags.Orientation = params.orientation;
  }
  if (params.result && !tags.Result) {
    tags.Result = params.result;
  }
  if (!tags.Result) {
    tags.Result = "*";
  }
  const header = formatTags(tags, params.rootFen);
  const movetext = movetextFromFlatNodes(params.moveNodes);
  const result = tags.Result || "*";
  if (!movetext) {
    return `${header}\n\n${result}\n`;
  }
  return `${header}\n\n${movetext} ${result}\n`;
}

export function exportStudyPgn(
  chapters: Array<{
    rootFen: string;
    moveNodes: ChessStudyFlatMoveNode[];
    pgnTags?: Record<string, string> | null;
    orientation?: "white" | "black" | null;
    title?: string;
  }>,
): string {
  return chapters
    .map((chapter) => {
      const tags = { ...(chapter.pgnTags ?? {}) };
      if (!tags.Event && chapter.title) {
        tags.Event = chapter.title;
      }
      return exportChapterPgn({
        rootFen: chapter.rootFen,
        moveNodes: chapter.moveNodes,
        pgnTags: tags,
        orientation: chapter.orientation,
      });
    })
    .join("\n");
}
