import { CHESS_PRACTICE_GOAL_TYPES } from "@repo/shared";

import { evaluatePracticeGoal, materialBalance, replayPracticeMoves } from "../practice-goal.utils";

const FOOLS_MATE_ROOT_FEN = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2";
const STALEMATE_ROOT_FEN = "k7/8/K6Q/8/8/8/8/8 w - - 0 1";

describe("replayPracticeMoves", () => {
  it("replays a legal move sequence and reports the resulting FEN and ply count", () => {
    const result = replayPracticeMoves(FOOLS_MATE_ROOT_FEN, ["d8h4"]);

    expect(result.legal).toBe(true);
    if (result.legal) {
      expect(result.movesUsed).toBe(1);
      expect(result.finalFen).toContain("rnb1kbnr"); // black queen left d8
      expect(result.finalFen).toContain("6Pq"); // queen now on h4
    }
  });

  it("rejects an illegal move", () => {
    const result = replayPracticeMoves(FOOLS_MATE_ROOT_FEN, ["d8d4"]); // queen can't jump there

    expect(result.legal).toBe(false);
  });
});

describe("evaluatePracticeGoal — checkmate_in_n", () => {
  it("passes when checkmate is delivered within the allowed number of plies", () => {
    const replay = replayPracticeMoves(FOOLS_MATE_ROOT_FEN, ["d8h4"]);
    expect(replay.legal).toBe(true);
    if (!replay.legal) return;

    const achieved = evaluatePracticeGoal(
      CHESS_PRACTICE_GOAL_TYPES.CHECKMATE_IN_N,
      1,
      replay.finalFen,
      replay.movesUsed,
    );
    expect(achieved).toBe(true);
  });

  it("fails when checkmate takes more plies than allowed", () => {
    const replay = replayPracticeMoves(FOOLS_MATE_ROOT_FEN, ["d8h4"]);
    if (!replay.legal) throw new Error("expected legal replay");

    const achieved = evaluatePracticeGoal(
      CHESS_PRACTICE_GOAL_TYPES.CHECKMATE_IN_N,
      0,
      replay.finalFen,
      replay.movesUsed,
    );
    expect(achieved).toBe(false);
  });

  it("fails when the final position is not checkmate at all", () => {
    const achieved = evaluatePracticeGoal(
      CHESS_PRACTICE_GOAL_TYPES.CHECKMATE_IN_N,
      5,
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      1,
    );
    expect(achieved).toBe(false);
  });
});

describe("evaluatePracticeGoal — draw", () => {
  it("passes when the final position is a stalemate", () => {
    const replay = replayPracticeMoves(STALEMATE_ROOT_FEN, ["h6b6"]);
    expect(replay.legal).toBe(true);
    if (!replay.legal) return;

    const achieved = evaluatePracticeGoal(
      CHESS_PRACTICE_GOAL_TYPES.DRAW,
      null,
      replay.finalFen,
      replay.movesUsed,
    );
    expect(achieved).toBe(true);
  });

  it("fails when the position is not a draw", () => {
    const achieved = evaluatePracticeGoal(
      CHESS_PRACTICE_GOAL_TYPES.DRAW,
      null,
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      0,
    );
    expect(achieved).toBe(false);
  });
});

describe("materialBalance / evaluatePracticeGoal — reach_material_advantage", () => {
  it("is 0 for the symmetric starting position", () => {
    expect(materialBalance("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")).toBe(0);
  });

  it("credits White a full queen once Black's queen is removed", () => {
    const balance = materialBalance("rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(balance).toBe(9);
  });

  it("passes reach_material_advantage once the balance meets the target", () => {
    const fen = "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(
      evaluatePracticeGoal(CHESS_PRACTICE_GOAL_TYPES.REACH_MATERIAL_ADVANTAGE, 9, fen, 0),
    ).toBe(true);
    expect(
      evaluatePracticeGoal(CHESS_PRACTICE_GOAL_TYPES.REACH_MATERIAL_ADVANTAGE, 10, fen, 0),
    ).toBe(false);
  });
});
