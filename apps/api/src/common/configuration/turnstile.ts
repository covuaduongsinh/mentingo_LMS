import { registerAs } from "@nestjs/config";
import { type Static, Type } from "@sinclair/typebox";

import { configValidator } from "src/utils/configValidator";

const schema = Type.Object({
  TURNSTILE_SITE_KEY: Type.String(),
  TURNSTILE_SECRET_KEY: Type.String(),
});

type TurnstileConfigSchema = Static<typeof schema>;

const validateTurnstileConfig = configValidator(schema);

export default registerAs("turnstile", (): TurnstileConfigSchema => {
  const values = {
    TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  };

  return validateTurnstileConfig(values);
});
