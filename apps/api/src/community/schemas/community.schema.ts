import { Type } from "@sinclair/typebox";

import { paginatedResponse, UUIDSchema } from "src/common";
import {
  COMMUNITY_LABEL_LIST,
  COMMUNITY_SORT_OPTIONS,
  COMMUNITY_VOTE_TARGET_TYPES,
} from "src/community/community.constants";

import type { Static } from "@sinclair/typebox";

export const communityLabelSchema = Type.Union(
  COMMUNITY_LABEL_LIST.map((label) => Type.Literal(label)),
);

export const createCommunityPostBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  content: Type.String({ minLength: 1 }),
  label: communityLabelSchema,
});

export const updateCommunityPostBodySchema = Type.Partial(createCommunityPostBodySchema);

export const createCommunityCommentBodySchema = Type.Object({
  content: Type.String({ minLength: 1 }),
});

export const communityVoteTargetTypeSchema = Type.Union([
  Type.Literal(COMMUNITY_VOTE_TARGET_TYPES.POST),
  Type.Literal(COMMUNITY_VOTE_TARGET_TYPES.COMMENT),
]);

export const communitySortSchema = Type.Union([
  Type.Literal(COMMUNITY_SORT_OPTIONS.NEWEST),
  Type.Literal(COMMUNITY_SORT_OPTIONS.TOP),
]);

export const communityPostSchema = Type.Object({
  id: UUIDSchema,
  authorId: Type.Union([UUIDSchema, Type.Null()]),
  authorName: Type.Union([Type.String(), Type.Null()]),
  title: Type.String(),
  content: Type.String(),
  label: Type.String(),
  pinned: Type.Boolean(),
  locked: Type.Boolean(),
  upvoteCount: Type.Number(),
  commentCount: Type.Number(),
  hasVoted: Type.Boolean(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const communityPostListSchema = paginatedResponse(Type.Array(communityPostSchema));

export const communityCommentSchema = Type.Object({
  id: UUIDSchema,
  postId: UUIDSchema,
  authorId: Type.Union([UUIDSchema, Type.Null()]),
  authorName: Type.Union([Type.String(), Type.Null()]),
  content: Type.String(),
  upvoteCount: Type.Number(),
  hasVoted: Type.Boolean(),
  createdAt: Type.String(),
});

export const communityCommentListSchema = Type.Array(communityCommentSchema);

export type CreateCommunityPostBody = Static<typeof createCommunityPostBodySchema>;
export type UpdateCommunityPostBody = Static<typeof updateCommunityPostBodySchema>;
export type CreateCommunityCommentBody = Static<typeof createCommunityCommentBodySchema>;
export type CommunityVoteTargetType = Static<typeof communityVoteTargetTypeSchema>;
export type CommunitySort = Static<typeof communitySortSchema>;
export type CommunityPost = Static<typeof communityPostSchema>;
export type CommunityComment = Static<typeof communityCommentSchema>;
