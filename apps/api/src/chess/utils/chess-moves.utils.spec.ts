import { fenPieceCount, normalizeUciMoves, uciMoveSequencesEqual } from "./chess-moves.utils";

describe("chess-moves.utils", () => {
  describe("normalizeUciMoves", () => {
    it("normalizes mixed separators and case", () => {
      expect(normalizeUciMoves("E2E4, e7e5;G1F3")).toEqual(["e2e4", "e7e5", "g1f3"]);
    });

    it("accepts string arrays", () => {
      expect(normalizeUciMoves(["e2e4", "E7E5"])).toEqual(["e2e4", "e7e5"]);
    });
  });

  describe("uciMoveSequencesEqual", () => {
    it("matches exact sequences", () => {
      expect(uciMoveSequencesEqual(["e2e4", "e7e5"], "e2e4 e7e5")).toBe(true);
    });

    it("rejects wrong length by default", () => {
      expect(uciMoveSequencesEqual(["e2e4"], "e2e4 e7e5")).toBe(false);
    });

    it("allows prefix match when exactLength is false", () => {
      expect(uciMoveSequencesEqual(["e2e4"], ["e2e4", "e7e5"], { exactLength: false })).toBe(true);
    });
  });

  describe("fenPieceCount", () => {
    it("counts starting position pieces", () => {
      expect(fenPieceCount("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")).toBe(32);
    });

    it("returns 0 for empty input", () => {
      expect(fenPieceCount(null)).toBe(0);
    });
  });
});
