import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

import { hasTurnstileConfig } from "src/common/configuration/optional-config-loader";

import type { CanActivate, ExecutionContext } from "@nestjs/common";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * A no-op when TURNSTILE_SECRET_KEY isn't configured — every request passes
 * through exactly as before this feature existed, matching the "optional
 * config, tenant self-disables" pattern used for Google/Slack/Microsoft SSO
 * (see optional-config-loader.ts). Only once configured does this guard
 * start requiring and verifying a `turnstileToken` in the request body.
 */
@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!hasTurnstileConfig) return true;

    const request = context.switchToHttp().getRequest();
    const token = request.body?.turnstileToken;

    if (!token || typeof token !== "string") {
      throw new BadRequestException({ message: "auth.error.captchaVerificationFailed" });
    }

    const secretKey = this.configService.get<string>("turnstile.TURNSTILE_SECRET_KEY");

    const isValid = await this.verifyToken(token, secretKey, request.ip);

    if (!isValid) {
      throw new BadRequestException({ message: "auth.error.captchaVerificationFailed" });
    }

    return true;
  }

  private async verifyToken(
    token: string,
    secretKey: string | undefined,
    remoteIp: string | undefined,
  ): Promise<boolean> {
    try {
      const response = await axios.post<{ success: boolean }>(
        TURNSTILE_VERIFY_URL,
        new URLSearchParams({
          secret: secretKey ?? "",
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
        { timeout: 5000 },
      );

      return response.data.success === true;
    } catch {
      // Cloudflare unreachable/timeout — fail closed (reject the request)
      // rather than silently letting an unverified request through.
      return false;
    }
  }
}
