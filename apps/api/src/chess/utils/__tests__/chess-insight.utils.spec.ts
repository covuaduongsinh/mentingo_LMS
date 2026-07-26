import {
  classifyGamePhase,
  classifyOpening,
  computeCentipawnLoss,
  computeThinkTimeMs,
  pieceTypeAtSquare,
  resolveEngineScoreCp,
} from "../chess-insight.utils";

describe("resolveEngineScoreCp", () => {
  it("returns the raw centipawn score when there is no mate", () => {
    expect(resolveEngineScoreCp({ scoreCp: 42, mate: null })).toBe(42);
    expect(resolveEngineScoreCp({ scoreCp: null, mate: null })).toBe(0);
  });

  it("scores a faster mate-for-me higher than a slower one", () => {
    const mateIn1 = resolveEngineScoreCp({ scoreCp: null, mate: 1 });
    const mateIn5 = resolveEngineScoreCp({ scoreCp: null, mate: 5 });
    expect(mateIn1).toBeGreaterThan(mateIn5);
    expect(mateIn1).toBeGreaterThan(90000);
  });

  it("scores getting mated sooner worse than getting mated later", () => {
    const mateIn1Against = resolveEngineScoreCp({ scoreCp: null, mate: -1 });
    const mateIn5Against = resolveEngineScoreCp({ scoreCp: null, mate: -5 });
    expect(mateIn1Against).toBeLessThan(mateIn5Against);
    expect(mateIn1Against).toBeLessThan(-90000);
  });
});

describe("computeCentipawnLoss", () => {
  it("is zero when the move matched the best continuation exactly", () => {
    // scoreBefore (mover) = 50; the opponent's resulting position score is -50 from their
    // perspective, which negates back to 50 for the mover — no loss.
    expect(computeCentipawnLoss(50, -50)).toBe(0);
  });

  it("is positive when the move made things worse for the mover", () => {
    // mover was at +100 before moving; after the move the opponent stands at +80 (from
    // their perspective), i.e. mover is now at -80 — a big drop from +100.
    expect(computeCentipawnLoss(100, 80)).toBe(180);
  });

  it("never goes negative (a move that improves things clamps to zero loss)", () => {
    expect(computeCentipawnLoss(0, -200)).toBe(0);
  });
});

describe("classifyGamePhase", () => {
  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  it("is opening for the first 20 plies regardless of material", () => {
    expect(classifyGamePhase(0, START_FEN)).toBe("opening");
    expect(classifyGamePhase(19, START_FEN)).toBe("opening");
  });

  it("is endgame once material drops to/below the threshold, past the opening cutoff", () => {
    // Two lone kings and a couple of pawns — well under the endgame material threshold.
    const bareFen = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
    expect(classifyGamePhase(30, bareFen)).toBe("endgame");
  });

  it("is middlegame past the opening cutoff with substantial material still on", () => {
    expect(classifyGamePhase(30, START_FEN)).toBe("middlegame");
  });
});

describe("pieceTypeAtSquare", () => {
  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  it("reads the piece type from the origin square", () => {
    expect(pieceTypeAtSquare(START_FEN, "e2")).toBe("pawn");
    expect(pieceTypeAtSquare(START_FEN, "g1")).toBe("knight");
    expect(pieceTypeAtSquare(START_FEN, "d1")).toBe("queen");
  });

  it("returns null for an empty square", () => {
    expect(pieceTypeAtSquare(START_FEN, "e4")).toBeNull();
  });
});

describe("classifyOpening", () => {
  it("matches the longest known prefix", () => {
    expect(classifyOpening(["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"]).key).toBe("ruy_lopez");
    expect(classifyOpening(["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"]).key).toBe("italian");
    expect(classifyOpening(["e2e4", "e7e5"]).key).toBe("open_game");
  });

  it("falls back to unclassified when nothing matches", () => {
    expect(classifyOpening(["a2a3"]).key).toBe("unclassified");
    expect(classifyOpening([]).key).toBe("unclassified");
  });

  it("prefers a more specific (longer) match over a shorter generic one", () => {
    const result = classifyOpening(["e2e4", "c7c5", "g1f3", "d7d6", "d2d4"]);
    expect(result.key).toBe("sicilian_najdorf");
  });
});

describe("computeThinkTimeMs", () => {
  it("is the gap between the two timestamps", () => {
    const previous = new Date("2026-01-01T00:00:00.000Z");
    const current = new Date("2026-01-01T00:00:05.500Z");
    expect(computeThinkTimeMs(current, previous)).toBe(5500);
  });

  it("clamps to zero if timestamps are out of order", () => {
    const previous = new Date("2026-01-01T00:00:05.000Z");
    const current = new Date("2026-01-01T00:00:00.000Z");
    expect(computeThinkTimeMs(current, previous)).toBe(0);
  });
});
