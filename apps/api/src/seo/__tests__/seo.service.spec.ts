import { SeoService } from "../seo.service";

import type { SeoRepository } from "../repositories/seo.repository";
import type { CourseSlugService } from "src/courses/course-slug.service";
import type { CourseService } from "src/courses/course.service";

const BASE_URL = "https://tenant1.lms.localhost";

describe("SeoService", () => {
  let seoRepository: jest.Mocked<SeoRepository>;
  let courseSlugService: jest.Mocked<CourseSlugService>;
  let courseService: jest.Mocked<CourseService>;
  let service: SeoService;

  beforeEach(() => {
    seoRepository = { getPublishedCourses: jest.fn() } as unknown as jest.Mocked<SeoRepository>;
    courseSlugService = {
      getCoursesSlugs: jest.fn(),
    } as unknown as jest.Mocked<CourseSlugService>;
    courseService = { getCourse: jest.fn() } as unknown as jest.Mocked<CourseService>;

    service = new SeoService(seoRepository, courseSlugService, courseService);
  });

  describe("buildRobotsTxt", () => {
    it("points the sitemap directive at the given base URL", () => {
      const robotsTxt = service.buildRobotsTxt(BASE_URL);

      expect(robotsTxt).toContain("User-agent: *");
      expect(robotsTxt).toContain("Allow: /");
      expect(robotsTxt).toContain(`Sitemap: ${BASE_URL}/sitemap.xml`);
    });
  });

  describe("buildSitemapXml", () => {
    it("lists the homepage, courses page, and every published course by slug", async () => {
      seoRepository.getPublishedCourses.mockResolvedValue([
        { id: "course-1", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "course-2", updatedAt: "2026-02-01T00:00:00.000Z" },
      ] as never);
      courseSlugService.getCoursesSlugs.mockResolvedValue(
        new Map([
          ["course-1", "abcde-first-course"],
          // course-2 has no slug yet — falls back to the raw id
        ]),
      );

      const xml = await service.buildSitemapXml(BASE_URL);

      expect(xml).toContain(`<loc>${BASE_URL}/</loc>`);
      expect(xml).toContain(`<loc>${BASE_URL}/courses</loc>`);
      expect(xml).toContain(`<loc>${BASE_URL}/course/abcde-first-course</loc>`);
      expect(xml).toContain(`<loc>${BASE_URL}/course/course-2</loc>`);
      expect(xml).toContain("<lastmod>2026-01-01T00:00:00.000Z</lastmod>");
    });

    it("XML-escapes characters that would otherwise break the document", async () => {
      seoRepository.getPublishedCourses.mockResolvedValue([]);
      courseSlugService.getCoursesSlugs.mockResolvedValue(new Map());

      const xml = await service.buildSitemapXml("https://tenant1.lms.localhost?a=1&b=2");

      expect(xml).toContain("&amp;b=2");
      expect(xml).not.toContain("?a=1&b=2</loc>");
    });
  });

  describe("buildCoursePreviewHtml", () => {
    it("embeds OG tags and JSON-LD built from the resolved course", async () => {
      courseService.getCourse.mockResolvedValue({
        title: "Chess Basics",
        description: "<p>Learn the &amp; rules</p>",
        slug: "abcde-chess-basics",
        status: "published",
        thumbnailUrl: "https://cdn.example.com/thumb.png",
      } as never);

      const html = await service.buildCoursePreviewHtml("abcde-chess-basics", BASE_URL);

      expect(html).toContain("<title>Chess Basics</title>");
      expect(html).toContain(`<link rel="canonical" href="${BASE_URL}/course/abcde-chess-basics"`);
      expect(html).toContain('<meta property="og:title" content="Chess Basics"');
      expect(html).toContain(
        '<meta property="og:image" content="https://cdn.example.com/thumb.png"',
      );
      expect(html).toContain('"@type":"Course"');
      expect(html).toContain('"name":"Chess Basics"');
      // stripped of HTML tags and HTML-unescaped back to plain text for the description
      expect(html).toContain("Learn the &amp; rules");
    });

    it("strips a course title/description containing </script> before embedding JSON-LD", async () => {
      courseService.getCourse.mockResolvedValue({
        title: "</script><script>alert(1)</script>",
        description: "safe",
        slug: "abcde-xss",
        status: "published",
      } as never);

      const html = await service.buildCoursePreviewHtml("abcde-xss", BASE_URL);

      expect(html).not.toContain("</script><script>alert(1)</script>");
    });

    it("returns a noindex not-found page when the course cannot be resolved", async () => {
      courseService.getCourse.mockRejectedValue(new Error("Course not found"));

      const html = await service.buildCoursePreviewHtml("missing", BASE_URL);

      expect(html).toContain('<meta name="robots" content="noindex" />');
      expect(html).toContain("Course not found");
    });

    it("returns a noindex not-found page for a resolvable but unpublished course", async () => {
      courseService.getCourse.mockResolvedValue({
        title: "Draft course",
        description: "wip",
        slug: "abcde-draft",
        status: "draft",
      } as never);

      const html = await service.buildCoursePreviewHtml("abcde-draft", BASE_URL);

      expect(html).toContain('<meta name="robots" content="noindex" />');
    });
  });
});
