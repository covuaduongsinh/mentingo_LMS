import { Controller, Get, Param, Query, Req, Res } from "@nestjs/common";
import { isSupportedLanguage, type SupportedLanguages } from "@repo/shared";
import { Request, Response } from "express";

import { Public } from "src/common/decorators/public.decorator";
import { getRequestBaseUrl } from "src/common/helpers/getRequestBaseUrl";

import { SeoService } from "./seo.service";

@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Public()
  @Get("seo/robots.txt")
  async getRobotsTxt(@Req() req: Request, @Res() res: Response): Promise<void> {
    const baseUrl = getRequestBaseUrl(req) ?? "";
    const body = this.seoService.buildRobotsTxt(baseUrl);

    res.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
    res.send(body);
  }

  @Public()
  @Get("seo/sitemap.xml")
  async getSitemapXml(@Req() req: Request, @Res() res: Response): Promise<void> {
    const baseUrl = getRequestBaseUrl(req) ?? "";
    const body = await this.seoService.buildSitemapXml(baseUrl);

    res.set({
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
    res.send(body);
  }

  // Server-rendered OG/JSON-LD snapshot of a single course page, for crawlers
  // that don't execute JavaScript (the SPA has no SSR — see the SEO business
  // spec). The reverse proxy routes known bot user agents hitting
  // /course/:idOrSlug here instead of the static SPA build.
  @Public()
  @Get("seo/course-preview/:idOrSlug")
  async getCoursePreview(
    @Param("idOrSlug") idOrSlug: string,
    @Query("lang") lang: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const baseUrl = getRequestBaseUrl(req) ?? "";
    const language: SupportedLanguages | undefined =
      lang && isSupportedLanguage(lang) ? lang : undefined;
    const body = await this.seoService.buildCoursePreviewHtml(idOrSlug, baseUrl, language);

    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    });
    res.send(body);
  }
}
