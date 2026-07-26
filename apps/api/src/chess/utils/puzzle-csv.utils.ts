import { CHESS_MOTIFS, type ChessMotif } from "@repo/shared";

import type { PuzzleImportRow } from "../chess-puzzle.repository";

/**
 * Best-effort mapping from common public puzzle-dataset theme tokens (camelCase, as used by
 * several open chess puzzle datasets) onto this app's own CHESS_MOTIFS taxonomy. Any token not
 * listed here is simply dropped — the row is still imported, just without that theme tagged.
 */
const THEME_TOKEN_TO_MOTIF: Record<string, ChessMotif> = {
  fork: CHESS_MOTIFS.FORK,
  pin: CHESS_MOTIFS.PIN,
  skewer: CHESS_MOTIFS.SKEWER,
  discoveredAttack: CHESS_MOTIFS.DISCOVERED_ATTACK,
  doubleCheck: CHESS_MOTIFS.DOUBLE_CHECK,
  backRankMate: CHESS_MOTIFS.BACK_RANK_MATE,
  smotheredMate: CHESS_MOTIFS.SMOTHERED_MATE,
  deflection: CHESS_MOTIFS.DEFLECTION,
  attraction: CHESS_MOTIFS.ATTRACTION,
  clearance: CHESS_MOTIFS.CLEARANCE,
  interference: CHESS_MOTIFS.INTERFERENCE,
  zugzwang: CHESS_MOTIFS.ZUGZWANG,
  xRayAttack: CHESS_MOTIFS.X_RAY,
  trappedPiece: CHESS_MOTIFS.TRAPPED_PIECE,
  hangingPiece: CHESS_MOTIFS.HANGING_PIECE,
  sacrifice: CHESS_MOTIFS.SACRIFICE,
  overloading: CHESS_MOTIFS.OVERLOADING,
  promotion: CHESS_MOTIFS.PROMOTION,
  underPromotion: CHESS_MOTIFS.UNDERPROMOTION,
  enPassant: CHESS_MOTIFS.EN_PASSANT,
  castling: CHESS_MOTIFS.CASTLING_TACTIC,
  kingsideAttack: CHESS_MOTIFS.KING_HUNT,
  queensideAttack: CHESS_MOTIFS.KING_HUNT,
  mateIn1: CHESS_MOTIFS.MATE_IN_1,
  mateIn2: CHESS_MOTIFS.MATE_IN_2,
  mateIn3: CHESS_MOTIFS.MATE_IN_3_OR_MORE,
  mateIn4: CHESS_MOTIFS.MATE_IN_3_OR_MORE,
  mateIn5: CHESS_MOTIFS.MATE_IN_3_OR_MORE,
  endgame: CHESS_MOTIFS.ENDGAME_TACTIC,
  opening: CHESS_MOTIFS.OPENING_TRAP,
  quietMove: CHESS_MOTIFS.QUIET_MOVE,
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export type PuzzleCsvFilter = {
  minRating?: number;
  maxRating?: number;
  motifs?: ChessMotif[];
  maxCount?: number;
};

/**
 * Parses a puzzle dataset CSV with the column order
 * `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags`
 * (the shape used by several open CC0 puzzle datasets), applying the given filters. The header
 * row (if present, detected by a non-numeric Rating column) is skipped automatically.
 */
export function parsePuzzleCsv(content: string, filter: PuzzleCsvFilter = {}): PuzzleImportRow[] {
  const rows: PuzzleImportRow[] = [];
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  for (const line of lines) {
    const fields = parseCsvLine(line);
    if (fields.length < 8) continue;

    const [, fen, moves, ratingRaw, ratingDeviationRaw, popularityRaw, , themesRaw] = fields;
    const rating = Number(ratingRaw);
    if (!Number.isFinite(rating)) continue; // header row or malformed line

    const ratingDeviation = Number(ratingDeviationRaw) || 75;
    const popularity = Number(popularityRaw);

    if (filter.minRating !== undefined && rating < filter.minRating) continue;
    if (filter.maxRating !== undefined && rating > filter.maxRating) continue;

    const motifs = Array.from(
      new Set(
        themesRaw
          .split(/\s+/)
          .map((token) => THEME_TOKEN_TO_MOTIF[token])
          .filter((motif): motif is ChessMotif => Boolean(motif)),
      ),
    );

    if (filter.motifs && filter.motifs.length > 0) {
      const hasMatch = motifs.some((motif) => filter.motifs?.includes(motif));
      if (!hasMatch) continue;
    }

    rows.push({
      fen: fen.trim(),
      solutionUci: moves.trim().split(/\s+/).filter(Boolean),
      rating,
      ratingDeviation,
      motifs,
      popularity: Number.isFinite(popularity) ? popularity : null,
    });

    if (filter.maxCount && rows.length >= filter.maxCount) break;
  }

  return rows;
}
