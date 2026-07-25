import { gradeChessPositionLine } from "../chess-position-line.grader";

describe("gradeChessPositionLine", () => {
  it("awards full marks for the exact solution line", () => {
    const result = gradeChessPositionLine(
      { solutionMovesUci: ["e2e4", "e7e5", "g1f3"] },
      { movesUci: ["e2e4", "e7e5", "g1f3"] },
      10,
    );
    expect(result).toEqual({ grade: 10, isCorrect: true });
  });

  it("rejects a shorter prefix (exact length required, unlike the free quiz format)", () => {
    const result = gradeChessPositionLine(
      { solutionMovesUci: ["e2e4", "e7e5", "g1f3"] },
      { movesUci: ["e2e4", "e7e5"] },
      10,
    );
    expect(result).toEqual({ grade: 0, isCorrect: false });
  });

  it("is case-insensitive, matching the shared chess quiz grader", () => {
    const result = gradeChessPositionLine(
      { solutionMovesUci: ["e2e4"] },
      { movesUci: ["E2E4"] },
      10,
    );
    expect(result.isCorrect).toBe(true);
  });
});
