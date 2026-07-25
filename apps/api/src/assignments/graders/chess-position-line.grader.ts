import { uciMoveSequencesEqual } from "src/chess/utils/chess-moves.utils";

import type { AssignmentSubmissionContents, AssignmentTaskContents } from "src/storage/schema";

/**
 * Deterministic grader for ASSIGNMENT_TASK_TYPE.CHESS_POSITION_LINE.
 * Reuses the same UCI sequence comparison already used to grade the
 * `chess_move_line` quiz question type — see
 * src/chess/utils/chess-moves.utils.ts and src/questions/question.service.ts.
 */
export function gradeChessPositionLine(
  contents: AssignmentTaskContents,
  submission: AssignmentSubmissionContents,
  maxGradeValue: number,
): { grade: number; isCorrect: boolean } {
  const isCorrect = uciMoveSequencesEqual(contents.solutionMovesUci, submission.movesUci, {
    exactLength: true,
  });
  return { grade: isCorrect ? maxGradeValue : 0, isCorrect };
}
