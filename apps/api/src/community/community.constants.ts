export const COMMUNITY_LABELS = {
  GENERAL_DISCUSSION: "general_discussion",
  QUESTION: "question",
  ANNOUNCEMENT: "announcement",
  SHOWCASE: "showcase",
  FEEDBACK: "feedback",
} as const;

export const COMMUNITY_LABEL_LIST = Object.values(COMMUNITY_LABELS);

export type CommunityLabel = (typeof COMMUNITY_LABELS)[keyof typeof COMMUNITY_LABELS];

export const COMMUNITY_VOTE_TARGET_TYPES = {
  POST: "post",
  COMMENT: "comment",
} as const;

export type CommunityVoteTargetType =
  (typeof COMMUNITY_VOTE_TARGET_TYPES)[keyof typeof COMMUNITY_VOTE_TARGET_TYPES];

export const COMMUNITY_SORT_OPTIONS = {
  NEWEST: "newest",
  TOP: "top",
} as const;

export type CommunitySortOption =
  (typeof COMMUNITY_SORT_OPTIONS)[keyof typeof COMMUNITY_SORT_OPTIONS];

export const COMMUNITY_RELATIONSHIP_TYPES = {
  FOLLOW: "follow",
  BLOCK: "block",
} as const;

export type CommunityRelationshipType =
  (typeof COMMUNITY_RELATIONSHIP_TYPES)[keyof typeof COMMUNITY_RELATIONSHIP_TYPES];
