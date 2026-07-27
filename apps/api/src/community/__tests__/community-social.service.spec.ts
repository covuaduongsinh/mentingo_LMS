import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { CommunitySocialService } from "../community-social.service";

import type { CommunitySocialRepository } from "../community-social.repository";
import type { CurrentUserType } from "src/common/types/current-user.type";
import type { FileService } from "src/file/file.service";
import type { RealtimePublisher } from "src/websocket/realtime.publisher";

const ACTOR_ID = "actor-1";
const TARGET_ID = "target-1";
const TENANT_ID = "tenant-1";
const CONVERSATION_ID = "conversation-1";

function buildActor(overrides: Partial<CurrentUserType> = {}): CurrentUserType {
  return {
    userId: ACTOR_ID,
    tenantId: TENANT_ID,
    permissions: [],
    ...overrides,
  } as CurrentUserType;
}

describe("CommunitySocialService", () => {
  let repo: jest.Mocked<CommunitySocialRepository>;
  let fileService: jest.Mocked<FileService>;
  let realtimePublisher: jest.Mocked<RealtimePublisher>;
  let service: CommunitySocialService;

  beforeEach(() => {
    repo = {
      getManagedStatus: jest.fn().mockResolvedValue(false),
      sharesClassmateRelationship: jest.fn().mockResolvedValue(false),
      getOrCreateConversation: jest
        .fn()
        .mockResolvedValue({ id: CONVERSATION_ID, userAId: ACTOR_ID, userBId: TARGET_ID }),
      getConversationParticipants: jest
        .fn()
        .mockResolvedValue({ userAId: ACTOR_ID, userBId: TARGET_ID }),
      insertMessage: jest.fn().mockResolvedValue({ id: "message-1", content: "hi" }),
      touchConversationLastMessageAt: jest.fn(),
      listConversationsForUser: jest.fn(),
      listMessages: jest.fn(),
      markConversationRead: jest.fn(),
      addRelationship: jest.fn(),
      removeRelationship: jest.fn(),
      getRelationshipStatus: jest.fn().mockResolvedValue({
        isFollowing: false,
        isFollowedBy: false,
        isBlocking: false,
        isBlockedBy: false,
      }),
      listTrainers: jest.fn(),
      listClassmates: jest.fn().mockResolvedValue([]),
      listMessageableCandidatesForNonManaged: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<CommunitySocialRepository>;

    fileService = {
      getFileUrl: jest.fn().mockResolvedValue("https://example.com/avatar.png"),
    } as unknown as jest.Mocked<FileService>;

    realtimePublisher = {
      emitToRoom: jest.fn(),
      emitToAll: jest.fn(),
      emitToRoomWithAck: jest.fn(),
    } as unknown as jest.Mocked<RealtimePublisher>;

    service = new CommunitySocialService(repo, fileService, realtimePublisher);
  });

  describe("sendMessage", () => {
    it("rejects messaging oneself", async () => {
      await expect(service.sendMessage(buildActor(), ACTOR_ID, "hi")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects when either side has blocked the other", async () => {
      repo.getRelationshipStatus.mockResolvedValue({
        isFollowing: false,
        isFollowedBy: false,
        isBlocking: true,
        isBlockedBy: false,
      });

      await expect(service.sendMessage(buildActor(), TARGET_ID, "hi")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("rejects a managed account messaging someone outside their class", async () => {
      repo.getManagedStatus.mockResolvedValueOnce(true); // actor is managed
      repo.sharesClassmateRelationship.mockResolvedValue(false);

      await expect(service.sendMessage(buildActor(), TARGET_ID, "hi")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("allows a managed account to message a classmate, creates the message, and notifies realtime", async () => {
      repo.getManagedStatus.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      repo.sharesClassmateRelationship.mockResolvedValue(true);

      const message = await service.sendMessage(buildActor(), TARGET_ID, "hi there");

      expect(message).toEqual({ id: "message-1", content: "hi" });
      expect(repo.getOrCreateConversation).toHaveBeenCalledWith(ACTOR_ID, TARGET_ID, TENANT_ID);
      expect(repo.insertMessage).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: CONVERSATION_ID, senderId: ACTOR_ID }),
      );
      expect(repo.touchConversationLastMessageAt).toHaveBeenCalledWith(
        CONVERSATION_ID,
        expect.any(Date),
      );
      expect(realtimePublisher.emitToRoom).toHaveBeenCalledWith(
        "community:new-message",
        `user:${TARGET_ID}`,
        expect.objectContaining({ conversationId: CONVERSATION_ID }),
      );
    });

    it("allows two non-managed users to message freely", async () => {
      await expect(service.sendMessage(buildActor(), TARGET_ID, "hi")).resolves.toBeDefined();
    });
  });

  describe("getMessages / markRead", () => {
    it("rejects a non-participant reading a conversation", async () => {
      repo.getConversationParticipants.mockResolvedValue({
        userAId: "someone-else",
        userBId: "another-one",
      });

      await expect(service.getMessages(ACTOR_ID, CONVERSATION_ID, 1, 20)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("allows a participant to read and mark the conversation as read", async () => {
      repo.listMessages.mockResolvedValue({
        data: [],
        pagination: { page: 1, perPage: 20, totalItems: 0 },
      });

      await expect(service.getMessages(ACTOR_ID, CONVERSATION_ID, 1, 20)).resolves.toBeDefined();
      await service.markRead(ACTOR_ID, CONVERSATION_ID);
      expect(repo.markConversationRead).toHaveBeenCalledWith(CONVERSATION_ID, ACTOR_ID);
    });
  });

  describe("follow / block", () => {
    it("rejects following oneself", async () => {
      await expect(service.follow(buildActor(), ACTOR_ID)).rejects.toThrow(BadRequestException);
    });

    it("adds a follow relationship", async () => {
      await service.follow(buildActor(), TARGET_ID);
      expect(repo.addRelationship).toHaveBeenCalledWith(ACTOR_ID, TARGET_ID, "follow", TENANT_ID);
    });

    it("blocking someone clears any existing follow relationship in either direction", async () => {
      await service.block(buildActor(), TARGET_ID);

      expect(repo.addRelationship).toHaveBeenCalledWith(ACTOR_ID, TARGET_ID, "block", TENANT_ID);
      expect(repo.removeRelationship).toHaveBeenCalledWith(ACTOR_ID, TARGET_ID, "follow");
      expect(repo.removeRelationship).toHaveBeenCalledWith(TARGET_ID, ACTOR_ID, "follow");
    });

    it("rejects a managed account following someone outside their class", async () => {
      repo.getManagedStatus.mockResolvedValueOnce(true);
      repo.sharesClassmateRelationship.mockResolvedValue(false);

      await expect(service.follow(buildActor(), TARGET_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("listMessageableUsers", () => {
    it("returns classmates only for a managed account", async () => {
      repo.getManagedStatus.mockResolvedValue(true);
      repo.listClassmates.mockResolvedValue([
        { userId: TARGET_ID, firstName: "A", lastName: "B", avatarReference: null },
      ]);

      const result = await service.listMessageableUsers(buildActor());

      expect(repo.listClassmates).toHaveBeenCalledWith(ACTOR_ID);
      expect(repo.listMessageableCandidatesForNonManaged).not.toHaveBeenCalled();
      expect(result).toEqual([
        { userId: TARGET_ID, firstName: "A", lastName: "B", avatarUrl: null },
      ]);
    });

    it("returns the wider candidate list for a non-managed account", async () => {
      repo.getManagedStatus.mockResolvedValue(false);
      repo.listMessageableCandidatesForNonManaged.mockResolvedValue([
        { userId: TARGET_ID, firstName: "A", lastName: "B", avatarReference: "key" },
      ]);

      const result = await service.listMessageableUsers(buildActor());

      expect(repo.listMessageableCandidatesForNonManaged).toHaveBeenCalledWith(ACTOR_ID);
      expect(result[0].avatarUrl).toBe("https://example.com/avatar.png");
    });
  });

  describe("listTrainers", () => {
    it("resolves avatar URLs for each trainer", async () => {
      repo.listTrainers.mockResolvedValue({
        data: [
          {
            userId: TARGET_ID,
            username: "coach",
            firstName: "Coach",
            lastName: "K",
            avatarReference: "key",
            bio: "Chess coach",
          },
        ],
        pagination: { page: 1, perPage: 20, totalItems: 1 },
      });

      const result = await service.listTrainers(1, 20);

      expect(result.data[0]).toEqual({
        userId: TARGET_ID,
        username: "coach",
        firstName: "Coach",
        lastName: "K",
        bio: "Chess coach",
        avatarUrl: "https://example.com/avatar.png",
      });
    });
  });
});
