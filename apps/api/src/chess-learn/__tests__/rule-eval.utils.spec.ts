import { evaluateLearnRule, replayMovesFromFen } from "../rule-eval.utils";

describe("rule-eval.utils", () => {
  it("replays legal moves and detects check", () => {
    const replayed = replayMovesFromFen("4k3/8/8/8/R7/8/8/4K3 w - - 0 1", ["a4e4"]);
    expect(replayed).not.toBeNull();
    expect(evaluateLearnRule({ op: "in_check", color: "b" }, replayed!.chess, "a4e4")).toBe(true);
  });

  it("rejects illegal move transcripts", () => {
    // Rook cannot move diagonally.
    expect(replayMovesFromFen("4k3/8/8/8/R7/8/8/4K3 w - - 0 1", ["a4b5"])).toBeNull();
  });

  it("detects checkmate on fools mate position", () => {
    const fen = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2";
    const replayed = replayMovesFromFen(fen, ["d8h4"]);
    expect(replayed).not.toBeNull();
    expect(evaluateLearnRule({ op: "checkmate" }, replayed!.chess, "d8h4")).toBe(true);
  });

  it("evaluates piece_on combinators", () => {
    const replayed = replayMovesFromFen("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", ["a1a4"]);
    expect(replayed).not.toBeNull();
    expect(
      evaluateLearnRule({ op: "piece_on", piece: "R", square: "a4" }, replayed!.chess, "a1a4"),
    ).toBe(true);
    expect(
      evaluateLearnRule(
        { op: "and", rules: [{ op: "piece_on", piece: "R", square: "a4" }] },
        replayed!.chess,
        "a1a4",
      ),
    ).toBe(true);
  });
});
