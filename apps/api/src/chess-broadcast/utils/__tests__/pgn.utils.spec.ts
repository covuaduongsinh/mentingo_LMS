import { diffNewMoves, InvalidPgnError, parsePgn, PgnMismatchError } from "../pgn.utils";

describe("parsePgn", () => {
  it("parses bare movetext into an ordered uci/san/fen move list", () => {
    const { moves, result } = parsePgn("1. e4 e5 2. Nf3 Nc6");

    expect(moves).toHaveLength(4);
    expect(moves[0]).toEqual({
      ply: 0,
      uci: "e2e4",
      san: "e4",
      fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    });
    expect(moves[3].uci).toBe("b8c6");
    expect(result).toBeNull();
  });

  it("extracts the declared result from PGN headers", () => {
    const { result } = parsePgn('[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0');
    expect(result).toBe("1-0");
  });

  it("treats an in-progress '*' result as null", () => {
    const { result } = parsePgn('[Result "*"]\n\n1. e4 e5 *');
    expect(result).toBeNull();
  });

  it("derives promotion uci with the promoted piece suffix", () => {
    const { moves } = parsePgn(
      "1. e4 d5 2. exd5 Qxd5 3. Nc3 Qd8 4. d4 g6 5. g3 Bg7 6. Bg2 c6 7. Nf3 Nf6 8. O-O O-O",
    );
    expect(moves.at(-1)?.uci).toBe("e8g8");
  });

  it("throws InvalidPgnError on garbage input", () => {
    expect(() => parsePgn("this is not a pgn at all !!")).toThrow(InvalidPgnError);
  });
});

describe("diffNewMoves", () => {
  const parsed = parsePgn("1. e4 e5 2. Nf3 Nc6 3. Bb5").moves;

  it("returns only the new suffix when the existing prefix matches", () => {
    const existing = parsed.slice(0, 2).map(({ ply, uci }) => ({ ply, uci }));
    const fresh = diffNewMoves(existing, parsed);
    expect(fresh).toHaveLength(3);
    expect(fresh[0].ply).toBe(2);
  });

  it("returns an empty list when re-pasting the exact same PGN (idempotent)", () => {
    const existing = parsed.map(({ ply, uci }) => ({ ply, uci }));
    expect(diffNewMoves(existing, parsed)).toEqual([]);
  });

  it("throws PgnMismatchError when the new PGN has fewer moves than recorded", () => {
    const existing = parsed.map(({ ply, uci }) => ({ ply, uci }));
    const shorter = parsed.slice(0, 2);
    expect(() => diffNewMoves(existing, shorter)).toThrow(PgnMismatchError);
  });

  it("throws PgnMismatchError when an earlier move diverges", () => {
    const existing = [
      { ply: 0, uci: "e2e4" },
      { ply: 1, uci: "e7e5" },
      { ply: 2, uci: "g1f3" },
    ];
    const divergent = [
      parsed[0],
      parsed[1],
      { ply: 2, uci: "b1c3", san: "Nc3", fenAfter: "irrelevant" },
    ];
    expect(() => diffNewMoves(existing, divergent)).toThrow(PgnMismatchError);
  });
});
