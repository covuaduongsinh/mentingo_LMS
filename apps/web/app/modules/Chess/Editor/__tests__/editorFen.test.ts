import { describe, expect, it } from "vitest";

import {
  clearEditorBoard,
  editorStateFromFen,
  emptyEditorState,
  fenFromEditorState,
  setSquarePiece,
  standardEditorState,
  validateEditorFen,
} from "../editorFen";

const STANDARD_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("editorStateFromFen / fenFromEditorState round-trip", () => {
  it("round-trips the standard starting position", () => {
    const state = editorStateFromFen(STANDARD_FEN);
    expect(state).not.toBeNull();
    expect(fenFromEditorState(state!)).toBe(STANDARD_FEN);
  });

  it("parses piece placement, turn, castling rights, and en passant target", () => {
    // White to move; the en passant target d6 is consistent with black having just
    // double-pushed d7-d5 (the pawn now sitting on d5).
    const fen = "8/8/8/3pP3/8/8/8/4K2k w - d6 0 1";
    const state = editorStateFromFen(fen)!;
    expect(state.squares.d5).toEqual({ color: "b", type: "p" });
    expect(state.squares.e5).toEqual({ color: "w", type: "p" });
    expect(state.squares.e1).toEqual({ color: "w", type: "k" });
    expect(state.turn).toBe("w");
    expect(state.castling).toEqual({
      whiteKingside: false,
      whiteQueenside: false,
      blackKingside: false,
      blackQueenside: false,
    });
    expect(state.enPassantSquare).toBe("d6");
  });

  it("round-trips a position with no castling rights and no en passant square", () => {
    const fen = "4k3/8/8/8/8/8/8/4K3 w - - 0 1";
    const state = editorStateFromFen(fen)!;
    expect(state.castling).toEqual({
      whiteKingside: false,
      whiteQueenside: false,
      blackKingside: false,
      blackQueenside: false,
    });
    expect(state.enPassantSquare).toBe("");
    expect(fenFromEditorState(state)).toBe(fen);
  });

  it("returns null for a placement field that isn't 8 ranks of 8 files", () => {
    expect(editorStateFromFen("not-a-fen")).toBeNull();
    expect(editorStateFromFen("rnbqkbnr/pppppppp w KQkq - 0 1")).toBeNull();
  });
});

describe("standardEditorState / emptyEditorState", () => {
  it("standardEditorState matches the standard starting FEN", () => {
    expect(fenFromEditorState(standardEditorState())).toBe(STANDARD_FEN);
  });

  it("emptyEditorState has no pieces and no castling rights", () => {
    const state = emptyEditorState();
    expect(Object.keys(state.squares)).toHaveLength(0);
    expect(state.castling).toEqual({
      whiteKingside: false,
      whiteQueenside: false,
      blackKingside: false,
      blackQueenside: false,
    });
  });
});

describe("validateEditorFen", () => {
  it("accepts a legal position", () => {
    expect(validateEditorFen(STANDARD_FEN).valid).toBe(true);
  });

  it("rejects a position missing a king", () => {
    const result = validateEditorFen("8/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("setSquarePiece / clearEditorBoard", () => {
  it("places and removes a piece without mutating the input state", () => {
    const empty = emptyEditorState();
    const withKnight = setSquarePiece(empty, "e4", { color: "w", type: "n" });
    expect(empty.squares.e4).toBeUndefined();
    expect(withKnight.squares.e4).toEqual({ color: "w", type: "n" });

    const withoutKnight = setSquarePiece(withKnight, "e4", null);
    expect(withoutKnight.squares.e4).toBeUndefined();
  });

  it("clearEditorBoard empties the squares but keeps turn/castling/en passant untouched", () => {
    const state = standardEditorState();
    const cleared = clearEditorBoard(state);
    expect(Object.keys(cleared.squares)).toHaveLength(0);
    expect(cleared.turn).toBe(state.turn);
    expect(cleared.castling).toEqual(state.castling);
  });
});
