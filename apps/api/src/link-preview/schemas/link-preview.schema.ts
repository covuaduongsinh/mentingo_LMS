import { Type } from "@sinclair/typebox";

import type { Static } from "@sinclair/typebox";

export const linkPreviewQuerySchema = Type.Object({
  url: Type.String({ minLength: 1 }),
});

export const linkPreviewResponseSchema = Type.Object({
  title: Type.Union([Type.String(), Type.Null()]),
  description: Type.Union([Type.String(), Type.Null()]),
  imageUrl: Type.Union([Type.String(), Type.Null()]),
  domain: Type.String(),
});

export type LinkPreviewQuery = Static<typeof linkPreviewQuerySchema>;
export type LinkPreviewResponse = Static<typeof linkPreviewResponseSchema>;
