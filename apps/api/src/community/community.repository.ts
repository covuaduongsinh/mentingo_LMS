import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { addPagination } from "src/common/pagination";
import {
  COMMUNITY_SORT_OPTIONS,
  COMMUNITY_VOTE_TARGET_TYPES,
} from "src/community/community.constants";
import { communityComments, communityPosts, communityVotes, users } from "src/storage/schema";

import type {
  CommunitySort,
  CommunityVoteTargetType,
} from "src/community/schemas/community.schema";

@Injectable()
export class CommunityRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async listPosts(
    userId: UUIDType,
    label: string | undefined,
    sort: CommunitySort,
    page: number,
    perPage: number,
  ) {
    const conditions = label ? [eq(communityPosts.label, label)] : [];

    return this.db.transaction(async (trx) => {
      const query = trx
        .select({
          id: communityPosts.id,
          authorId: communityPosts.authorId,
          authorName: sql<string | null>`${users.firstName} || ' ' || ${users.lastName}`,
          title: communityPosts.title,
          content: communityPosts.content,
          label: communityPosts.label,
          pinned: communityPosts.pinned,
          locked: communityPosts.locked,
          upvoteCount: communityPosts.upvoteCount,
          commentCount: sql<number>`(
            SELECT COUNT(*)::int FROM ${communityComments}
            WHERE ${communityComments.postId} = ${communityPosts.id}
          )`,
          hasVoted: sql<boolean>`EXISTS (
            SELECT 1 FROM ${communityVotes}
            WHERE ${communityVotes.targetId} = ${communityPosts.id}
              AND ${communityVotes.targetType} = ${COMMUNITY_VOTE_TARGET_TYPES.POST}
              AND ${communityVotes.userId} = ${userId}
          )`,
          createdAt: communityPosts.createdAt,
          updatedAt: communityPosts.updatedAt,
        })
        .from(communityPosts)
        .leftJoin(users, eq(users.id, communityPosts.authorId))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(
          desc(communityPosts.pinned),
          sort === COMMUNITY_SORT_OPTIONS.TOP
            ? desc(communityPosts.upvoteCount)
            : desc(communityPosts.createdAt),
        )
        .$dynamic();

      const data = await addPagination(query, page, perPage);

      const [{ totalItems }] = await trx
        .select({ totalItems: count() })
        .from(communityPosts)
        .where(conditions.length ? and(...conditions) : undefined);

      return { data, pagination: { page, perPage, totalItems } };
    });
  }

  async getPostById(postId: UUIDType, userId: UUIDType) {
    const [post] = await this.db
      .select({
        id: communityPosts.id,
        authorId: communityPosts.authorId,
        authorName: sql<string | null>`${users.firstName} || ' ' || ${users.lastName}`,
        title: communityPosts.title,
        content: communityPosts.content,
        label: communityPosts.label,
        pinned: communityPosts.pinned,
        locked: communityPosts.locked,
        upvoteCount: communityPosts.upvoteCount,
        commentCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${communityComments}
          WHERE ${communityComments.postId} = ${communityPosts.id}
        )`,
        hasVoted: sql<boolean>`EXISTS (
          SELECT 1 FROM ${communityVotes}
          WHERE ${communityVotes.targetId} = ${communityPosts.id}
            AND ${communityVotes.targetType} = ${COMMUNITY_VOTE_TARGET_TYPES.POST}
            AND ${communityVotes.userId} = ${userId}
        )`,
        createdAt: communityPosts.createdAt,
        updatedAt: communityPosts.updatedAt,
      })
      .from(communityPosts)
      .leftJoin(users, eq(users.id, communityPosts.authorId))
      .where(eq(communityPosts.id, postId));

    return post;
  }

  async getPostAuthorId(postId: UUIDType) {
    const [row] = await this.db
      .select({ authorId: communityPosts.authorId, locked: communityPosts.locked })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId));

    return row;
  }

  async createPost(data: { authorId: UUIDType; title: string; content: string; label: string }) {
    const [post] = await this.db.insert(communityPosts).values(data).returning();

    return post;
  }

  async updatePost(
    postId: UUIDType,
    data: Partial<{ title: string; content: string; label: string }>,
  ) {
    const [post] = await this.db
      .update(communityPosts)
      .set(data)
      .where(eq(communityPosts.id, postId))
      .returning();

    return post;
  }

  async deletePost(postId: UUIDType) {
    await this.db.delete(communityPosts).where(eq(communityPosts.id, postId));
  }

  async setPostPinned(postId: UUIDType, pinned: boolean) {
    await this.db.update(communityPosts).set({ pinned }).where(eq(communityPosts.id, postId));
  }

  async setPostLocked(postId: UUIDType, locked: boolean) {
    await this.db.update(communityPosts).set({ locked }).where(eq(communityPosts.id, postId));
  }

  async listComments(postId: UUIDType, userId: UUIDType) {
    return this.db
      .select({
        id: communityComments.id,
        postId: communityComments.postId,
        authorId: communityComments.authorId,
        authorName: sql<string | null>`${users.firstName} || ' ' || ${users.lastName}`,
        content: communityComments.content,
        upvoteCount: communityComments.upvoteCount,
        hasVoted: sql<boolean>`EXISTS (
          SELECT 1 FROM ${communityVotes}
          WHERE ${communityVotes.targetId} = ${communityComments.id}
            AND ${communityVotes.targetType} = ${COMMUNITY_VOTE_TARGET_TYPES.COMMENT}
            AND ${communityVotes.userId} = ${userId}
        )`,
        createdAt: communityComments.createdAt,
      })
      .from(communityComments)
      .leftJoin(users, eq(users.id, communityComments.authorId))
      .where(eq(communityComments.postId, postId))
      .orderBy(communityComments.createdAt);
  }

  async getCommentAuthorId(commentId: UUIDType) {
    const [row] = await this.db
      .select({ authorId: communityComments.authorId, postId: communityComments.postId })
      .from(communityComments)
      .where(eq(communityComments.id, commentId));

    return row;
  }

  async createComment(data: { postId: UUIDType; authorId: UUIDType; content: string }) {
    const [comment] = await this.db.insert(communityComments).values(data).returning();

    return comment;
  }

  async deleteComment(commentId: UUIDType) {
    await this.db.delete(communityComments).where(eq(communityComments.id, commentId));
  }

  async countPostsByAuthorLast24h(authorId: UUIDType) {
    const [row] = await this.db
      .select({ count: count() })
      .from(communityPosts)
      .where(
        and(
          eq(communityPosts.authorId, authorId),
          gte(communityPosts.createdAt, sql`NOW() - INTERVAL '24 hours'`),
        ),
      );

    return row?.count ?? 0;
  }

  async toggleVote(userId: UUIDType, targetType: CommunityVoteTargetType, targetId: UUIDType) {
    return this.db.transaction(async (trx) => {
      const [existingVote] = await trx
        .select({ id: communityVotes.id })
        .from(communityVotes)
        .where(
          and(
            eq(communityVotes.userId, userId),
            eq(communityVotes.targetType, targetType),
            eq(communityVotes.targetId, targetId),
          ),
        );

      const table =
        targetType === COMMUNITY_VOTE_TARGET_TYPES.POST ? communityPosts : communityComments;

      if (existingVote) {
        await trx.delete(communityVotes).where(eq(communityVotes.id, existingVote.id));
        await trx
          .update(table)
          .set({ upvoteCount: sql`GREATEST(${table.upvoteCount} - 1, 0)` })
          .where(eq(table.id, targetId));

        return { hasVoted: false };
      }

      await trx.insert(communityVotes).values({ userId, targetType, targetId });
      await trx
        .update(table)
        .set({ upvoteCount: sql`${table.upvoteCount} + 1` })
        .where(eq(table.id, targetId));

      return { hasVoted: true };
    });
  }
}
