export const QUESTION_TYPE = {
  BRIEF_RESPONSE: "brief_response",
  DETAILED_RESPONSE: "detailed_response",
  MATCH_WORDS: "match_words",
  SCALE_1_5: "scale_1_5",
  SINGLE_CHOICE: "single_choice",
  MULTIPLE_CHOICE: "multiple_choice",
  TRUE_OR_FALSE: "true_or_false",
  PHOTO_QUESTION_SINGLE_CHOICE: "photo_question_single_choice",
  PHOTO_QUESTION_MULTIPLE_CHOICE: "photo_question_multiple_choice",
  FILL_IN_THE_BLANKS_TEXT: "fill_in_the_blanks_text",
  FILL_IN_THE_BLANKS_DND: "fill_in_the_blanks_dnd",
  /** Board question: one best move (UCI). FEN in description; solution in correct optionText. */
  CHESS_FIND_BEST: "chess_find_best",
  /** Board question: full solution line (UCI space-separated). FEN in description. */
  CHESS_MOVE_LINE: "chess_move_line",
} as const;

export type QuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE];
