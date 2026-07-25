import axios from "axios";

import { TurnstileGuard } from "../turnstile.guard";

import type { ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

jest.mock("axios");
jest.mock("src/common/configuration/optional-config-loader", () => ({
  get hasTurnstileConfig() {
    return mockHasTurnstileConfig;
  },
}));

// eslint-disable-next-line no-var
var mockHasTurnstileConfig = false;

function buildContext(body: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ body, ip: "203.0.113.10" }),
    }),
  } as unknown as ExecutionContext;
}

describe("TurnstileGuard", () => {
  let configService: jest.Mocked<ConfigService>;
  let guard: TurnstileGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    mockHasTurnstileConfig = false;
    configService = {
      get: jest.fn().mockReturnValue("test-secret-key"),
    } as unknown as jest.Mocked<ConfigService>;
    guard = new TurnstileGuard(configService);
  });

  it("allows the request through untouched when Turnstile isn't configured", async () => {
    mockHasTurnstileConfig = false;

    const result = await guard.canActivate(buildContext({}));

    expect(result).toBe(true);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("rejects the request when configured but no token was submitted", async () => {
    mockHasTurnstileConfig = true;

    await expect(guard.canActivate(buildContext({}))).rejects.toMatchObject({
      response: { message: "auth.error.captchaVerificationFailed" },
    });
  });

  it("rejects when Cloudflare reports the token as invalid", async () => {
    mockHasTurnstileConfig = true;
    (axios.post as jest.Mock).mockResolvedValue({ data: { success: false } });

    await expect(
      guard.canActivate(buildContext({ turnstileToken: "bad-token" })),
    ).rejects.toMatchObject({
      response: { message: "auth.error.captchaVerificationFailed" },
    });
  });

  it("accepts the request when Cloudflare verifies the token", async () => {
    mockHasTurnstileConfig = true;
    (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    const result = await guard.canActivate(buildContext({ turnstileToken: "good-token" }));

    expect(result).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.any(URLSearchParams),
      expect.objectContaining({ timeout: 5000 }),
    );
  });

  it("fails closed when the Cloudflare verification call errors out", async () => {
    mockHasTurnstileConfig = true;
    (axios.post as jest.Mock).mockRejectedValue(new Error("network down"));

    await expect(
      guard.canActivate(buildContext({ turnstileToken: "good-token" })),
    ).rejects.toMatchObject({
      response: { message: "auth.error.captchaVerificationFailed" },
    });
  });
});
