import { Injectable, Logger } from "@nestjs/common";
import { COURSE_STATUSES, SUPPORTED_LANGUAGES } from "@repo/shared";

import { CourseSlugService } from "src/courses/course-slug.service";
import { CourseService } from "src/courses/course.service";

import { SeoRepository } from "./repositories/seo.repository";

import type { SupportedLanguages } from "@repo/shared";
import type { UUIDType } from "src/common";

// `CourseService#getCourse` treats a null userId as "anonymous" (it left-joins
// enrollment by studentId, so null safely matches nothing) — this mirrors what
// `@CurrentUser("userId")` actually returns for unauthenticated requests.
const ANONYMOUS_USER_ID = null as unknown as UUIDType;

const DESCRIPTION_MAX_LENGTH = 300;

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(
    private readonly seoRepository: SeoRepository,
    private readonly courseSlugService: CourseSlugService,
    private readonly courseService: CourseService,
  ) {}

  buildRobotsTxt(baseUrl: string): string {
    return ["User-agent: *", "Allow: /", `Sitemap: ${baseUrl}/sitemap.xml`, ""].join("\n");
  }

  async buildSitemapXml(baseUrl: string): Promise<string> {
    const publishedCourses = await this.seoRepository.getPublishedCourses();
    const courseIds = publishedCourses.map((course) => course.id);
    const slugsByCourseId = await this.courseSlugService.getCoursesSlugs(
      SUPPORTED_LANGUAGES.EN,
      courseIds,
    );

    const entries: Array<{ loc: string; lastmod?: string }> = [
      { loc: `${baseUrl}/` },
      { loc: `${baseUrl}/courses` },
      ...publishedCourses.map((course) => ({
        loc: `${baseUrl}/course/${slugsByCourseId.get(course.id) ?? course.id}`,
        lastmod: new Date(course.updatedAt).toISOString(),
      })),
    ];

    const urlTags = entries
      .map(({ loc, lastmod }) => {
        const lastmodTag = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : "";
        return `  <url><loc>${escapeXml(loc)}</loc>${lastmodTag}</url>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlTags}\n</urlset>\n`;
  }

  async buildCoursePreviewHtml(
    idOrSlug: string,
    baseUrl: string,
    language: SupportedLanguages = SUPPORTED_LANGUAGES.EN,
  ): Promise<string> {
    try {
      const course = await this.courseService.getCourse(idOrSlug, ANONYMOUS_USER_ID, [], language);

      if (course.status !== COURSE_STATUSES.PUBLISHED) {
        return buildNotFoundHtml();
      }

      return buildCourseHtml(course, baseUrl);
    } catch (error) {
      this.logger.debug(`Course preview not renderable for "${idOrSlug}": ${error}`);
      return buildNotFoundHtml();
    }
  }
}

function buildCourseHtml(
  course: { title: string; description: string; slug: string; thumbnailUrl?: string },
  baseUrl: string,
): string {
  const canonicalUrl = `${baseUrl}/course/${course.slug}`;
  const title = escapeHtml(course.title);
  const description = escapeHtml(truncate(stripHtml(course.description), DESCRIPTION_MAX_LENGTH));
  const image = course.thumbnailUrl;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: truncate(stripHtml(course.description), DESCRIPTION_MAX_LENGTH),
    url: canonicalUrl,
    ...(image ? { image } : {}),
  };

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : "",
    `<script type="application/ld+json">${embedJsonLd(jsonLd)}</script>`,
    "</head>",
    "<body>",
    `<h1>${title}</h1>`,
    `<p>${description}</p>`,
    "</body>",
    "</html>",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildNotFoundHtml(): string {
  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8" />',
    "<title>Course not found</title>",
    '<meta name="robots" content="noindex" />',
    "</head>",
    "<body></body>",
    "</html>",
  ].join("\n");
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

// `course.description` is rich-text HTML, so after stripping tags the leftover
// text still holds HTML entities (e.g. "&amp;"). Decode them back to plain
// text here so escapeHtml() below re-encodes exactly once instead of
// double-escaping into "&amp;amp;".
function decodeHtmlEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (match) => HTML_ENTITIES[match]);
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

// A plain string .replace() only touches the FIRST occurrence — course titles
// and descriptions are user-authored and can contain repeated special chars,
// so this must use global regexes (same fix already applied for certificates,
// see packages/shared/src/utils/certificate.ts).
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Prevents a course title/description containing "</script>" from breaking out
// of the embedded JSON-LD script tag.
function embedJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
