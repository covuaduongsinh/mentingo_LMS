import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema, UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { PermissionsGuard } from "src/common/guards/permissions.guard";
import { CurrentUserType } from "src/common/types/current-user.type";
import { COMMUNITY_SORT_OPTIONS } from "src/community/community.constants";
import {
  communityCommentListSchema,
  communityLabelSchema,
  communityPostListSchema,
  communityPostSchema,
  communitySortSchema,
  communityVoteTargetTypeSchema,
  createCommunityCommentBodySchema,
  createCommunityPostBodySchema,
  type CommunitySort,
  type CommunityVoteTargetType,
  type CreateCommunityCommentBody,
  type CreateCommunityPostBody,
  type UpdateCommunityPostBody,
  updateCommunityPostBodySchema,
} from "src/community/schemas/community.schema";

import { CommunityService } from "./community.service";

@UseGuards(PermissionsGuard)
@Controller("community")
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get("posts")
  @RequirePermission(PERMISSIONS.COMMUNITY_READ)
  @Validate({
    request: [
      { type: "query", name: "label", schema: Type.Optional(communityLabelSchema) },
      { type: "query", name: "sort", schema: Type.Optional(communitySortSchema) },
      { type: "query", name: "page", schema: Type.Optional(Type.Number({ minimum: 1 })) },
      { type: "query", name: "perPage", schema: Type.Optional(Type.Number({ minimum: 1 })) },
    ],
    response: communityPostListSchema,
  })
  async listPosts(
    @Query("label") label: string | undefined,
    @Query("sort") sort: CommunitySort | undefined,
    @Query("page") page: number | undefined,
    @Query("perPage") perPage: number | undefined,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return this.communityService.listPosts(
      label,
      sort ?? COMMUNITY_SORT_OPTIONS.NEWEST,
      page ?? 1,
      perPage ?? 20,
      currentUser,
    );
  }

  @Get("posts/:id")
  @RequirePermission(PERMISSIONS.COMMUNITY_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(communityPostSchema),
  })
  async getPost(@Param("id") id: UUIDType, @CurrentUser() currentUser: CurrentUserType) {
    return new BaseResponse(await this.communityService.getPost(id, currentUser));
  }

  @Post("posts")
  @RequirePermission(PERMISSIONS.COMMUNITY_POST_CREATE)
  @Validate({
    request: [{ type: "body", schema: createCommunityPostBodySchema }],
    response: baseResponse(communityPostSchema),
  })
  async createPost(
    @Body() data: CreateCommunityPostBody,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return new BaseResponse(await this.communityService.createPost(data, currentUser));
  }

  @Patch("posts/:id")
  @RequirePermission(PERMISSIONS.COMMUNITY_POST_MANAGE_OWN, PERMISSIONS.COMMUNITY_MODERATE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: updateCommunityPostBodySchema },
    ],
    response: baseResponse(communityPostSchema),
  })
  async updatePost(
    @Param("id") id: UUIDType,
    @Body() data: UpdateCommunityPostBody,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return new BaseResponse(await this.communityService.updatePost(id, data, currentUser));
  }

  @Delete("posts/:id")
  @RequirePermission(PERMISSIONS.COMMUNITY_POST_MANAGE_OWN, PERMISSIONS.COMMUNITY_MODERATE)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
  })
  async deletePost(@Param("id") id: UUIDType, @CurrentUser() currentUser: CurrentUserType) {
    await this.communityService.deletePost(id, currentUser);
  }

  @Post("posts/:id/pin")
  @RequirePermission(PERMISSIONS.COMMUNITY_MODERATE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: Type.Object({ pinned: Type.Boolean() }) },
    ],
  })
  async setPinned(
    @Param("id") id: UUIDType,
    @Body() data: { pinned: boolean },
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    await this.communityService.setPinned(id, data.pinned, currentUser);
  }

  @Post("posts/:id/lock")
  @RequirePermission(PERMISSIONS.COMMUNITY_MODERATE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: Type.Object({ locked: Type.Boolean() }) },
    ],
  })
  async setLocked(
    @Param("id") id: UUIDType,
    @Body() data: { locked: boolean },
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    await this.communityService.setLocked(id, data.locked, currentUser);
  }

  @Get("posts/:id/comments")
  @RequirePermission(PERMISSIONS.COMMUNITY_READ)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(communityCommentListSchema),
  })
  async listComments(@Param("id") id: UUIDType, @CurrentUser() currentUser: CurrentUserType) {
    return new BaseResponse(await this.communityService.listComments(id, currentUser));
  }

  @Post("posts/:id/comments")
  @RequirePermission(PERMISSIONS.COMMUNITY_POST_CREATE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: createCommunityCommentBodySchema },
    ],
  })
  async createComment(
    @Param("id") id: UUIDType,
    @Body() data: CreateCommunityCommentBody,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    await this.communityService.createComment(id, data, currentUser);
  }

  @Delete("comments/:id")
  @RequirePermission(PERMISSIONS.COMMUNITY_POST_MANAGE_OWN, PERMISSIONS.COMMUNITY_MODERATE)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
  })
  async deleteComment(@Param("id") id: UUIDType, @CurrentUser() currentUser: CurrentUserType) {
    await this.communityService.deleteComment(id, currentUser);
  }

  @Post("vote")
  @RequirePermission(PERMISSIONS.COMMUNITY_POST_CREATE)
  @Validate({
    request: [
      {
        type: "body",
        schema: Type.Object({
          targetType: communityVoteTargetTypeSchema,
          targetId: UUIDSchema,
        }),
      },
    ],
  })
  async vote(
    @Body() data: { targetType: CommunityVoteTargetType; targetId: UUIDType },
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return this.communityService.vote(data.targetType, data.targetId, currentUser);
  }
}
