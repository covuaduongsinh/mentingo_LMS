/**
 * Assignment engine domain constants. Business behavior is described in
 * docs/specs/assignment-engine-business-spec.md — designed after reading
 * docs/research/learnhouse/ (a clean-room business description, not code
 * ported from any AGPL-licensed source).
 */

/** How the total score of an assignment is expressed to the learner. */
export const ASSIGNMENT_GRADING_TYPE = {
  NUMERIC: "numeric",
  PERCENTAGE: "percentage",
  PASS_FAIL: "pass_fail",
  LETTER: "letter",
  GPA: "gpa",
} as const;

export type AssignmentGradingType =
  (typeof ASSIGNMENT_GRADING_TYPE)[keyof typeof ASSIGNMENT_GRADING_TYPE];

export const ASSIGNMENT_GRADING_TYPE_LIST = Object.values(ASSIGNMENT_GRADING_TYPE);

/** Kind of work a single task within an assignment asks the learner to do. */
export const ASSIGNMENT_TASK_TYPE = {
  SHORT_ANSWER: "short_answer",
  NUMBER_ANSWER: "number_answer",
  FILE_SUBMISSION: "file_submission",
  CHESS_PGN_ANALYSIS: "chess_pgn_analysis",
  CHESS_POSITION_LINE: "chess_position_line",
} as const;

export type AssignmentTaskType = (typeof ASSIGNMENT_TASK_TYPE)[keyof typeof ASSIGNMENT_TASK_TYPE];

export const ASSIGNMENT_TASK_TYPE_LIST = Object.values(ASSIGNMENT_TASK_TYPE);

/** Task types that mentingo's AI judge can grade automatically (free-text reasoning). */
export const ASSIGNMENT_AI_GRADED_TASK_TYPES: AssignmentTaskType[] = [
  ASSIGNMENT_TASK_TYPE.SHORT_ANSWER,
  ASSIGNMENT_TASK_TYPE.CHESS_PGN_ANALYSIS,
];

/** Task types mentingo can grade deterministically without AI or human review. */
export const ASSIGNMENT_AUTO_GRADED_TASK_TYPES: AssignmentTaskType[] = [
  ASSIGNMENT_TASK_TYPE.NUMBER_ANSWER,
  ASSIGNMENT_TASK_TYPE.CHESS_POSITION_LINE,
];

/** Task types that always require a human (trainer) to assign the grade. */
export const ASSIGNMENT_MANUAL_ONLY_TASK_TYPES: AssignmentTaskType[] = [
  ASSIGNMENT_TASK_TYPE.FILE_SUBMISSION,
];

/** Status of one learner's overall submission for an assignment. */
export const ASSIGNMENT_SUBMISSION_STATUS = {
  NOT_SUBMITTED: "not_submitted",
  PENDING: "pending",
  SUBMITTED: "submitted",
  GRADED: "graded",
  LATE: "late",
} as const;

export type AssignmentSubmissionStatus =
  (typeof ASSIGNMENT_SUBMISSION_STATUS)[keyof typeof ASSIGNMENT_SUBMISSION_STATUS];

export const ASSIGNMENT_SUBMISSION_STATUS_LIST = Object.values(ASSIGNMENT_SUBMISSION_STATUS);

export const ASSIGNMENT_GRADING_DEFAULTS = {
  /** LearnHouse's documented default: 50 for numeric/percentage/pass_fail. */
  PASS_THRESHOLD_NUMERIC_PERCENTAGE_PASS_FAIL: 50,
  /** LearnHouse's documented default: 60 for letter/gpa scales. */
  PASS_THRESHOLD_LETTER_GPA: 60,
  MAX_GRADE_VALUE: 100,
  MAX_RETRIES_UNLIMITED: 0,
} as const;
