import {
  CHESS_PRACTICE_GOAL_TYPES,
  CHESS_STUDY_CHAPTER_MODES,
  CHESS_STUDY_MEMBER_ROLES,
  CHESS_STUDY_ORIENTATIONS,
  CHESS_STUDY_VISIBILITY,
  CHESS_TOPICS,
} from "@repo/shared";
import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

export const chessStudyVisibilitySchema = Type.Enum(CHESS_STUDY_VISIBILITY);
export const chessStudyMemberRoleSchema = Type.Enum(CHESS_STUDY_MEMBER_ROLES);
export const chessStudyChapterModeSchema = Type.Enum(CHESS_STUDY_CHAPTER_MODES);
export const chessStudyOrientationSchema = Type.Enum(CHESS_STUDY_ORIENTATIONS);
export const chessStudyTopicSchema = Type.Enum(CHESS_TOPICS);
export const chessPracticeGoalTypeSchema = Type.Enum(CHESS_PRACTICE_GOAL_TYPES);

/**
 * A move tree flattened into an adjacency list — see ChessStudyFlatMoveNode in the schema
 * and moveTree.ts on the web app for the recursive shape reconstructed from this on the client.
 */
export const chessStudyBoardShapeSchema = Type.Union([
  Type.Object({
    kind: Type.Literal("arrow"),
    from: Type.String(),
    to: Type.String(),
    color: Type.String(),
  }),
  Type.Object({
    kind: Type.Literal("circle"),
    square: Type.String(),
    color: Type.String(),
  }),
]);

export const chessStudyMoveNodeSchema = Type.Object({
  id: Type.String(),
  parentId: Type.Union([Type.String(), Type.Null()]),
  uci: Type.String(),
  san: Type.String(),
  fenAfter: Type.String(),
  comment: Type.Optional(Type.String()),
  glyph: Type.Optional(Type.String()),
  order: Type.Number(),
  shapes: Type.Optional(Type.Array(chessStudyBoardShapeSchema, { maxItems: 32 })),
  hint: Type.Optional(Type.String({ maxLength: 2000 })),
  onWrong: Type.Optional(Type.String({ maxLength: 2000 })),
  onCorrect: Type.Optional(Type.String({ maxLength: 2000 })),
});

export const chessStudyChapterSchema = Type.Object({
  id: UUIDSchema,
  studyId: UUIDSchema,
  title: Type.String(),
  rootFen: Type.String(),
  moveNodes: Type.Array(chessStudyMoveNodeSchema),
  mode: chessStudyChapterModeSchema,
  concealFromPly: Type.Union([Type.Number(), Type.Null()]),
  practiceGoal: Type.Union([Type.String(), Type.Null()]),
  practiceGoalType: Type.Union([chessPracticeGoalTypeSchema, Type.Null()]),
  practiceGoalTargetValue: Type.Union([Type.Number(), Type.Null()]),
  orientation: chessStudyOrientationSchema,
  description: Type.Union([Type.String(), Type.Null()]),
  pgnTags: Type.Record(Type.String(), Type.String()),
  displayOrder: Type.Number(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const createChessStudyChapterBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 300 }),
  rootFen: Type.Optional(Type.String()),
  moveNodes: Type.Optional(Type.Array(chessStudyMoveNodeSchema)),
  mode: Type.Optional(chessStudyChapterModeSchema),
  concealFromPly: Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.Null()])),
  practiceGoal: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  practiceGoalType: Type.Optional(Type.Union([chessPracticeGoalTypeSchema, Type.Null()])),
  practiceGoalTargetValue: Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.Null()])),
  orientation: Type.Optional(chessStudyOrientationSchema),
  description: Type.Optional(Type.Union([Type.String({ maxLength: 5000 }), Type.Null()])),
  pgnTags: Type.Optional(Type.Record(Type.String(), Type.String())),
});

export const importStudyPgnBodySchema = Type.Object({
  pgn: Type.String({ minLength: 1, maxLength: 500_000 }),
  mode: Type.Optional(chessStudyChapterModeSchema),
});

export const updateChessStudyChapterBodySchema = Type.Partial(createChessStudyChapterBodySchema);

export const reorderChessStudyChaptersBodySchema = Type.Object({
  chapterIds: Type.Array(UUIDSchema, { minItems: 1 }),
});

export const chessStudyMemberSchema = Type.Object({
  userId: UUIDSchema,
  role: chessStudyMemberRoleSchema,
  firstName: Type.Union([Type.String(), Type.Null()]),
  lastName: Type.Union([Type.String(), Type.Null()]),
});

export const chessStudySchema = Type.Object({
  id: UUIDSchema,
  authorId: Type.Union([UUIDSchema, Type.Null()]),
  title: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  visibility: chessStudyVisibilitySchema,
  topics: Type.Array(chessStudyTopicSchema),
  sourceStudyId: Type.Union([UUIDSchema, Type.Null()]),
  chapterCount: Type.Number(),
  /** Whether the requesting user can edit this study (owner, admin, or a write member). */
  canWrite: Type.Boolean(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const chessStudyDetailSchema = Type.Intersect([
  chessStudySchema,
  Type.Object({
    chapters: Type.Array(chessStudyChapterSchema),
    members: Type.Array(chessStudyMemberSchema),
  }),
]);

export const createChessStudyBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 300 }),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  visibility: Type.Optional(chessStudyVisibilitySchema),
  topics: Type.Optional(Type.Array(chessStudyTopicSchema)),
});

export const updateChessStudyBodySchema = Type.Partial(createChessStudyBodySchema);

export const addChessStudyMemberBodySchema = Type.Object({
  userId: UUIDSchema,
  role: Type.Optional(chessStudyMemberRoleSchema),
});

export const submitPracticeAttemptBodySchema = Type.Object({
  movesUci: Type.Array(Type.String(), { minItems: 1, maxItems: 300 }),
});

export const practiceAttemptResultSchema = Type.Object({
  achievedGoal: Type.Boolean(),
  movesUsed: Type.Number(),
  bestMovesUsed: Type.Union([Type.Number(), Type.Null()]),
});

export const chessStudyContinueResponseSchema = Type.Object({
  chapterId: Type.Union([UUIDSchema, Type.Null()]),
});

export type CreateChessStudyBody = Static<typeof createChessStudyBodySchema>;
export type UpdateChessStudyBody = Static<typeof updateChessStudyBodySchema>;
export type CreateChessStudyChapterBody = Static<typeof createChessStudyChapterBodySchema>;
export type UpdateChessStudyChapterBody = Static<typeof updateChessStudyChapterBodySchema>;
export type ReorderChessStudyChaptersBody = Static<typeof reorderChessStudyChaptersBodySchema>;
export type AddChessStudyMemberBody = Static<typeof addChessStudyMemberBodySchema>;
export type ChessStudyMoveNode = Static<typeof chessStudyMoveNodeSchema>;
export type SubmitPracticeAttemptBody = Static<typeof submitPracticeAttemptBodySchema>;
export type ImportStudyPgnBody = Static<typeof importStudyPgnBodySchema>;
