import { BadRequestException, Injectable, Logger } from "@nestjs/common";

import { getCachedJson, setCachedJson } from "src/utils/redis-cache";

import { extractHtmlMeta } from "./utils/extract-html-meta";
import { fetchHtmlSafely, LinkPreviewFetchError } from "./utils/safe-fetch";

import type { LinkPreviewResponse } from "./schemas/link-preview.schema";

const CACHE_TTL_SECONDS = 24 * 60 * 60;
const CACHE_KEY_PREFIX = "link-preview:";

const isSupportedUrl = (value: string): URL | null => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
};

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);

  async getPreview(rawUrl: string): Promise<LinkPreviewResponse> {
    const parsedUrl = isSupportedUrl(rawUrl);

    if (!parsedUrl) {
      throw new BadRequestException("Invalid URL");
    }

    const cacheKey = `${CACHE_KEY_PREFIX}${parsedUrl.toString()}`;
    const cached = await getCachedJson<LinkPreviewResponse>(cacheKey);
    if (cached) return cached;

    let html: string;
    try {
      html = await fetchHtmlSafely(parsedUrl.toString());
    } catch (error) {
      if (error instanceof LinkPreviewFetchError) {
        // Never leak *why* the fetch was refused (e.g. that it hit the SSRF
        // blocklist) — a generic message keeps this endpoint from being
        // usable to probe internal network layout via distinct error text.
        this.logger.debug(`Link preview fetch refused for ${parsedUrl.hostname}: ${error.message}`);
        throw new BadRequestException("Unable to preview this link");
      }
      this.logger.warn(`Link preview fetch failed for ${parsedUrl.hostname}: ${String(error)}`);
      throw new BadRequestException("Unable to preview this link");
    }

    const meta = extractHtmlMeta(html);
    const response: LinkPreviewResponse = {
      title: meta.title,
      description: meta.description,
      imageUrl: meta.imageUrl,
      domain: parsedUrl.hostname,
    };

    // Only successful lookups are cached — a transient failure (e.g. the
    // target is briefly down) should be retryable on the next request
    // instead of being "frozen" as an error for a full day.
    await setCachedJson(cacheKey, response, CACHE_TTL_SECONDS);

    return response;
  }
}
