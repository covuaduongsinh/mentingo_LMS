import { gradeNumberAnswer } from "../number-answer.grader";

describe("gradeNumberAnswer", () => {
  it("awards full marks on an exact match", () => {
    const result = gradeNumberAnswer({ expectedNumber: 42 }, { number: 42 }, 10);
    expect(result).toEqual({ grade: 10, isCorrect: true });
  });

  it("awards full marks within tolerance", () => {
    const result = gradeNumberAnswer(
      { expectedNumber: 100, numberTolerance: 2 },
      { number: 101.5 },
      10,
    );
    expect(result.isCorrect).toBe(true);
  });

  it("rejects a value outside tolerance", () => {
    const result = gradeNumberAnswer(
      { expectedNumber: 100, numberTolerance: 2 },
      { number: 103 },
      10,
    );
    expect(result).toEqual({ grade: 0, isCorrect: false });
  });

  it("treats a missing submission as incorrect rather than throwing", () => {
    const result = gradeNumberAnswer({ expectedNumber: 5 }, {}, 10);
    expect(result).toEqual({ grade: 0, isCorrect: false });
  });
});
