import { BadRequestException } from "@nestjs/common";

import * as redisCache from "src/utils/redis-cache";

import { LinkPreviewService } from "../link-preview.service";
import * as safeFetch from "../utils/safe-fetch";
import { LinkPreviewFetchError } from "../utils/safe-fetch";

jest.mock("../utils/safe-fetch");
jest.mock("src/utils/redis-cache");

describe("LinkPreviewService", () => {
  let service: LinkPreviewService;

  beforeEach(() => {
    service = new LinkPreviewService();
    jest.clearAllMocks();
    jest.mocked(redisCache.getCachedJson).mockResolvedValue(null);
    jest.mocked(redisCache.setCachedJson).mockResolvedValue(undefined);
  });

  it("rejects a URL with an unsupported scheme before fetching anything", async () => {
    await expect(service.getPreview("javascript:alert(1)")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(safeFetch.fetchHtmlSafely).not.toHaveBeenCalled();
  });

  it("returns cached data without calling the network", async () => {
    const cached = {
      title: "Cached title",
      description: null,
      imageUrl: null,
      domain: "example.com",
    };
    jest.mocked(redisCache.getCachedJson).mockResolvedValue(cached);

    const result = await service.getPreview("https://example.com");

    expect(result).toEqual(cached);
    expect(safeFetch.fetchHtmlSafely).not.toHaveBeenCalled();
  });

  it("fetches, extracts metadata, and caches a successful result", async () => {
    jest
      .mocked(safeFetch.fetchHtmlSafely)
      .mockResolvedValue(
        '<meta property="og:title" content="A course" /><meta property="og:description" content="Learn chess" />',
      );

    const result = await service.getPreview("https://example.com/course");

    expect(result).toEqual({
      title: "A course",
      description: "Learn chess",
      imageUrl: null,
      domain: "example.com",
    });
    expect(redisCache.setCachedJson).toHaveBeenCalledWith(
      expect.stringContaining("https://example.com/course"),
      result,
      24 * 60 * 60,
    );
  });

  it("maps a blocked/refused fetch to a generic 400 without leaking the reason", async () => {
    jest
      .mocked(safeFetch.fetchHtmlSafely)
      .mockRejectedValue(new LinkPreviewFetchError("Address not allowed"));

    await expect(service.getPreview("http://169.254.169.254")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(redisCache.setCachedJson).not.toHaveBeenCalled();
  });

  it("does not cache a transient failure, so the next call can retry", async () => {
    jest.mocked(safeFetch.fetchHtmlSafely).mockRejectedValue(new Error("ECONNRESET"));

    await expect(service.getPreview("https://example.com")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(redisCache.setCachedJson).not.toHaveBeenCalled();
  });
});
