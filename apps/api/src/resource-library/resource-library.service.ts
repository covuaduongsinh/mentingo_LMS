import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ENTITY_TYPES, VIDEO_EMBED_PROVIDERS, type SupportedLanguages } from "@repo/shared";

import { DatabasePg } from "src/common";
import { parsePagination } from "src/common/pagination";
import { RESOURCE_CATEGORIES, RESOURCE_RELATIONSHIP_TYPES } from "src/file/file.constants";
import { FileService } from "src/file/file.service";
import { getVideoProviderFromReference } from "src/file/utils/videoProvider";
import { ResourceLibraryRepository } from "src/resource-library/resource-library.repository";
import { DB } from "src/storage/db/db.providers";

import {
  extractResourceIdsFromRichText,
  getLocalizedRichTextEntries,
  removeResourceReferencesFromRichText,
} from "./resource-library.utils";

import type {
  AssetLibraryAsset,
  CreateFolderBody,
  LinkAssetBody,
  MoveAssetResponse,
  ResourceFolder,
  ResourceLibraryAssetType,
  RichTextAssetEntityType,
  UnlinkAssetBody,
  UpdateFolderBody,
  UploadAssetBody,
} from "./schemas/resource-library.schema";
import type { Pagination, UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

@Injectable()
export class ResourceLibraryService {
  constructor(
    private readonly fileService: FileService,
    private readonly resourceLibraryRepository: ResourceLibraryRepository,
    @Inject(DB) private readonly db: DatabasePg,
  ) {}

  async getAssets(params: {
    page?: number;
    perPage?: number;
    search?: string;
    type?: ResourceLibraryAssetType;
    language?: SupportedLanguages;
    folderId?: string;
  }): Promise<{
    data: AssetLibraryAsset[];
    pagination: Pagination;
    appliedFilters: { search?: string; type?: ResourceLibraryAssetType };
  }> {
    const { page, perPage } = parsePagination(params.page, params.perPage);

    const { rows, totalItems } = await this.resourceLibraryRepository.getAssets({
      page,
      perPage,
      search: params.search,
      type: params.type,
      language: params.language,
      folderId: params.folderId,
    });

    return {
      data: rows.map((asset) => {
        const videoProvider = getVideoProviderFromReference(asset.reference);

        return {
          ...asset,
          videoProvider:
            asset.type === "video" || videoProvider === VIDEO_EMBED_PROVIDERS.BUNNY
              ? videoProvider
              : undefined,
        };
      }),
      pagination: { totalItems, page, perPage },
      appliedFilters: {
        search: params.search,
        type: params.type,
      },
    };
  }

  async getAssetUsages(resourceId: UUIDType, language?: SupportedLanguages) {
    await this.assertAssetExists(resourceId);

    const relationUsages = await this.resourceLibraryRepository.getAssetRelationUsages(
      resourceId,
      language,
    );
    const contentUsages = await this.resourceLibraryRepository.getAssetContentReferenceUsages(
      resourceId,
      language,
    );
    const usageByEntity = new Map<string, (typeof relationUsages)[number]>();

    [...contentUsages, ...relationUsages].forEach((usage) => {
      usageByEntity.set(`${usage.entityType}:${usage.entityId}`, usage);
    });

    return Array.from(usageByEntity.values());
  }

  async linkAsset(resourceId: UUIDType, body: LinkAssetBody) {
    await this.assertAssetExists(resourceId);
    await this.assertEntityExists(body.entityType, body.entityId);

    const relationshipType = body.relationshipType ?? RESOURCE_RELATIONSHIP_TYPES.ATTACHMENT;

    await this.resourceLibraryRepository.createAssetRelation({
      resourceId,
      entityId: body.entityId,
      entityType: body.entityType,
      relationshipType,
    });

    return {
      resourceId,
      url: this.buildResourceUrl(resourceId, body.entityType),
    };
  }

  async unlinkAsset(resourceId: UUIDType, body: UnlinkAssetBody) {
    await this.assertAssetExists(resourceId);

    const relationshipType = body.relationshipType ?? RESOURCE_RELATIONSHIP_TYPES.ATTACHMENT;

    const deletedUsages = await this.resourceLibraryRepository.deleteAssetRelation({
      resourceId,
      entityId: body.entityId,
      entityType: body.entityType,
      relationshipType,
    });

    return {
      resourceId,
      deletedUsages,
    };
  }

  async uploadAsset(
    file: Express.Multer.File,
    body: UploadAssetBody,
    currentUser: CurrentUserType,
  ) {
    if (!file) throw new BadRequestException("resourceLibrary.error.fileRequired");

    if (body.entityId) await this.assertEntityExists(body.entityType, body.entityId);

    const result = await this.fileService.uploadResource({
      file,
      folder: body.entityId ?? body.contextId ?? "library",
      resource: this.getResourceCategory(body.entityType),
      title: { [body.language]: body.title },
      description: { [body.language]: body.description },
      currentUser,
      options: {
        contextId: body.contextId,
      },
    });

    return {
      resourceId: result.resourceId,
      url: this.buildResourceUrl(result.resourceId, body.entityType),
      fileUrl: result.fileUrl,
    };
  }

  async deleteAsset(resourceId: UUIDType) {
    await this.assertAssetExists(resourceId);

    const deletedUsages = await this.db.transaction(async (trx) => {
      const relationCount = await this.resourceLibraryRepository.countAssetRelations(
        resourceId,
        trx,
      );

      await this.removeAssetReferencesFromContent(resourceId, trx);
      await this.resourceLibraryRepository.deleteAssetRelations(resourceId, trx);
      await this.resourceLibraryRepository.archiveAsset(resourceId, trx);

      return relationCount;
    });

    return {
      message: "resourceLibrary.toast.assetDeletedSuccessfully",
      deletedUsages,
    };
  }

  async syncLessonAssetRelations(lessonId: UUIDType) {
    const description = await this.resourceLibraryRepository.getLessonContent(lessonId);

    await this.syncEntityAssetRelations({
      entityId: lessonId,
      entityType: ENTITY_TYPES.LESSON,
      contents: getLocalizedRichTextEntries(description).map(([, content]) => content),
    });
  }

  async syncArticleAssetRelations(articleId: UUIDType) {
    const content = await this.resourceLibraryRepository.getArticleContent(articleId);

    await this.syncEntityAssetRelations({
      entityId: articleId,
      entityType: ENTITY_TYPES.ARTICLES,
      contents: getLocalizedRichTextEntries(content).map(
        ([, localizedContent]) => localizedContent,
      ),
    });
  }

  async syncNewsAssetRelations(newsId: UUIDType) {
    const content = await this.resourceLibraryRepository.getNewsContent(newsId);

    await this.syncEntityAssetRelations({
      entityId: newsId,
      entityType: ENTITY_TYPES.NEWS,
      contents: getLocalizedRichTextEntries(content).map(
        ([, localizedContent]) => localizedContent,
      ),
    });
  }

  async listFolders(parentFolderId?: UUIDType | null): Promise<ResourceFolder[]> {
    if (parentFolderId) await this.assertFolderExists(parentFolderId);

    const rows = await this.resourceLibraryRepository.listFolders(parentFolderId ?? null);

    return Promise.all(
      rows.map(async (folder) => ({
        id: folder.id,
        name: folder.name,
        parentFolderId: folder.parentFolderId,
        color: folder.color as ResourceFolder["color"],
        coverResourceId: folder.coverResourceId,
        coverResourceUrl: folder.coverReference
          ? await this.fileService.getFileUrl(folder.coverReference)
          : null,
        displayOrder: folder.displayOrder,
        childFolderCount: folder.childFolderCount,
        assetCount: folder.assetCount,
        createdAt: folder.createdAt,
      })),
    );
  }

  async createFolder(body: CreateFolderBody) {
    if (body.parentFolderId) await this.assertFolderExists(body.parentFolderId);
    if (body.coverResourceId) await this.assertAssetExists(body.coverResourceId);

    return this.resourceLibraryRepository.createFolder(body);
  }

  async updateFolder(id: UUIDType, body: UpdateFolderBody) {
    await this.assertFolderExists(id);

    if (body.coverResourceId) await this.assertAssetExists(body.coverResourceId);

    if (body.parentFolderId !== undefined && body.parentFolderId !== null) {
      if (body.parentFolderId === id) {
        throw new BadRequestException("resourceLibrary.error.folderCycleDetected");
      }

      await this.assertFolderExists(body.parentFolderId);

      const ancestorChain = await this.resourceLibraryRepository.getFolderAncestorChain(
        body.parentFolderId,
      );

      if (ancestorChain.includes(id)) {
        throw new BadRequestException("resourceLibrary.error.folderCycleDetected");
      }
    }

    await this.resourceLibraryRepository.updateFolder(id, body);

    return { id };
  }

  async deleteFolder(id: UUIDType) {
    await this.assertFolderExists(id);

    const isEmpty = await this.resourceLibraryRepository.isFolderEmpty(id);

    if (!isEmpty) {
      throw new BadRequestException("resourceLibrary.error.folderNotEmpty");
    }

    await this.resourceLibraryRepository.deleteFolder(id);

    return { message: "resourceLibrary.toast.folderDeletedSuccessfully" };
  }

  async moveAsset(resourceId: UUIDType, folderId: UUIDType | null): Promise<MoveAssetResponse> {
    await this.assertAssetExists(resourceId);

    if (folderId) await this.assertFolderExists(folderId);

    await this.resourceLibraryRepository.moveAsset(resourceId, folderId);

    return { resourceId, folderId };
  }

  private async assertFolderExists(folderId: UUIDType) {
    const exists = await this.resourceLibraryRepository.folderExists(folderId);

    if (!exists) throw new NotFoundException("resourceLibrary.error.folderNotFound");
  }

  private async assertAssetExists(resourceId: UUIDType) {
    const assetExists = await this.resourceLibraryRepository.assetExists(resourceId);

    if (!assetExists) throw new NotFoundException("resourceLibrary.error.assetNotFound");
  }

  private async assertEntityExists(entityType: RichTextAssetEntityType, entityId: UUIDType) {
    const exists = await this.resourceLibraryRepository.entityExists(entityType, entityId);

    if (!exists) throw new NotFoundException("resourceLibrary.error.entityNotFound");
  }

  private buildResourceUrl(resourceId: UUIDType, entityType: RichTextAssetEntityType) {
    switch (entityType) {
      case ENTITY_TYPES.ARTICLES:
        return `/api/articles/articles-resource/${resourceId}`;
      case ENTITY_TYPES.NEWS:
        return `/api/news/news-resource/${resourceId}`;
      case ENTITY_TYPES.LESSON:
      default:
        return `/api/lesson/lesson-resource/${resourceId}`;
    }
  }

  private getResourceCategory(entityType: RichTextAssetEntityType) {
    switch (entityType) {
      case ENTITY_TYPES.ARTICLES:
        return RESOURCE_CATEGORIES.ARTICLES;
      case ENTITY_TYPES.NEWS:
        return RESOURCE_CATEGORIES.NEWS;
      case ENTITY_TYPES.LESSON:
      default:
        return RESOURCE_CATEGORIES.LESSON;
    }
  }

  private async syncEntityAssetRelations(params: {
    entityId: UUIDType;
    entityType: RichTextAssetEntityType;
    contents: string[];
  }) {
    const resourceIds = [
      ...new Set(params.contents.flatMap((content) => extractResourceIdsFromRichText(content))),
    ] as UUIDType[];

    await this.db.transaction(async (trx) =>
      this.resourceLibraryRepository.replaceEntityAttachmentRelations(
        {
          entityId: params.entityId,
          entityType: params.entityType,
          resourceIds,
        },
        trx,
      ),
    );
  }

  private async removeAssetReferencesFromContent(resourceId: UUIDType, dbInstance: DatabasePg) {
    const lessonRows = await this.resourceLibraryRepository.getLessonRowsReferencingAsset(
      resourceId,
      dbInstance,
    );

    for (const { id, description } of lessonRows) {
      for (const [language, localizedContent] of getLocalizedRichTextEntries(description)) {
        const { content, hasChanged } = removeResourceReferencesFromRichText(
          localizedContent,
          resourceId,
        );

        if (hasChanged) {
          await this.resourceLibraryRepository.updateLessonDescription(
            { lessonId: id, language, content },
            dbInstance,
          );
        }
      }
    }

    const articleRows = await this.resourceLibraryRepository.getArticleRowsReferencingAsset(
      resourceId,
      dbInstance,
    );

    for (const { id, content } of articleRows) {
      for (const [language, localizedContent] of getLocalizedRichTextEntries(content)) {
        const { content: cleanedContent, hasChanged } = removeResourceReferencesFromRichText(
          localizedContent,
          resourceId,
        );

        if (hasChanged) {
          await this.resourceLibraryRepository.updateArticleContent(
            { articleId: id, language, content: cleanedContent },
            dbInstance,
          );
        }
      }
    }

    const newsRows = await this.resourceLibraryRepository.getNewsRowsReferencingAsset(
      resourceId,
      dbInstance,
    );

    for (const { id, content } of newsRows) {
      for (const [language, localizedContent] of getLocalizedRichTextEntries(content)) {
        const { content: cleanedContent, hasChanged } = removeResourceReferencesFromRichText(
          localizedContent,
          resourceId,
        );

        if (hasChanged) {
          await this.resourceLibraryRepository.updateNewsContent(
            { newsId: id, language, content: cleanedContent },
            dbInstance,
          );
        }
      }
    }
  }
}
