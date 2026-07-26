import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";

import { hasPermission } from "src/common/permissions/permission.utils";
import {
  COMMUNITY_SORT_OPTIONS,
  COMMUNITY_VOTE_TARGET_TYPES,
} from "src/community/community.constants";
import { CommunityRepository } from "src/community/community.repository";
import { SettingsService } from "src/settings/settings.service";

import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";
import type {
  CommunitySort,
  CommunityVoteTargetType,
  CreateCommunityCommentBody,
  CreateCommunityPostBody,
  UpdateCommunityPostBody,
} from "src/community/schemas/community.schema";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

@Injectable()
export class CommunityService {
  constructor(
    private readonly communityRepository: CommunityRepository,
    private readonly settingsService: SettingsService,
  ) {}

  private assertNoBlockedWords(text: string, blockedWords: string[]) {
    if (!blockedWords.length) return;

    const plainText = stripHtml(text).toLowerCase();
    const found = blockedWords.find((word) => word && plainText.includes(word.toLowerCase()));

    if (found) {
      throw new BadRequestException("communityView.errors.blockedWordDetected");
    }
  }

  private hasModeratePermission(currentUser: CurrentUserType) {
    return hasPermission(currentUser.permissions, PERMISSIONS.COMMUNITY_MODERATE);
  }

  private async assertForumEnabled() {
    const { communityForumEnabled } = await this.settingsService.getCommunityModerationSettings();

    if (!communityForumEnabled) {
      throw new NotFoundException("communityView.errors.forumDisabled");
    }
  }

  async listPosts(
    label: string | undefined,
    sort: CommunitySort = COMMUNITY_SORT_OPTIONS.NEWEST,
    page: number,
    perPage: number,
    currentUser: CurrentUserType,
  ) {
    await this.assertForumEnabled();

    return this.communityRepository.listPosts(currentUser.userId, label, sort, page, perPage);
  }

  async getPost(postId: UUIDType, currentUser: CurrentUserType) {
    await this.assertForumEnabled();

    const post = await this.communityRepository.getPostById(postId, currentUser.userId);

    if (!post) throw new NotFoundException("communityView.errors.postNotFound");

    return post;
  }

  async createPost(data: CreateCommunityPostBody, currentUser: CurrentUserType) {
    await this.assertForumEnabled();

    const { communityBlockedWords, communityMaxPostsPerDay } =
      await this.settingsService.getCommunityModerationSettings();

    this.assertNoBlockedWords(`${data.title} ${data.content}`, communityBlockedWords);

    const postsToday = await this.communityRepository.countPostsByAuthorLast24h(currentUser.userId);

    if (postsToday >= communityMaxPostsPerDay) {
      throw new BadRequestException("communityView.errors.maxPostsPerDayReached");
    }

    return this.communityRepository.createPost({ ...data, authorId: currentUser.userId });
  }

  async updatePost(postId: UUIDType, data: UpdateCommunityPostBody, currentUser: CurrentUserType) {
    const post = await this.communityRepository.getPostAuthorId(postId);

    if (!post) throw new NotFoundException("communityView.errors.postNotFound");

    const canManageOwn = hasPermission(
      currentUser.permissions,
      PERMISSIONS.COMMUNITY_POST_MANAGE_OWN,
    );
    const isModerator = this.hasModeratePermission(currentUser);
    const isOwner = post.authorId === currentUser.userId;

    if (!isModerator && !(canManageOwn && isOwner)) {
      throw new ForbiddenException({ message: "common.toast.noAccess" });
    }

    if (data.title || data.content) {
      const { communityBlockedWords } = await this.settingsService.getCommunityModerationSettings();

      this.assertNoBlockedWords(`${data.title ?? ""} ${data.content ?? ""}`, communityBlockedWords);
    }

    return this.communityRepository.updatePost(postId, data);
  }

  async deletePost(postId: UUIDType, currentUser: CurrentUserType) {
    const post = await this.communityRepository.getPostAuthorId(postId);

    if (!post) throw new NotFoundException("communityView.errors.postNotFound");

    const canManageOwn = hasPermission(
      currentUser.permissions,
      PERMISSIONS.COMMUNITY_POST_MANAGE_OWN,
    );
    const isModerator = this.hasModeratePermission(currentUser);
    const isOwner = post.authorId === currentUser.userId;

    if (!isModerator && !(canManageOwn && isOwner)) {
      throw new ForbiddenException({ message: "common.toast.noAccess" });
    }

    await this.communityRepository.deletePost(postId);
  }

  async setPinned(postId: UUIDType, pinned: boolean, currentUser: CurrentUserType) {
    if (!this.hasModeratePermission(currentUser)) {
      throw new ForbiddenException({ message: "common.toast.noAccess" });
    }

    const post = await this.communityRepository.getPostAuthorId(postId);

    if (!post) throw new NotFoundException("communityView.errors.postNotFound");

    await this.communityRepository.setPostPinned(postId, pinned);
  }

  async setLocked(postId: UUIDType, locked: boolean, currentUser: CurrentUserType) {
    if (!this.hasModeratePermission(currentUser)) {
      throw new ForbiddenException({ message: "common.toast.noAccess" });
    }

    const post = await this.communityRepository.getPostAuthorId(postId);

    if (!post) throw new NotFoundException("communityView.errors.postNotFound");

    await this.communityRepository.setPostLocked(postId, locked);
  }

  async listComments(postId: UUIDType, currentUser: CurrentUserType) {
    const post = await this.communityRepository.getPostAuthorId(postId);

    if (!post) throw new NotFoundException("communityView.errors.postNotFound");

    return this.communityRepository.listComments(postId, currentUser.userId);
  }

  async createComment(
    postId: UUIDType,
    data: CreateCommunityCommentBody,
    currentUser: CurrentUserType,
  ) {
    const post = await this.communityRepository.getPostAuthorId(postId);

    if (!post) throw new NotFoundException("communityView.errors.postNotFound");
    if (post.locked) throw new BadRequestException("communityView.errors.postLocked");

    const { communityBlockedWords } = await this.settingsService.getCommunityModerationSettings();

    this.assertNoBlockedWords(data.content, communityBlockedWords);

    return this.communityRepository.createComment({
      postId,
      authorId: currentUser.userId,
      content: data.content,
    });
  }

  async deleteComment(commentId: UUIDType, currentUser: CurrentUserType) {
    const comment = await this.communityRepository.getCommentAuthorId(commentId);

    if (!comment) throw new NotFoundException("communityView.errors.commentNotFound");

    const canManageOwn = hasPermission(
      currentUser.permissions,
      PERMISSIONS.COMMUNITY_POST_MANAGE_OWN,
    );
    const isModerator = this.hasModeratePermission(currentUser);
    const isOwner = comment.authorId === currentUser.userId;

    if (!isModerator && !(canManageOwn && isOwner)) {
      throw new ForbiddenException({ message: "common.toast.noAccess" });
    }

    await this.communityRepository.deleteComment(commentId);
  }

  async vote(
    targetType: CommunityVoteTargetType,
    targetId: UUIDType,
    currentUser: CurrentUserType,
  ) {
    if (targetType === COMMUNITY_VOTE_TARGET_TYPES.POST) {
      const post = await this.communityRepository.getPostAuthorId(targetId);
      if (!post) throw new NotFoundException("communityView.errors.postNotFound");
    } else {
      const comment = await this.communityRepository.getCommentAuthorId(targetId);
      if (!comment) throw new NotFoundException("communityView.errors.commentNotFound");
    }

    return this.communityRepository.toggleVote(currentUser.userId, targetType, targetId);
  }
}
