import type { AssignmentSubmissionContents, AssignmentTaskContents } from "src/storage/schema";

/**
 * Deterministic grader for ASSIGNMENT_TASK_TYPE.NUMBER_ANSWER.
 * The learner's number is correct when it falls within `numberTolerance`
 * (default 0, i.e. exact match) of `expectedNumber`.
 */
export function gradeNumberAnswer(
  contents: AssignmentTaskContents,
  submission: AssignmentSubmissionContents,
  maxGradeValue: number,
): { grade: number; isCorrect: boolean } {
  const expected = contents.expectedNumber;
  const tolerance = contents.numberTolerance ?? 0;
  const actual = submission.number;

  if (expected === undefined || actual === undefined) {
    return { grade: 0, isCorrect: false };
  }

  const isCorrect = Math.abs(actual - expected) <= tolerance;
  return { grade: isCorrect ? maxGradeValue : 0, isCorrect };
}
