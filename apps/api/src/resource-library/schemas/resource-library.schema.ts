import { ENTITY_TYPES, RESOURCE_LIBRARY_ASSET_TYPE, VIDEO_EMBED_PROVIDERS } from "@repo/shared";
import { Type } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";
import { supportedLanguagesSchema } from "src/courses/schemas/course.schema";
import { RESOURCE_FOLDER_COLORS } from "src/resource-library/resource-library.constants";

import type { Static } from "@sinclair/typebox";

export const resourceFolderColorSchema = Type.Union(
  RESOURCE_FOLDER_COLORS.map((color) => Type.Literal(color)),
);

export const resourceLibraryAssetTypeSchema = Type.Enum(RESOURCE_LIBRARY_ASSET_TYPE);

export const richTextAssetEntityTypeSchema = Type.Union([
  Type.Literal(ENTITY_TYPES.LESSON),
  Type.Literal(ENTITY_TYPES.ARTICLES),
  Type.Literal(ENTITY_TYPES.NEWS),
]);

export const assetLibraryAssetSchema = Type.Object({
  id: UUIDSchema,
  fileName: Type.String(),
  title: Type.String(),
  contentType: Type.String(),
  type: resourceLibraryAssetTypeSchema,
  size: Type.Union([Type.Number(), Type.Null()]),
  originalFilename: Type.Union([Type.String(), Type.Null()]),
  reference: Type.String(),
  videoProvider: Type.Optional(Type.Enum(VIDEO_EMBED_PROVIDERS)),
  uploadedBy: Type.Union([UUIDSchema, Type.Null()]),
  folderId: Type.Union([UUIDSchema, Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
  usageCount: Type.Number(),
});

export const assetLibraryUsageSchema = Type.Object({
  id: UUIDSchema,
  entityId: UUIDSchema,
  entityType: richTextAssetEntityTypeSchema,
  title: Type.String(),
  relationshipType: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
});

export const linkAssetBodySchema = Type.Object({
  entityId: UUIDSchema,
  entityType: richTextAssetEntityTypeSchema,
  relationshipType: Type.Optional(Type.String()),
});

export const linkAssetResponseSchema = Type.Object({
  resourceId: UUIDSchema,
  url: Type.String(),
});

export const unlinkAssetBodySchema = Type.Object({
  entityId: UUIDSchema,
  entityType: richTextAssetEntityTypeSchema,
  relationshipType: Type.Optional(Type.String()),
});

export const unlinkAssetResponseSchema = Type.Object({
  resourceId: UUIDSchema,
  deletedUsages: Type.Number(),
});

export const uploadAssetBodySchema = Type.Object({
  file: Type.Optional(Type.String({ format: "binary" })),
  entityType: richTextAssetEntityTypeSchema,
  entityId: Type.Optional(UUIDSchema),
  contextId: Type.Optional(UUIDSchema),
  language: supportedLanguagesSchema,
  title: Type.String(),
  description: Type.String(),
});

export const uploadAssetResponseSchema = Type.Object({
  resourceId: UUIDSchema,
  url: Type.String(),
  fileUrl: Type.String(),
});

export const deleteAssetResponseSchema = Type.Object({
  message: Type.String(),
  deletedUsages: Type.Number(),
});

export const resourceFolderSchema = Type.Object({
  id: UUIDSchema,
  name: Type.String(),
  parentFolderId: Type.Union([UUIDSchema, Type.Null()]),
  color: resourceFolderColorSchema,
  coverResourceId: Type.Union([UUIDSchema, Type.Null()]),
  coverResourceUrl: Type.Union([Type.String(), Type.Null()]),
  displayOrder: Type.Number(),
  childFolderCount: Type.Number(),
  assetCount: Type.Number(),
  createdAt: Type.String({ format: "date-time" }),
});

export const listFoldersResponseSchema = Type.Array(resourceFolderSchema);

export const createFolderBodySchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  parentFolderId: Type.Optional(Type.Union([UUIDSchema, Type.Null()])),
  color: Type.Optional(resourceFolderColorSchema),
  coverResourceId: Type.Optional(Type.Union([UUIDSchema, Type.Null()])),
});

export const updateFolderBodySchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  parentFolderId: Type.Optional(Type.Union([UUIDSchema, Type.Null()])),
  color: Type.Optional(resourceFolderColorSchema),
  coverResourceId: Type.Optional(Type.Union([UUIDSchema, Type.Null()])),
  displayOrder: Type.Optional(Type.Number()),
});

export const deleteFolderResponseSchema = Type.Object({
  message: Type.String(),
});

export const moveAssetBodySchema = Type.Object({
  folderId: Type.Union([UUIDSchema, Type.Null()]),
});

export const moveAssetResponseSchema = Type.Object({
  resourceId: UUIDSchema,
  folderId: Type.Union([UUIDSchema, Type.Null()]),
});

export type ResourceLibraryAssetType = Static<typeof resourceLibraryAssetTypeSchema>;
export type RichTextAssetEntityType = Static<typeof richTextAssetEntityTypeSchema>;
export type LinkAssetBody = Static<typeof linkAssetBodySchema>;
export type UnlinkAssetBody = Static<typeof unlinkAssetBodySchema>;
export type UploadAssetBody = Static<typeof uploadAssetBodySchema>;
export type LinkAssetResponse = Static<typeof linkAssetResponseSchema>;
export type UnlinkAssetResponse = Static<typeof unlinkAssetResponseSchema>;
export type UploadAssetResponse = Static<typeof uploadAssetResponseSchema>;
export type DeleteAssetResponse = Static<typeof deleteAssetResponseSchema>;
export type AssetLibraryAsset = Static<typeof assetLibraryAssetSchema>;
export type AssetLibraryUsage = Static<typeof assetLibraryUsageSchema>;
export type ResourceFolderColor = Static<typeof resourceFolderColorSchema>;
export type ResourceFolder = Static<typeof resourceFolderSchema>;
export type CreateFolderBody = Static<typeof createFolderBodySchema>;
export type UpdateFolderBody = Static<typeof updateFolderBodySchema>;
export type DeleteFolderResponse = Static<typeof deleteFolderResponseSchema>;
export type MoveAssetBody = Static<typeof moveAssetBodySchema>;
export type MoveAssetResponse = Static<typeof moveAssetResponseSchema>;
