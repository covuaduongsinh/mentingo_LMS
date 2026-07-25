import { SUPPORTED_LANGUAGES } from "@repo/shared";
import { type Static, Type } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

import { passwordSchema } from "./password.schema";

export const createAccountSchema = Type.Object({
  email: Type.String({ format: "email" }),
  firstName: Type.String({ minLength: 1, maxLength: 64 }),
  lastName: Type.String({ minLength: 1, maxLength: 64 }),
  password: passwordSchema,
  language: Type.Enum(SUPPORTED_LANGUAGES),
  formAnswers: Type.Optional(Type.Record(UUIDSchema, Type.Boolean())),
  /** Only required when the tenant has Cloudflare Turnstile configured — see TurnstileGuard. */
  turnstileToken: Type.Optional(Type.String()),
});

export type CreateAccountBody = Static<typeof createAccountSchema>;
