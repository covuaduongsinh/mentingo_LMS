import { Inject, Injectable } from "@nestjs/common";
import { SYSTEM_ROLE_SLUGS } from "@repo/shared";
import { and, count, eq, inArray, ne, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { addPagination } from "src/common/pagination";
import { COMMUNITY_RELATIONSHIP_TYPES } from "src/community/community.constants";
import {
  communityConversations,
  communityMessages,
  communityUserRelationships,
  permissionRoles,
  permissionUserRoles,
  userDetails,
  users,
} from "src/storage/schema";

import type { CommunityRelationshipType } from "src/community/community.constants";

type UserSummaryRow = {
  userId: UUIDType;
  firstName: string;
  lastName: string;
  avatarReference: string | null;
};

@Injectable()
export class CommunitySocialRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async getManagedStatus(userId: UUIDType) {
    const [row] = await this.db
      .select({ isManagedAccount: users.isManagedAccount })
      .from(users)
      .where(eq(users.id, userId));

    return row?.isManagedAccount ?? false;
  }

  async shareGroup(userIdA: UUIDType, userIdB: UUIDType) {
    const [row] = await this.db.execute(sql`
      SELECT 1
      FROM group_users gu1
      JOIN group_users gu2 ON gu1.group_id = gu2.group_id
      WHERE gu1.user_id = ${userIdA} AND gu2.user_id = ${userIdB}
      LIMIT 1
    `);

    return Boolean(row);
  }

  async getOrCreateConversation(userId1: UUIDType, userId2: UUIDType, tenantId: UUIDType) {
    const [userAId, userBId] = [userId1, userId2].sort();

    const [existing] = await this.db
      .select()
      .from(communityConversations)
      .where(
        and(
          eq(communityConversations.userAId, userAId),
          eq(communityConversations.userBId, userBId),
        ),
      );
    if (existing) return existing;

    const [created] = await this.db
      .insert(communityConversations)
      .values({ userAId, userBId, tenantId })
      .onConflictDoNothing()
      .returning();
    if (created) return created;

    // Lost a race with a concurrent request creating the same pair — re-select.
    const [row] = await this.db
      .select()
      .from(communityConversations)
      .where(
        and(
          eq(communityConversations.userAId, userAId),
          eq(communityConversations.userBId, userBId),
        ),
      );
    return row;
  }

  async getConversationParticipants(conversationId: UUIDType) {
    const [row] = await this.db
      .select({ userAId: communityConversations.userAId, userBId: communityConversations.userBId })
      .from(communityConversations)
      .where(eq(communityConversations.id, conversationId));

    return row;
  }

  async insertMessage(data: {
    conversationId: UUIDType;
    senderId: UUIDType;
    content: string;
    tenantId: UUIDType;
  }) {
    const [message] = await this.db.insert(communityMessages).values(data).returning();
    return message;
  }

  async touchConversationLastMessageAt(conversationId: UUIDType, when: Date) {
    await this.db
      .update(communityConversations)
      .set({ lastMessageAt: when })
      .where(eq(communityConversations.id, conversationId));
  }

  async listConversationsForUser(userId: UUIDType, page: number, perPage: number) {
    const rows = await this.db.execute(sql`
      SELECT
        c.id AS id,
        CASE WHEN c.user_a_id = ${userId} THEN c.user_b_id ELSE c.user_a_id END AS "otherUserId",
        c.last_message_at AS "lastMessageAt",
        (
          SELECT content FROM community_messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS "lastMessagePreview",
        (
          SELECT COUNT(*)::int FROM community_messages m
          WHERE m.conversation_id = c.id AND m.sender_id <> ${userId} AND m.read_at IS NULL
        ) AS "unreadCount"
      FROM community_conversations c
      WHERE c.user_a_id = ${userId} OR c.user_b_id = ${userId}
      ORDER BY c.last_message_at DESC
      LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
    `);

    const [{ totalItems }] = (await this.db.execute(sql`
      SELECT COUNT(*)::int AS "totalItems" FROM community_conversations c
      WHERE c.user_a_id = ${userId} OR c.user_b_id = ${userId}
    `)) as unknown as { totalItems: number }[];

    const otherUserIds = (rows as unknown as { otherUserId: UUIDType }[]).map(
      (row) => row.otherUserId,
    );
    const userSummaries = await this.getUserSummaries(otherUserIds);
    const userSummaryById = new Map(userSummaries.map((summary) => [summary.userId, summary]));

    const data = (
      rows as unknown as {
        id: UUIDType;
        otherUserId: UUIDType;
        lastMessageAt: string;
        lastMessagePreview: string | null;
        unreadCount: number;
      }[]
    ).map((row) => ({
      id: row.id,
      otherUser: userSummaryById.get(row.otherUserId) ?? {
        userId: row.otherUserId,
        firstName: "",
        lastName: "",
        avatarReference: null,
      },
      lastMessagePreview: row.lastMessagePreview,
      lastMessageAt: row.lastMessageAt,
      unreadCount: row.unreadCount,
    }));

    return { data, pagination: { page, perPage, totalItems } };
  }

  private async getUserSummaries(userIds: UUIDType[]): Promise<UserSummaryRow[]> {
    if (userIds.length === 0) return [];

    return this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarReference: users.avatarReference,
      })
      .from(users)
      .where(inArray(users.id, userIds));
  }

  async listMessages(conversationId: UUIDType, page: number, perPage: number) {
    const query = this.db
      .select()
      .from(communityMessages)
      .where(eq(communityMessages.conversationId, conversationId))
      .orderBy(communityMessages.createdAt)
      .$dynamic();

    const data = await addPagination(query, page, perPage);

    const [{ totalItems }] = await this.db
      .select({ totalItems: count() })
      .from(communityMessages)
      .where(eq(communityMessages.conversationId, conversationId));

    return { data, pagination: { page, perPage, totalItems } };
  }

  async markConversationRead(conversationId: UUIDType, userId: UUIDType) {
    await this.db
      .update(communityMessages)
      .set({ readAt: sql`NOW()` })
      .where(
        and(
          eq(communityMessages.conversationId, conversationId),
          ne(communityMessages.senderId, userId),
          sql`${communityMessages.readAt} IS NULL`,
        ),
      );
  }

  async addRelationship(
    actorUserId: UUIDType,
    targetUserId: UUIDType,
    relationshipType: CommunityRelationshipType,
    tenantId: UUIDType,
  ) {
    await this.db
      .insert(communityUserRelationships)
      .values({ actorUserId, targetUserId, relationshipType, tenantId })
      .onConflictDoNothing();
  }

  async removeRelationship(
    actorUserId: UUIDType,
    targetUserId: UUIDType,
    relationshipType: CommunityRelationshipType,
  ) {
    await this.db
      .delete(communityUserRelationships)
      .where(
        and(
          eq(communityUserRelationships.actorUserId, actorUserId),
          eq(communityUserRelationships.targetUserId, targetUserId),
          eq(communityUserRelationships.relationshipType, relationshipType),
        ),
      );
  }

  async getRelationshipStatus(userIdA: UUIDType, userIdB: UUIDType) {
    const rows = await this.db
      .select({
        actorUserId: communityUserRelationships.actorUserId,
        targetUserId: communityUserRelationships.targetUserId,
        relationshipType: communityUserRelationships.relationshipType,
      })
      .from(communityUserRelationships)
      .where(
        sql`(${communityUserRelationships.actorUserId} = ${userIdA} AND ${communityUserRelationships.targetUserId} = ${userIdB})
          OR (${communityUserRelationships.actorUserId} = ${userIdB} AND ${communityUserRelationships.targetUserId} = ${userIdA})`,
      );

    const has = (actorUserId: UUIDType, targetUserId: UUIDType, type: CommunityRelationshipType) =>
      rows.some(
        (row) =>
          row.actorUserId === actorUserId &&
          row.targetUserId === targetUserId &&
          row.relationshipType === type,
      );

    return {
      isFollowing: has(userIdA, userIdB, COMMUNITY_RELATIONSHIP_TYPES.FOLLOW),
      isFollowedBy: has(userIdB, userIdA, COMMUNITY_RELATIONSHIP_TYPES.FOLLOW),
      isBlocking: has(userIdA, userIdB, COMMUNITY_RELATIONSHIP_TYPES.BLOCK),
      isBlockedBy: has(userIdB, userIdA, COMMUNITY_RELATIONSHIP_TYPES.BLOCK),
    };
  }

  async listTrainers(page: number, perPage: number) {
    const conditions = and(
      eq(permissionRoles.slug, SYSTEM_ROLE_SLUGS.TRAINER),
      eq(users.publicProfileEnabled, true),
    );

    const query = this.db
      .select({
        userId: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarReference: users.avatarReference,
        bio: userDetails.description,
      })
      .from(permissionUserRoles)
      .innerJoin(permissionRoles, eq(permissionRoles.id, permissionUserRoles.roleId))
      .innerJoin(users, eq(users.id, permissionUserRoles.userId))
      .leftJoin(userDetails, eq(userDetails.userId, users.id))
      .where(conditions)
      .orderBy(users.firstName, users.lastName)
      .$dynamic();

    const data = await addPagination(query, page, perPage);

    const [{ totalItems }] = await this.db
      .select({ totalItems: count() })
      .from(permissionUserRoles)
      .innerJoin(permissionRoles, eq(permissionRoles.id, permissionUserRoles.roleId))
      .innerJoin(users, eq(users.id, permissionUserRoles.userId))
      .where(conditions);

    return { data, pagination: { page, perPage, totalItems } };
  }

  async listClassmates(actorUserId: UUIDType): Promise<UserSummaryRow[]> {
    const rows = await this.db.execute(sql`
      SELECT DISTINCT u.id AS "userId", u.first_name AS "firstName", u.last_name AS "lastName",
        u.avatar_reference AS "avatarReference"
      FROM group_users gu1
      JOIN group_users gu2 ON gu1.group_id = gu2.group_id
      JOIN users u ON u.id = gu2.user_id
      WHERE gu1.user_id = ${actorUserId} AND gu2.user_id <> ${actorUserId}
        AND NOT EXISTS (
          SELECT 1 FROM community_user_relationships b
          WHERE b.relationship_type = 'block' AND (
            (b.actor_user_id = ${actorUserId} AND b.target_user_id = u.id) OR
            (b.actor_user_id = u.id AND b.target_user_id = ${actorUserId})
          )
        )
    `);

    return rows as unknown as UserSummaryRow[];
  }

  async listMessageableCandidatesForNonManaged(actorUserId: UUIDType): Promise<UserSummaryRow[]> {
    const rows = await this.db.execute(sql`
      SELECT u.id AS "userId", u.first_name AS "firstName", u.last_name AS "lastName",
        u.avatar_reference AS "avatarReference"
      FROM users u
      WHERE u.id <> ${actorUserId}
        AND (
          (u.public_profile_enabled = true AND EXISTS (
            SELECT 1 FROM permission_user_roles pur
            JOIN permission_roles pr ON pr.id = pur.role_id
            WHERE pur.user_id = u.id AND pr.slug = 'trainer'
          ))
          OR EXISTS (
            SELECT 1 FROM community_user_relationships r
            WHERE r.actor_user_id = ${actorUserId} AND r.target_user_id = u.id AND r.relationship_type = 'follow'
          )
          OR EXISTS (
            SELECT 1 FROM community_conversations c
            WHERE (c.user_a_id = ${actorUserId} AND c.user_b_id = u.id)
               OR (c.user_b_id = ${actorUserId} AND c.user_a_id = u.id)
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM community_user_relationships b
          WHERE b.relationship_type = 'block' AND (
            (b.actor_user_id = ${actorUserId} AND b.target_user_id = u.id) OR
            (b.actor_user_id = u.id AND b.target_user_id = ${actorUserId})
          )
        )
    `);

    return rows as unknown as UserSummaryRow[];
  }
}
