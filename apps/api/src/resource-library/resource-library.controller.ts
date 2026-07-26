import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes } from "@nestjs/swagger";
import {
  ALLOWED_EXCEL_FILE_TYPES,
  ALLOWED_LESSON_IMAGE_FILE_TYPES,
  ALLOWED_PDF_FILE_TYPES,
  ALLOWED_PRESENTATION_FILE_TYPES,
  ALLOWED_VIDEO_FILE_TYPES,
  ALLOWED_WORD_FILE_TYPES,
  type SupportedLanguages,
} from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import {
  BaseResponse,
  baseResponse,
  PaginatedResponse,
  paginatedResponse,
  UUIDSchema,
  type UUIDType,
} from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";
import { supportedLanguagesSchema } from "src/courses/schemas/course.schema";
import { MAX_VIDEO_SIZE } from "src/file/file.constants";
import { getBaseFileTypePipe } from "src/file/utils/baseFileTypePipe";
import { buildFileTypeRegex } from "src/file/utils/fileTypeRegex";
import { ValidateMultipartPipe } from "src/utils/pipes/validateMultipartPipe";

import { RESOURCE_LIBRARY_PERMISSIONS } from "./resource-library.constants";
import { ResourceLibraryService } from "./resource-library.service";
import {
  assetLibraryAssetSchema,
  assetLibraryUsageSchema,
  createFolderBodySchema,
  deleteAssetResponseSchema,
  deleteFolderResponseSchema,
  linkAssetBodySchema,
  linkAssetResponseSchema,
  listFoldersResponseSchema,
  moveAssetBodySchema,
  moveAssetResponseSchema,
  resourceLibraryAssetTypeSchema,
  unlinkAssetBodySchema,
  unlinkAssetResponseSchema,
  updateFolderBodySchema,
  uploadAssetBodySchema,
  uploadAssetResponseSchema,
  type AssetLibraryAsset,
  type AssetLibraryUsage,
  type CreateFolderBody,
  type DeleteAssetResponse,
  type DeleteFolderResponse,
  type LinkAssetBody,
  type LinkAssetResponse,
  type MoveAssetBody,
  type MoveAssetResponse,
  type ResourceFolder,
  type ResourceLibraryAssetType,
  type UnlinkAssetBody,
  type UnlinkAssetResponse,
  type UpdateFolderBody,
  type UploadAssetBody,
  type UploadAssetResponse,
} from "./schemas/resource-library.schema";

@Controller("resource-library")
export class ResourceLibraryController {
  constructor(private readonly resourceLibraryService: ResourceLibraryService) {}

  @Get("assets")
  @RequirePermission(...RESOURCE_LIBRARY_PERMISSIONS)
  @Validate({
    request: [
      { type: "query", name: "page", schema: Type.Optional(Type.Number({ minimum: 1 })) },
      { type: "query", name: "perPage", schema: Type.Optional(Type.Number({ minimum: 1 })) },
      { type: "query", name: "search", schema: Type.Optional(Type.String()) },
      { type: "query", name: "type", schema: Type.Optional(resourceLibraryAssetTypeSchema) },
      { type: "query", name: "language", schema: Type.Optional(supportedLanguagesSchema) },
      { type: "query", name: "folderId", schema: Type.Optional(Type.String()) },
    ],
    response: paginatedResponse(Type.Array(assetLibraryAssetSchema)),
  })
  async getAssets(
    @Query("page") page?: number,
    @Query("perPage") perPage?: number,
    @Query("search") search?: string,
    @Query("type") type?: ResourceLibraryAssetType,
    @Query("language") language?: SupportedLanguages,
    @Query("folderId") folderId?: string,
  ): Promise<PaginatedResponse<AssetLibraryAsset[]>> {
    const result = await this.resourceLibraryService.getAssets({
      page,
      perPage,
      search,
      type,
      language,
      folderId,
    });

    return new PaginatedResponse(result);
  }

  @Get("folders")
  @RequirePermission(...RESOURCE_LIBRARY_PERMISSIONS)
  @Validate({
    request: [{ type: "query", name: "parentFolderId", schema: Type.Optional(UUIDSchema) }],
    response: baseResponse(listFoldersResponseSchema),
  })
  async listFolders(
    @Query("parentFolderId") parentFolderId?: UUIDType,
  ): Promise<BaseResponse<ResourceFolder[]>> {
    const folders = await this.resourceLibraryService.listFolders(parentFolderId);

    return new BaseResponse(folders);
  }

  @Post("folders")
  @RequirePermission(...RESOURCE_LIBRARY_PERMISSIONS)
  @Validate({
    request: [{ type: "body", schema: createFolderBodySchema }],
    response: baseResponse(Type.Object({ id: UUIDSchema })),
  })
  async createFolder(@Body() body: CreateFolderBody): Promise<BaseResponse<{ id: UUIDType }>> {
    const folder = await this.resourceLibraryService.createFolder(body);

    return new BaseResponse(folder);
  }

  @Patch("folders/:id")
  @RequirePermission(...RESOURCE_LIBRARY_PERMISSIONS)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: updateFolderBodySchema },
    ],
    response: baseResponse(Type.Object({ id: UUIDSchema })),
  })
  async updateFolder(
    @Param("id") id: UUIDType,
    @Body() body: UpdateFolderBody,
  ): Promise<BaseResponse<{ id: UUIDType }>> {
    const folder = await this.resourceLibraryService.updateFolder(id, body);

    return new BaseResponse(folder);
  }

  @Delete("folders/:id")
  @RequirePermission(...RESOURCE_LIBRARY_PERMISSIONS)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(deleteFolderResponseSchema),
  })
  async deleteFolder(@Param("id") id: UUIDType): Promise<BaseResponse<DeleteFolderResponse>> {
    const result = await this.resourceLibraryService.deleteFolder(id);

    return new BaseResponse(result);
  }

  @Patch("assets/:id/move")
  @RequirePermission(...RESOURCE_LIBRARY_PERMISSIONS)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: moveAssetBodySchema },
    ],
    response: baseResponse(moveAssetResponseSchema),
  })
  async moveAsset(
    @Param("id") id: UUIDType,
    @Body() body: MoveAssetBody,
  ): Promise<BaseResponse<MoveAssetResponse>> {
    const result = await this.resourceLibraryService.moveAsset(id, body.folderId);

    return new BaseResponse(result);
  }

  @Get("assets/:id/usages")
  @RequirePermission(...RESOURCE_LIBRARY_PERMISSIONS)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "query", name: "language", schema: Type.Optional(supportedLanguagesSchema) },
    ],
    response: baseResponse(Type.Array(assetLibraryUsageSchema)),
  })
  async getAssetUsages(
    @Param("id") id: UUIDType,
    @Query("language") language?: SupportedLanguages,
  ): Promise<BaseResponse<AssetLibraryUsage[]>> {
    const usages = await this.resourceLibraryService.getAssetUsages(id, language);

    return new BaseResponse(usages);
  }

  @Post("assets/:id/link")
  @RequirePermission(...RESOURCE_LIBRARY_PERMISSIONS)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: linkAssetBodySchema },
    ],
    response: baseResponse(linkAssetResponseSchema),
  })
  async linkAsset(
    @Param("id") id: UUIDType,
    @Body() body: LinkAssetBody,
  ): Promise<BaseResponse<LinkAssetResponse>> {
    const result = await this.resourceLibraryService.linkAsset(id, body);

    return new BaseResponse(result);
  }

  @Post("assets/:id/unlink")
  @RequirePermission(...RESOURCE_LIBRARY_PERMISSIONS)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: unlinkAssetBodySchema },
    ],
    response: baseResponse(unlinkAssetResponseSchema),
  })
  async unlinkAsset(
    @Param("id") id: UUIDType,
    @Body() body: UnlinkAssetBody,
  ): Promise<BaseResponse<UnlinkAssetResponse>> {
    const result = await this.resourceLibraryService.unlinkAsset(id, body);

    return new BaseResponse(result);
  }

  @Post("assets/upload")
  @RequirePermission(...RESOURCE_LIBRARY_PERMISSIONS)
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: uploadAssetBodySchema })
  @Validate({
    request: [{ type: "body", schema: uploadAssetBodySchema }],
    response: baseResponse(uploadAssetResponseSchema),
  })
  async uploadAsset(
    @Body(new ValidateMultipartPipe(uploadAssetBodySchema)) body: UploadAssetBody,
    @UploadedFile(
      "file",
      getBaseFileTypePipe(
        buildFileTypeRegex([
          ...ALLOWED_PDF_FILE_TYPES,
          ...ALLOWED_EXCEL_FILE_TYPES,
          ...ALLOWED_WORD_FILE_TYPES,
          ...ALLOWED_VIDEO_FILE_TYPES,
          ...ALLOWED_LESSON_IMAGE_FILE_TYPES,
          ...ALLOWED_PRESENTATION_FILE_TYPES,
        ]),
        MAX_VIDEO_SIZE,
      ).build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: Express.Multer.File,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<BaseResponse<UploadAssetResponse>> {
    const result = await this.resourceLibraryService.uploadAsset(file, body, currentUser);

    return new BaseResponse(result);
  }

  @Delete("assets/:id")
  @RequirePermission(...RESOURCE_LIBRARY_PERMISSIONS)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(deleteAssetResponseSchema),
  })
  async deleteAsset(@Param("id") id: UUIDType): Promise<BaseResponse<DeleteAssetResponse>> {
    const result = await this.resourceLibraryService.deleteAsset(id);

    return new BaseResponse(result);
  }
}
