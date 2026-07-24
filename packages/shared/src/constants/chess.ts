/**
 * Chess domain constants for Cờ Vua Học Đường / Mentingo chess module.
 * Content taxonomy is multi-topic (not tactics-only). Engine/play is out of scope
 * until a MIT-compatible engine strategy is approved.
 */

/** Curriculum / bank topic tags */
export const CHESS_TOPICS = {
  INTRO: "intro",
  RULES: "rules",
  TOURNAMENT_RULES: "tournament_rules",
  OPENING: "opening",
  MIDDLEGAME: "middlegame",
  ENDGAME: "endgame",
  TACTICS: "tactics",
  STRATEGY: "strategy",
  STORY: "story",
  COMPETITIVE_PSYCHOLOGY: "competitive_psychology",
  STUDENT_PSYCHOLOGY: "student_psychology",
  PEDAGOGY: "pedagogy",
} as const;

export type ChessTopic = (typeof CHESS_TOPICS)[keyof typeof CHESS_TOPICS];

export const CHESS_TOPIC_LIST = Object.values(CHESS_TOPICS);

export const CHESS_TOPIC_LABELS: Record<ChessTopic, string> = {
  [CHESS_TOPICS.INTRO]: "Kiến thức nhập môn",
  [CHESS_TOPICS.RULES]: "Luật cờ",
  [CHESS_TOPICS.TOURNAMENT_RULES]: "Quy tắc thi đấu",
  [CHESS_TOPICS.OPENING]: "Khai cuộc",
  [CHESS_TOPICS.MIDDLEGAME]: "Trung cuộc",
  [CHESS_TOPICS.ENDGAME]: "Tàn cuộc",
  [CHESS_TOPICS.TACTICS]: "Chiến thuật",
  [CHESS_TOPICS.STRATEGY]: "Chiến lược",
  [CHESS_TOPICS.STORY]: "Kể chuyện cờ vua",
  [CHESS_TOPICS.COMPETITIVE_PSYCHOLOGY]: "Tâm lý thi đấu",
  [CHESS_TOPICS.STUDENT_PSYCHOLOGY]: "Tâm lý học sinh",
  [CHESS_TOPICS.PEDAGOGY]: "Kỹ năng sư phạm",
};

/** Who the bank item is primarily for */
export const CHESS_AUDIENCES = {
  STUDENT: "student",
  TEACHER: "teacher",
  BOTH: "both",
} as const;

export type ChessAudience = (typeof CHESS_AUDIENCES)[keyof typeof CHESS_AUDIENCES];

export const CHESS_AUDIENCE_LIST = Object.values(CHESS_AUDIENCES);

/** Exercise bank item formats */
export const CHESS_EXERCISE_FORMATS = {
  CHESS_FIND_BEST: "chess_find_best",
  CHESS_MOVE_LINE: "chess_move_line",
  SINGLE_CHOICE: "single_choice",
  TRUE_FALSE: "true_false",
  BRIEF_RESPONSE: "brief_response",
} as const;

export type ChessExerciseFormat =
  (typeof CHESS_EXERCISE_FORMATS)[keyof typeof CHESS_EXERCISE_FORMATS];

export const CHESS_EXERCISE_FORMAT_LIST = Object.values(CHESS_EXERCISE_FORMATS);

/** Difficulty scale for bank items */
export const CHESS_DIFFICULTY = {
  MIN: 1,
  MAX: 10,
  DEFAULT: 3,
} as const;

export const CHESS_GAME_LEVELS = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
} as const;

export type ChessGameLevel = (typeof CHESS_GAME_LEVELS)[keyof typeof CHESS_GAME_LEVELS];

export const CHESS_GAME_LEVEL_LIST = Object.values(CHESS_GAME_LEVELS);

export const CHESS_CONTENT_SOURCE = {
  ORIGINAL: "original",
  LICHESS_CC0: "lichess_cc0",
  IMPORT: "import",
} as const;

export type ChessContentSource = (typeof CHESS_CONTENT_SOURCE)[keyof typeof CHESS_CONTENT_SOURCE];

/**
 * MIT-only dependency allowlist for chess UI/logic.
 * Do not add GPL libraries (Chessground, Stockfish, etc.) without legal review.
 */
export const CHESS_MIT_ALLOWLIST = {
  CHESS_JS: "chess.js",
  BOARD_UI: "custom-react-board (in-repo, MIT-compatible)",
  PUZZLE_DATA: "Lichess puzzle dump (CC0 data)",
  /** Preferred UCI engine — MIT (Jon Dart / arasanchess.org, v14+) */
  ENGINE: "Arasan (MIT)",
  ENGINE_FALLBACK: "in-repo minimax builtin (MIT)",
} as const;

export const CHESS_ENGINE_LEVELS = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export type ChessEngineLevelShared = (typeof CHESS_ENGINE_LEVELS)[keyof typeof CHESS_ENGINE_LEVELS];

/** Engines that can answer a play session (see apps/api chess engine service) */
export const CHESS_ENGINE_NAMES = {
  ARASAN: "arasan",
  BUILTIN: "builtin",
} as const;

export type ChessEngineName = (typeof CHESS_ENGINE_NAMES)[keyof typeof CHESS_ENGINE_NAMES];

export const CHESS_ENGINE_NAME_LIST = Object.values(CHESS_ENGINE_NAMES);

/** Result of a play-vs-engine session, from the player's perspective */
export const CHESS_PLAY_OUTCOMES = {
  WIN: "win",
  LOSS: "loss",
  DRAW: "draw",
} as const;

export type ChessPlayOutcome = (typeof CHESS_PLAY_OUTCOMES)[keyof typeof CHESS_PLAY_OUTCOMES];

export const CHESS_PLAY_OUTCOME_LIST = Object.values(CHESS_PLAY_OUTCOMES);

export const CHESS_PLAY_END_REASONS = {
  CHECKMATE: "checkmate",
  RESIGNATION: "resignation",
  TIMEOUT: "timeout",
  STALEMATE: "stalemate",
  DRAW_CLAIMED: "draw_claimed",
  INSUFFICIENT_MATERIAL: "insufficient_material",
  FIFTY_MOVE: "fifty_move",
  THREEFOLD: "threefold",
} as const;

export type ChessPlayEndReason =
  (typeof CHESS_PLAY_END_REASONS)[keyof typeof CHESS_PLAY_END_REASONS];

export const CHESS_PLAY_END_REASON_LIST = Object.values(CHESS_PLAY_END_REASONS);

/** Clock presets for play vs engine; id doubles as the persisted value */
export const CHESS_TIME_CONTROLS = {
  NONE: { id: "none", baseSeconds: null, incrementSeconds: null },
  BLITZ_5_0: { id: "5+0", baseSeconds: 300, incrementSeconds: 0 },
  RAPID_10_0: { id: "10+0", baseSeconds: 600, incrementSeconds: 0 },
  RAPID_15_10: { id: "15+10", baseSeconds: 900, incrementSeconds: 10 },
} as const;

export type ChessTimeControlId =
  (typeof CHESS_TIME_CONTROLS)[keyof typeof CHESS_TIME_CONTROLS]["id"];

export const CHESS_TIME_CONTROL_LIST = Object.values(CHESS_TIME_CONTROLS);
