import { builtinAnalyze, builtinBestMove } from "./builtin-engine";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("builtin-engine", () => {
  it("returns a legal UCI move from the start position", () => {
    const result = builtinBestMove(START_FEN, undefined, 2);
    expect(result.engine).toBe("builtin");
    expect(result.bestMoveUci.length).toBeGreaterThanOrEqual(4);
    expect(result.depth).toBeGreaterThanOrEqual(1);
  });

  it("analyzes a position with score and pv", () => {
    const result = builtinAnalyze(START_FEN, undefined, 2);
    expect(result.engine).toBe("builtin");
    expect(result.bestMoveUci).toBeTruthy();
    expect(result.pv.length).toBeGreaterThan(0);
    expect(typeof result.scoreCp === "number" || result.scoreCp === null).toBe(true);
  });
});
