import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";

import { CommunityService } from "../community.service";

import type { CommunityRepository } from "../community.repository";
import type { CurrentUserType } from "src/common/types/current-user.type";
import type { SettingsService } from "src/settings/settings.service";

const AUTHOR_ID = "author-1";
const POST_ID = "post-1";

function buildCurrentUser(overrides: Partial<CurrentUserType> = {}): CurrentUserType {
  return {
    userId: AUTHOR_ID,
    permissions: [PERMISSIONS.COMMUNITY_READ, PERMISSIONS.COMMUNITY_POST_CREATE],
    ...overrides,
  } as CurrentUserType;
}

describe("CommunityService", () => {
  let repo: jest.Mocked<CommunityRepository>;
  let settingsService: jest.Mocked<SettingsService>;
  let service: CommunityService;

  beforeEach(() => {
    repo = {
      listPosts: jest.fn(),
      getPostById: jest.fn(),
      getPostAuthorId: jest.fn(),
      createPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn(),
      setPostPinned: jest.fn(),
      setPostLocked: jest.fn(),
      listComments: jest.fn(),
      getCommentAuthorId: jest.fn(),
      createComment: jest.fn(),
      deleteComment: jest.fn(),
      countPostsByAuthorLast24h: jest.fn(),
      toggleVote: jest.fn(),
    } as unknown as jest.Mocked<CommunityRepository>;

    settingsService = {
      getCommunityModerationSettings: jest.fn().mockResolvedValue({
        communityForumEnabled: true,
        communityBlockedWords: [],
        communityMaxPostsPerDay: 10,
      }),
    } as unknown as jest.Mocked<SettingsService>;

    service = new CommunityService(repo, settingsService);
  });

  describe("listPosts / getPost", () => {
    it("rejects when the forum is disabled", async () => {
      settingsService.getCommunityModerationSettings.mockResolvedValue({
        communityForumEnabled: false,
        communityBlockedWords: [],
        communityMaxPostsPerDay: 10,
      });

      await expect(
        service.listPosts(undefined, "newest", 1, 20, buildCurrentUser()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("createPost", () => {
    it("rejects posts containing a blocked word", async () => {
      settingsService.getCommunityModerationSettings.mockResolvedValue({
        communityForumEnabled: true,
        communityBlockedWords: ["spam"],
        communityMaxPostsPerDay: 10,
      });

      await expect(
        service.createPost(
          { title: "Buy now", content: "This is spam content", label: "general_discussion" },
          buildCurrentUser(),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(repo.createPost).not.toHaveBeenCalled();
    });

    it("rejects once the daily post limit is reached", async () => {
      repo.countPostsByAuthorLast24h.mockResolvedValue(10);

      await expect(
        service.createPost(
          { title: "Hello", content: "World", label: "general_discussion" },
          buildCurrentUser(),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(repo.createPost).not.toHaveBeenCalled();
    });

    it("creates the post when under quota and clean of blocked words", async () => {
      repo.countPostsByAuthorLast24h.mockResolvedValue(2);
      repo.createPost.mockResolvedValue({ id: POST_ID } as never);

      const result = await service.createPost(
        { title: "Hello", content: "World", label: "general_discussion" },
        buildCurrentUser(),
      );

      expect(result).toEqual({ id: POST_ID });
      expect(repo.createPost).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: AUTHOR_ID }),
      );
    });
  });

  describe("updatePost / deletePost ownership", () => {
    it("allows the owner with manage_own permission", async () => {
      repo.getPostAuthorId.mockResolvedValue({ authorId: AUTHOR_ID, locked: false } as never);
      repo.updatePost.mockResolvedValue({ id: POST_ID } as never);

      await service.updatePost(
        POST_ID,
        { title: "Updated" },
        buildCurrentUser({ permissions: [PERMISSIONS.COMMUNITY_POST_MANAGE_OWN] }),
      );

      expect(repo.updatePost).toHaveBeenCalled();
    });

    it("forbids a non-owner without moderate permission", async () => {
      repo.getPostAuthorId.mockResolvedValue({ authorId: "someone-else", locked: false } as never);

      await expect(
        service.updatePost(
          POST_ID,
          { title: "Updated" },
          buildCurrentUser({ permissions: [PERMISSIONS.COMMUNITY_POST_MANAGE_OWN] }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows a moderator regardless of ownership", async () => {
      repo.getPostAuthorId.mockResolvedValue({ authorId: "someone-else", locked: false } as never);

      await service.deletePost(
        POST_ID,
        buildCurrentUser({ permissions: [PERMISSIONS.COMMUNITY_MODERATE] }),
      );

      expect(repo.deletePost).toHaveBeenCalledWith(POST_ID);
    });
  });

  describe("setPinned / setLocked", () => {
    it("requires moderate permission", async () => {
      await expect(
        service.setPinned(POST_ID, true, buildCurrentUser({ permissions: [] })),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("createComment", () => {
    it("rejects when the post is locked", async () => {
      repo.getPostAuthorId.mockResolvedValue({ authorId: AUTHOR_ID, locked: true } as never);

      await expect(
        service.createComment(POST_ID, { content: "hi" }, buildCurrentUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates the comment when the post is unlocked", async () => {
      repo.getPostAuthorId.mockResolvedValue({ authorId: AUTHOR_ID, locked: false } as never);
      repo.createComment.mockResolvedValue({ id: "comment-1" } as never);

      const result = await service.createComment(POST_ID, { content: "hi" }, buildCurrentUser());

      expect(result).toEqual({ id: "comment-1" });
    });
  });

  describe("vote", () => {
    it("throws when voting on a nonexistent post", async () => {
      repo.getPostAuthorId.mockResolvedValue(undefined as never);

      await expect(service.vote("post", POST_ID, buildCurrentUser())).rejects.toThrow(
        NotFoundException,
      );
    });

    it("toggles the vote when the post exists", async () => {
      repo.getPostAuthorId.mockResolvedValue({ authorId: AUTHOR_ID, locked: false } as never);
      repo.toggleVote.mockResolvedValue({ hasVoted: true } as never);

      const result = await service.vote("post", POST_ID, buildCurrentUser());

      expect(result).toEqual({ hasVoted: true });
    });
  });
});
