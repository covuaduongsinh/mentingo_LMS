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
  BULLET_1_0: { id: "1+0", baseSeconds: 60, incrementSeconds: 0 },
  BLITZ_5_0: { id: "5+0", baseSeconds: 300, incrementSeconds: 0 },
  RAPID_10_0: { id: "10+0", baseSeconds: 600, incrementSeconds: 0 },
  RAPID_15_10: { id: "15+10", baseSeconds: 900, incrementSeconds: 10 },
} as const;

export type ChessTimeControlId =
  (typeof CHESS_TIME_CONTROLS)[keyof typeof CHESS_TIME_CONTROLS]["id"];

export const CHESS_TIME_CONTROL_LIST = Object.values(CHESS_TIME_CONTROLS);

/** Time controls playable as a live online match — "none" (no clock) is correspondence, out of scope for L4. */
export const CHESS_MATCH_TIME_CONTROL_LIST = CHESS_TIME_CONTROL_LIST.filter(
  (control) => control.baseSeconds !== null,
);

/** Buckets a match's base time into a rating category, matching common bullet/blitz/rapid conventions. */
export function chessRatingCategoryForTimeControl(
  baseSeconds: number,
): "bullet" | "blitz" | "rapid" {
  if (baseSeconds < 180) return CHESS_RATING_CATEGORIES.BULLET;
  if (baseSeconds < 600) return CHESS_RATING_CATEGORIES.BLITZ;
  return CHESS_RATING_CATEGORIES.RAPID;
}

/** Who can view a study: public = anyone in the tenant, private = author + members only */
export const CHESS_STUDY_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
} as const;

export type ChessStudyVisibility =
  (typeof CHESS_STUDY_VISIBILITY)[keyof typeof CHESS_STUDY_VISIBILITY];

export const CHESS_STUDY_VISIBILITY_LIST = Object.values(CHESS_STUDY_VISIBILITY);

/** Member access level on a study a user doesn't own */
export const CHESS_STUDY_MEMBER_ROLES = {
  READ: "read",
  WRITE: "write",
} as const;

export type ChessStudyMemberRole =
  (typeof CHESS_STUDY_MEMBER_ROLES)[keyof typeof CHESS_STUDY_MEMBER_ROLES];

/**
 * Chapter interaction mode: normal = plain viewer; gamebook = the learner must find the
 * next move themselves before it's revealed; conceal = moves past `concealFromPly` are
 * hidden until the learner reaches them.
 */
export const CHESS_STUDY_CHAPTER_MODES = {
  NORMAL: "normal",
  GAMEBOOK: "gamebook",
  CONCEAL: "conceal",
} as const;

export type ChessStudyChapterMode =
  (typeof CHESS_STUDY_CHAPTER_MODES)[keyof typeof CHESS_STUDY_CHAPTER_MODES];

export const CHESS_STUDY_CHAPTER_MODE_LIST = Object.values(CHESS_STUDY_CHAPTER_MODES);

/**
 * Tactical-motif taxonomy for puzzles — a separate axis from CHESS_TOPICS (curriculum topics).
 * Standard chess terminology, not any one reference system's original wording.
 */
export const CHESS_MOTIFS = {
  FORK: "fork",
  PIN: "pin",
  SKEWER: "skewer",
  DISCOVERED_ATTACK: "discovered_attack",
  DOUBLE_CHECK: "double_check",
  BACK_RANK_MATE: "back_rank_mate",
  SMOTHERED_MATE: "smothered_mate",
  DEFLECTION: "deflection",
  DECOY: "decoy",
  CLEARANCE: "clearance",
  INTERFERENCE: "interference",
  ZWISCHENZUG: "zwischenzug",
  X_RAY: "x_ray",
  TRAPPED_PIECE: "trapped_piece",
  HANGING_PIECE: "hanging_piece",
  SACRIFICE: "sacrifice",
  ATTRACTION: "attraction",
  OVERLOADING: "overloading",
  ZUGZWANG: "zugzwang",
  PROMOTION: "promotion",
  UNDERPROMOTION: "underpromotion",
  EN_PASSANT: "en_passant",
  CASTLING_TACTIC: "castling_tactic",
  KING_HUNT: "king_hunt",
  MATE_IN_1: "mate_in_1",
  MATE_IN_2: "mate_in_2",
  MATE_IN_3_OR_MORE: "mate_in_3_or_more",
  ENDGAME_TACTIC: "endgame_tactic",
  OPENING_TRAP: "opening_trap",
  QUIET_MOVE: "quiet_move",
} as const;

export type ChessMotif = (typeof CHESS_MOTIFS)[keyof typeof CHESS_MOTIFS];

export const CHESS_MOTIF_LIST = Object.values(CHESS_MOTIFS);

export const CHESS_MOTIF_LABELS: Record<ChessMotif, string> = {
  [CHESS_MOTIFS.FORK]: "Đòn đôi (fork)",
  [CHESS_MOTIFS.PIN]: "Ghim (pin)",
  [CHESS_MOTIFS.SKEWER]: "Xiên (skewer)",
  [CHESS_MOTIFS.DISCOVERED_ATTACK]: "Đòn phát hiện",
  [CHESS_MOTIFS.DOUBLE_CHECK]: "Chiếu đôi",
  [CHESS_MOTIFS.BACK_RANK_MATE]: "Chiếu hết hàng ngang cuối",
  [CHESS_MOTIFS.SMOTHERED_MATE]: "Chiếu hết bóp nghẹt",
  [CHESS_MOTIFS.DEFLECTION]: "Đánh lạc hướng (deflection)",
  [CHESS_MOTIFS.DECOY]: "Dụ quân (decoy)",
  [CHESS_MOTIFS.CLEARANCE]: "Dọn đường (clearance)",
  [CHESS_MOTIFS.INTERFERENCE]: "Chắn đường (interference)",
  [CHESS_MOTIFS.ZWISCHENZUG]: "Nước xen (zwischenzug)",
  [CHESS_MOTIFS.X_RAY]: "Đòn xuyên thấu (x-ray)",
  [CHESS_MOTIFS.TRAPPED_PIECE]: "Quân bị bẫy",
  [CHESS_MOTIFS.HANGING_PIECE]: "Quân bỏ ngỏ",
  [CHESS_MOTIFS.SACRIFICE]: "Thí quân",
  [CHESS_MOTIFS.ATTRACTION]: "Lôi kéo (attraction)",
  [CHESS_MOTIFS.OVERLOADING]: "Quá tải (overloading)",
  [CHESS_MOTIFS.ZUGZWANG]: "Thế bí buộc đi (zugzwang)",
  [CHESS_MOTIFS.PROMOTION]: "Phong cấp",
  [CHESS_MOTIFS.UNDERPROMOTION]: "Phong cấp non",
  [CHESS_MOTIFS.EN_PASSANT]: "Bắt tốt qua đường",
  [CHESS_MOTIFS.CASTLING_TACTIC]: "Chiến thuật liên quan nhập thành",
  [CHESS_MOTIFS.KING_HUNT]: "Truy đuổi vua",
  [CHESS_MOTIFS.MATE_IN_1]: "Chiếu hết trong 1 nước",
  [CHESS_MOTIFS.MATE_IN_2]: "Chiếu hết trong 2 nước",
  [CHESS_MOTIFS.MATE_IN_3_OR_MORE]: "Chiếu hết từ 3 nước trở lên",
  [CHESS_MOTIFS.ENDGAME_TACTIC]: "Chiến thuật tàn cuộc",
  [CHESS_MOTIFS.OPENING_TRAP]: "Bẫy khai cuộc",
  [CHESS_MOTIFS.QUIET_MOVE]: "Nước đi lặng lẽ (quiet move)",
};

/** Rating category axis — puzzle (L3) plus time-control categories for online play (L4). */
export const CHESS_RATING_CATEGORIES = {
  PUZZLE: "puzzle",
  BULLET: "bullet",
  BLITZ: "blitz",
  RAPID: "rapid",
} as const;

export type ChessRatingCategory =
  (typeof CHESS_RATING_CATEGORIES)[keyof typeof CHESS_RATING_CATEGORIES];

export const CHESS_RATING_CATEGORY_LIST = Object.values(CHESS_RATING_CATEGORIES);

/** Difficulty bands for adaptive puzzle selection — rating delta around the learner's current rating. */
export const CHESS_PUZZLE_DIFFICULTY_DELTAS = {
  EASIER: 100,
  NORMAL: 200,
  HARDER: 300,
} as const;

export type ChessPuzzleDifficulty = keyof typeof CHESS_PUZZLE_DIFFICULTY_DELTAS;

export const CHESS_PUZZLE_DIFFICULTY_LIST = Object.keys(
  CHESS_PUZZLE_DIFFICULTY_DELTAS,
) as ChessPuzzleDifficulty[];

/** Desired piece color when creating a seek/challenge; "random" is resolved once matched. */
export const CHESS_COLOR_PREFERENCES = {
  WHITE: "white",
  BLACK: "black",
  RANDOM: "random",
} as const;

export type ChessColorPreference =
  (typeof CHESS_COLOR_PREFERENCES)[keyof typeof CHESS_COLOR_PREFERENCES];

export const CHESS_SEEK_STATUSES = {
  PENDING: "pending",
  MATCHED: "matched",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export type ChessSeekStatus = (typeof CHESS_SEEK_STATUSES)[keyof typeof CHESS_SEEK_STATUSES];

export const CHESS_MATCH_STATUSES = {
  ACTIVE: "active",
  FINISHED: "finished",
} as const;

export type ChessMatchStatus = (typeof CHESS_MATCH_STATUSES)[keyof typeof CHESS_MATCH_STATUSES];

export const CHESS_MATCH_RESULTS = {
  WHITE_WIN: "white_win",
  BLACK_WIN: "black_win",
  DRAW: "draw",
} as const;

export type ChessMatchResult = (typeof CHESS_MATCH_RESULTS)[keyof typeof CHESS_MATCH_RESULTS];

/** Reuses the same vocabulary as CHESS_PLAY_END_REASONS (vs.-engine) plus match-specific reasons. */
export const CHESS_MATCH_END_REASONS = {
  CHECKMATE: "checkmate",
  RESIGNATION: "resignation",
  TIMEOUT: "timeout",
  STALEMATE: "stalemate",
  INSUFFICIENT_MATERIAL: "insufficient_material",
  FIFTY_MOVE: "fifty_move",
  THREEFOLD: "threefold",
  DRAW_AGREED: "draw_agreed",
  ABANDONED: "abandoned",
} as const;

export type ChessMatchEndReason =
  (typeof CHESS_MATCH_END_REASONS)[keyof typeof CHESS_MATCH_END_REASONS];
