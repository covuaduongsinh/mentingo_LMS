import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { PermissionsGuard } from "src/common/guards/permissions.guard";

import { LinkPreviewService } from "./link-preview.service";
import { linkPreviewQuerySchema, linkPreviewResponseSchema } from "./schemas/link-preview.schema";

import type { LinkPreviewResponse } from "./schemas/link-preview.schema";

@UseGuards(PermissionsGuard)
@Controller("link-preview")
export class LinkPreviewController {
  constructor(private readonly linkPreviewService: LinkPreviewService) {}

  // Any authenticated user may request a link preview — reading a link's own
  // public metadata doesn't touch tenant content, so this only requires the
  // same "is logged in" permission as GET /auth/current-user, not a
  // content-specific manage permission.
  @Get()
  @RequirePermission(PERMISSIONS.ACCOUNT_READ_SELF)
  @Validate({
    request: [{ type: "query", name: "url", schema: linkPreviewQuerySchema.properties.url }],
    response: baseResponse(linkPreviewResponseSchema),
  })
  async getLinkPreview(@Query("url") url: string): Promise<BaseResponse<LinkPreviewResponse>> {
    const preview = await this.linkPreviewService.getPreview(url);
    return new BaseResponse(preview);
  }
}
