import { Type } from "@sinclair/typebox";

import type { Static } from "@sinclair/typebox";

export const publicProfileSchema = Type.Object({
  username: Type.String(),
  firstName: Type.String(),
  lastName: Type.String(),
  bio: Type.Union([Type.String(), Type.Null()]),
  avatarUrl: Type.Union([Type.String(), Type.Null()]),
});

export const publicProfileSettingsSchema = Type.Object({
  username: Type.Union([Type.String(), Type.Null()]),
  publicProfileEnabled: Type.Boolean(),
  bio: Type.Union([Type.String(), Type.Null()]),
});

export const updatePublicProfileSettingsBodySchema = Type.Object({
  username: Type.Union([
    Type.String({ minLength: 3, maxLength: 30, pattern: "^[a-z0-9_-]+$" }),
    Type.Null(),
  ]),
  publicProfileEnabled: Type.Boolean(),
  bio: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
});

export type PublicProfile = Static<typeof publicProfileSchema>;
export type PublicProfileSettings = Static<typeof publicProfileSettingsSchema>;
export type UpdatePublicProfileSettingsBody = Static<typeof updatePublicProfileSettingsBodySchema>;
