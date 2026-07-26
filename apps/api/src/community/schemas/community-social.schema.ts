import { Type } from "@sinclair/typebox";

import { paginatedResponse, UUIDSchema } from "src/common";

import type { Static } from "@sinclair/typebox";

export const sendCommunityMessageBodySchema = Type.Object({
  recipientUserId: UUIDSchema,
  content: Type.String({ minLength: 1, maxLength: 2000 }),
});

export const communityMessageSchema = Type.Object({
  id: UUIDSchema,
  conversationId: UUIDSchema,
  senderId: UUIDSchema,
  content: Type.String(),
  readAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
});

export const communityMessageListSchema = paginatedResponse(Type.Array(communityMessageSchema));

const communityUserSummarySchema = Type.Object({
  userId: UUIDSchema,
  firstName: Type.String(),
  lastName: Type.String(),
  avatarUrl: Type.Union([Type.String(), Type.Null()]),
});

export const communityConversationSchema = Type.Object({
  id: UUIDSchema,
  otherUser: communityUserSummarySchema,
  lastMessagePreview: Type.Union([Type.String(), Type.Null()]),
  lastMessageAt: Type.String(),
  unreadCount: Type.Number(),
});

export const communityConversationListSchema = paginatedResponse(
  Type.Array(communityConversationSchema),
);

export const communityMessageableUserListSchema = Type.Array(communityUserSummarySchema);

export const communityRelationshipStatusSchema = Type.Object({
  isFollowing: Type.Boolean(),
  isFollowedBy: Type.Boolean(),
  isBlocking: Type.Boolean(),
  isBlockedBy: Type.Boolean(),
});

export const communityTrainerSchema = Type.Object({
  userId: UUIDSchema,
  username: Type.Union([Type.String(), Type.Null()]),
  firstName: Type.String(),
  lastName: Type.String(),
  bio: Type.Union([Type.String(), Type.Null()]),
  avatarUrl: Type.Union([Type.String(), Type.Null()]),
});

export const communityTrainerListSchema = paginatedResponse(Type.Array(communityTrainerSchema));

export type SendCommunityMessageBody = Static<typeof sendCommunityMessageBodySchema>;
export type CommunityMessage = Static<typeof communityMessageSchema>;
export type CommunityConversation = Static<typeof communityConversationSchema>;
export type CommunityRelationshipStatus = Static<typeof communityRelationshipStatusSchema>;
export type CommunityTrainer = Static<typeof communityTrainerSchema>;
