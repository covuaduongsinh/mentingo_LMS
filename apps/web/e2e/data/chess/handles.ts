export const CHESS_BOARD_HANDLES = {
  square: (square: string) => `chess-square-${square}`,
} as const;

export const CHESS_PRACTICE_PAGE_HANDLES = {
  exerciseCard: (exerciseId: string) => `chess-practice-exercise-card-${exerciseId}`,
} as const;

export const CHESS_PRACTICE_SOLVE_PAGE_HANDLES = {
  SUBMIT_BUTTON: "chess-practice-submit-button",
  FEEDBACK_CORRECT: "chess-practice-feedback-correct",
  FEEDBACK_INCORRECT: "chess-practice-feedback-incorrect",
} as const;

export const CHESS_PLAY_PAGE_HANDLES = {
  BOARD_COLUMN: "chess-play-board-column",
  LEVEL_SELECT: "chess-play-level-select",
  NEW_GAME_WHITE: "chess-play-new-game-white",
  NEW_GAME_BLACK: "chess-play-new-game-black",
  RESIGN_BUTTON: "chess-play-resign-button",
  RESIGN_DIALOG: "chess-play-resign-dialog",
  RESIGN_CONFIRM: "chess-play-resign-confirm",
  CLOCK: "chess-play-clock",
  STATUS: "chess-play-status",
  MOVES_LIST: "chess-play-moves-list",
  SESSIONS_PANEL: "chess-play-sessions-panel",
  sessionRow: (sessionId: string) => `chess-play-session-row-${sessionId}`,
  sessionReviewButton: (sessionId: string) => `chess-play-session-review-${sessionId}`,
} as const;

export const CHESS_ADMIN_EXERCISES_PAGE_HANDLES = {
  ADD_BUTTON: "chess-admin-add-exercise-button",
  TITLE_INPUT: "chess-admin-exercise-title-input",
  SAVE_BUTTON: "chess-admin-exercise-save-button",
  row: (exerciseId: string) => `chess-admin-exercise-row-${exerciseId}`,
  publishButton: (exerciseId: string) => `chess-admin-exercise-publish-${exerciseId}`,
  deleteButton: (exerciseId: string) => `chess-admin-exercise-delete-${exerciseId}`,
} as const;

export const CHESS_ADMIN_GAMES_PAGE_HANDLES = {
  ADD_BUTTON: "chess-admin-add-game-button",
} as const;
