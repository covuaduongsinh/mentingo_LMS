import { validateFen, type Square } from "chess.js";

/**
 * Standalone FEN assembly/parsing for the free-form board editor. Deliberately does NOT use
 * chess.js's incremental `put`/`remove` API: those validate legality immediately (e.g. reject
 * two kings of the same color mid-edit), which fights the natural "drop pieces anywhere, fix
 * it up as you go" editing flow. Editor state is assembled into a full FEN string by hand and
 * only checked for validity (via chess.js's exported `validateFen`) right before it's handed
 * off elsewhere. See docs/specs/interactive-chess-board-business-spec.md.
 */

export type PieceColor = "w" | "b";
export type PieceType = "k" | "q" | "r" | "b" | "n" | "p";
export type EditorPiece = { color: PieceColor; type: PieceType };
export type EditorSquares = Partial<Record<Square, EditorPiece>>;

export type CastlingRights = {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
};

export type EditorState = {
  squares: EditorSquares;
  turn: PieceColor;
  castling: CastlingRights;
  /** Empty string means "no en passant target square", to stay a friendly <select> value. */
  enPassantSquare: Square | "";
};

export const EDITOR_FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
/** FEN piece-placement field always lists ranks starting from 8 down to 1. */
const FEN_RANK_ORDER = [8, 7, 6, 5, 4, 3, 2, 1] as const;

const FEN_CHAR_TO_PIECE: Record<string, EditorPiece> = {
  P: { color: "w", type: "p" },
  N: { color: "w", type: "n" },
  B: { color: "w", type: "b" },
  R: { color: "w", type: "r" },
  Q: { color: "w", type: "q" },
  K: { color: "w", type: "k" },
  p: { color: "b", type: "p" },
  n: { color: "b", type: "n" },
  b: { color: "b", type: "b" },
  r: { color: "b", type: "r" },
  q: { color: "b", type: "q" },
  k: { color: "b", type: "k" },
};

const PIECE_TO_FEN_CHAR: Record<PieceColor, Record<PieceType, string>> = {
  w: { p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" },
  b: { p: "p", n: "n", b: "b", r: "r", q: "q", k: "k" },
};

export function emptyEditorState(): EditorState {
  return {
    squares: {},
    turn: "w",
    castling: {
      whiteKingside: false,
      whiteQueenside: false,
      blackKingside: false,
      blackQueenside: false,
    },
    enPassantSquare: "",
  };
}

const STANDARD_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function standardEditorState(): EditorState {
  return editorStateFromFen(STANDARD_START_FEN) ?? emptyEditorState();
}

/** Returns null if the piece-placement field can't be parsed as 8 ranks of 8 files. */
export function editorStateFromFen(fen: string): EditorState | null {
  const parts = fen.trim().split(/\s+/);
  const [placement, turnField, castlingField, enPassantField] = parts;
  if (!placement) return null;

  const rankRows = placement.split("/");
  if (rankRows.length !== 8) return null;

  const squares: EditorSquares = {};
  for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
    const rank = FEN_RANK_ORDER[rowIndex];
    let fileIndex = 0;
    for (const char of rankRows[rowIndex]) {
      if (/^[1-8]$/.test(char)) {
        fileIndex += Number(char);
        continue;
      }
      const piece = FEN_CHAR_TO_PIECE[char];
      if (!piece || fileIndex > 7) return null;
      const square = `${EDITOR_FILES[fileIndex]}${rank}` as Square;
      squares[square] = piece;
      fileIndex += 1;
    }
    if (fileIndex !== 8) return null;
  }

  const castlingChars = castlingField ?? "-";
  return {
    squares,
    turn: turnField === "b" ? "b" : "w",
    castling: {
      whiteKingside: castlingChars.includes("K"),
      whiteQueenside: castlingChars.includes("Q"),
      blackKingside: castlingChars.includes("k"),
      blackQueenside: castlingChars.includes("q"),
    },
    enPassantSquare: enPassantField && enPassantField !== "-" ? (enPassantField as Square) : "",
  };
}

export function fenFromEditorState(state: EditorState): string {
  const rows: string[] = [];
  for (const rank of FEN_RANK_ORDER) {
    let row = "";
    let emptyRun = 0;
    for (const file of EDITOR_FILES) {
      const piece = state.squares[`${file}${rank}` as Square];
      if (!piece) {
        emptyRun += 1;
        continue;
      }
      if (emptyRun > 0) {
        row += String(emptyRun);
        emptyRun = 0;
      }
      row += PIECE_TO_FEN_CHAR[piece.color][piece.type];
    }
    if (emptyRun > 0) row += String(emptyRun);
    rows.push(row);
  }

  const castlingString =
    [
      state.castling.whiteKingside ? "K" : "",
      state.castling.whiteQueenside ? "Q" : "",
      state.castling.blackKingside ? "k" : "",
      state.castling.blackQueenside ? "q" : "",
    ].join("") || "-";

  return `${rows.join("/")} ${state.turn} ${castlingString} ${state.enPassantSquare || "-"} 0 1`;
}

export function validateEditorFen(fen: string): { valid: boolean; error?: string } {
  const result = validateFen(fen);
  return { valid: result.ok, error: result.error };
}

export function setSquarePiece(
  state: EditorState,
  square: Square,
  piece: EditorPiece | null,
): EditorState {
  const squares = { ...state.squares };
  if (piece) {
    squares[square] = piece;
  } else {
    delete squares[square];
  }
  return { ...state, squares };
}

export function clearEditorBoard(state: EditorState): EditorState {
  return { ...state, squares: {} };
}
