export const LESSON_TYPES = {
  CONTENT: "content",
  QUIZ: "quiz",
  AI_MENTOR: "ai_mentor",
  EMBED: "embed",
  SCORM: "scorm",
  LIVE_TRAINING: "live_training",
  ASSIGNMENT: "assignment",
  /** Embed a chess Study (and optional chapter) into a course curriculum (S4). */
  CHESS_STUDY: "chess_study",
} as const;

export type LessonTypes = (typeof LESSON_TYPES)[keyof typeof LESSON_TYPES];
