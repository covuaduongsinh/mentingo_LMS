import { Type } from "@sinclair/typebox";

import type { Static } from "@sinclair/typebox";

export const classLoginSchema = Type.Object({
  code: Type.String({ minLength: 5, maxLength: 5 }),
});

export type ClassLoginBody = Static<typeof classLoginSchema>;
