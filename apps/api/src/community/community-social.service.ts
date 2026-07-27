import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";

import { FileService } from "src/file/file.service";
import { getUserRoomKey } from "src/file/utils/userRoom";
import { REALTIME_PUBLISHER, type RealtimePublisher } from "src/websocket/realtime.publisher";

import { CommunitySocialRepository } from "./community-social.repository";
import { COMMUNITY_RELATIONSHIP_TYPES } from "./community.constants";

import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

type UserSummaryRow = {
  userId: UUIDType;
  firstName: string;
  lastName: string;
  avatarReference: string | null;
};

@Injectable()
export class CommunitySocialService {
  constructor(
    private readonly repository: CommunitySocialRepository,
    private readonly fileService: FileService,
    @Inject(REALTIME_PUBLISHER) private readonly realtimePublisher: RealtimePublisher,
  ) {}

  private async resolveAvatarUrl(avatarReference: string | null): Promise<string | null> {
    if (!avatarReference) return null;
    return this.fileService.getFileUrl(avatarReference).catch(() => null);
  }

  private async toUserSummary(row: UserSummaryRow) {
    return {
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      avatarUrl: await this.resolveAvatarUrl(row.avatarReference),
    };
  }

  /** Kid mode: if either side is a managed (chess-class) account, they must be classmates —
   * sharing an HR/L&D group or an active Classroom membership. */
  private async assertCanInteract(actorUserId: UUIDType, targetUserId: UUIDType) {
    const [actorManaged, targetManaged] = await Promise.all([
      this.repository.getManagedStatus(actorUserId),
      this.repository.getManagedStatus(targetUserId),
    ]);

    if (!actorManaged && !targetManaged) return;

    const areClassmates = await this.repository.sharesClassmateRelationship(
      actorUserId,
      targetUserId,
    );
    if (!areClassmates) {
      throw new ForbiddenException("communityView.errors.kidModeNotClassmates");
    }
  }

  private async assertNotBlocked(userIdA: UUIDType, userIdB: UUIDType) {
    const status = await this.repository.getRelationshipStatus(userIdA, userIdB);
    if (status.isBlocking || status.isBlockedBy) {
      throw new ForbiddenException("communityView.errors.userBlocked");
    }
  }

  async sendMessage(actor: CurrentUserType, recipientUserId: UUIDType, content: string) {
    if (recipientUserId === actor.userId) {
      throw new BadRequestException("communityView.errors.cannotMessageSelf");
    }

    await this.assertNotBlocked(actor.userId, recipientUserId);
    await this.assertCanInteract(actor.userId, recipientUserId);

    const conversation = await this.repository.getOrCreateConversation(
      actor.userId,
      recipientUserId,
      actor.tenantId,
    );

    const now = new Date();
    const message = await this.repository.insertMessage({
      conversationId: conversation.id,
      senderId: actor.userId,
      content,
      tenantId: actor.tenantId,
    });
    await this.repository.touchConversationLastMessageAt(conversation.id, now);

    this.realtimePublisher.emitToRoom("community:new-message", getUserRoomKey(recipientUserId), {
      conversationId: conversation.id,
      message,
    });

    return message;
  }

  async listConversations(userId: UUIDType, page: number, perPage: number) {
    const result = await this.repository.listConversationsForUser(userId, page, perPage);
    return {
      ...result,
      data: await Promise.all(
        result.data.map(async (row) => ({
          ...row,
          otherUser: await this.toUserSummary(row.otherUser),
        })),
      ),
    };
  }

  async getMessages(userId: UUIDType, conversationId: UUIDType, page: number, perPage: number) {
    const participants = await this.repository.getConversationParticipants(conversationId);
    if (!participants || (participants.userAId !== userId && participants.userBId !== userId)) {
      throw new ForbiddenException("communityView.errors.notAConversationParticipant");
    }

    return this.repository.listMessages(conversationId, page, perPage);
  }

  async markRead(userId: UUIDType, conversationId: UUIDType) {
    const participants = await this.repository.getConversationParticipants(conversationId);
    if (!participants || (participants.userAId !== userId && participants.userBId !== userId)) {
      throw new ForbiddenException("communityView.errors.notAConversationParticipant");
    }

    await this.repository.markConversationRead(conversationId, userId);
  }

  async listMessageableUsers(actor: CurrentUserType) {
    const isManaged = await this.repository.getManagedStatus(actor.userId);
    const rows = isManaged
      ? await this.repository.listClassmates(actor.userId)
      : await this.repository.listMessageableCandidatesForNonManaged(actor.userId);

    return Promise.all(rows.map((row) => this.toUserSummary(row)));
  }

  async follow(actor: CurrentUserType, targetUserId: UUIDType) {
    if (targetUserId === actor.userId) {
      throw new BadRequestException("communityView.errors.cannotFollowSelf");
    }
    await this.assertNotBlocked(actor.userId, targetUserId);
    await this.assertCanInteract(actor.userId, targetUserId);

    await this.repository.addRelationship(
      actor.userId,
      targetUserId,
      COMMUNITY_RELATIONSHIP_TYPES.FOLLOW,
      actor.tenantId,
    );
  }

  async unfollow(actor: CurrentUserType, targetUserId: UUIDType) {
    await this.repository.removeRelationship(
      actor.userId,
      targetUserId,
      COMMUNITY_RELATIONSHIP_TYPES.FOLLOW,
    );
  }

  async block(actor: CurrentUserType, targetUserId: UUIDType) {
    if (targetUserId === actor.userId) {
      throw new BadRequestException("communityView.errors.cannotBlockSelf");
    }

    await this.repository.addRelationship(
      actor.userId,
      targetUserId,
      COMMUNITY_RELATIONSHIP_TYPES.BLOCK,
      actor.tenantId,
    );
    // Blocking clears any existing follow relationship in either direction, so the
    // pair doesn't end up in the contradictory "blocked but still following" state.
    await Promise.all([
      this.repository.removeRelationship(
        actor.userId,
        targetUserId,
        COMMUNITY_RELATIONSHIP_TYPES.FOLLOW,
      ),
      this.repository.removeRelationship(
        targetUserId,
        actor.userId,
        COMMUNITY_RELATIONSHIP_TYPES.FOLLOW,
      ),
    ]);
  }

  async unblock(actor: CurrentUserType, targetUserId: UUIDType) {
    await this.repository.removeRelationship(
      actor.userId,
      targetUserId,
      COMMUNITY_RELATIONSHIP_TYPES.BLOCK,
    );
  }

  async getRelationshipStatus(actorUserId: UUIDType, targetUserId: UUIDType) {
    return this.repository.getRelationshipStatus(actorUserId, targetUserId);
  }

  async listTrainers(page: number, perPage: number) {
    const result = await this.repository.listTrainers(page, perPage);
    return {
      ...result,
      data: await Promise.all(
        result.data.map(async (row) => ({
          userId: row.userId,
          username: row.username,
          firstName: row.firstName,
          lastName: row.lastName,
          bio: row.bio,
          avatarUrl: await this.resolveAvatarUrl(row.avatarReference),
        })),
      ),
    };
  }
}
