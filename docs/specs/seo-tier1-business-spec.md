# SEO Tier 1 Business Spec

## Business Overview

The public marketing surface of a Mentingo tenant — its course catalog and individual course pages — needs to be crawlable and shareable like any other content site. The app is a client-rendered SPA with no server-side rendering (no server loaders exist anywhere in the codebase; `apps/web/build/client` is served as a single static bundle by nginx, with every route falling back to the same `index.html`). That means, out of the box, search engines and link-preview bots that don't execute JavaScript see an empty shell instead of a course's title, description, or thumbnail.

Building full SSR to fix this properly is a multi-week rewrite (confirmed during planning: 0 server loaders today, `server.js` is dead code, the production Docker image builds to static nginx). SEO Tier 1 is the ~80%-of-the-value slice that doesn't require that rewrite.

## Who Uses It

- Search engine crawlers (Googlebot, Bingbot) that need a `robots.txt`/`sitemap.xml` to discover and index published courses.
- Social/chat link-preview bots (Facebook, Twitter/X, LinkedIn, Slack, Telegram, WhatsApp, Zalo, Discord) that fetch a URL once, don't run JavaScript, and render whatever OG/Twitter meta tags they find.
- Human visitors following a shared course link, who still land on the normal client-rendered SPA.
- Admins/tenant operators, indirectly, through better discoverability and richer link previews when a course is shared.

## Feature Functions

- Serve a per-tenant `robots.txt` at the site root, generated dynamically (not a static file), pointing at that tenant's sitemap.
- Serve a per-tenant `sitemap.xml` at the site root, generated dynamically from the database: the homepage, the course catalog page, and every `published` course (by its resolved slug), with `<lastmod>` from the course's `updatedAt`.
- Serve a server-rendered HTML snapshot of a single course page — real `<title>`, meta description, Open Graph tags, Twitter Card tags, and a `schema.org/Course` JSON-LD block — for requests that look like a crawler, instead of the client-rendered SPA shell.
- Give the course view page a real, translated `<title>` in the SPA itself (helps Google, which does execute JavaScript, even though it doesn't help non-JS crawlers).

## End-User Value

Search engines can find and correctly index every published course. When a course link is pasted into Slack, Facebook, Zalo, or similar, the resulting preview card shows the course's actual title, description, and thumbnail instead of a generic/empty card — directly improving click-through on shared course links.

## How It Works

**robots.txt / sitemap.xml.** These are not static files. `GET /api/seo/robots.txt` and `GET /api/seo/sitemap.xml` are `@Public()` NestJS endpoints (`apps/api/src/seo/`) that build the response body per-request from the database. Because they are ordinary (non-bypassed) requests, the existing global `TenantRlsInterceptor` still resolves the tenant from the request's `Origin`/`Referer`/`Host` header and scopes every DB query to that tenant automatically via RLS — the same mechanism every other tenant-scoped endpoint relies on, no manual tenant filtering needed. The reverse proxy (Caddy) rewrites `/robots.txt` → `/api/seo/robots.txt` and `/sitemap.xml` → `/api/seo/sitemap.xml` so they're reachable at the domain root, matching where crawlers look for them by convention.

**Course preview for bots ("dynamic rendering").** The reverse proxy inspects the `User-Agent` header of requests to `/course/*`. Ones that match a known crawler/bot pattern (`bot`, `spider`, `crawl`, `facebookexternalhit`, `Twitterbot`, `LinkedInBot`, `SlackBot`, `TelegramBot`, `WhatsApp`, `Zalo`, `Discordbot`, etc.) are routed to `GET /api/seo/course-preview/:idOrSlug` on the API instead of the static SPA build. Ordinary browser requests are unaffected and keep hitting the normal client-rendered app. This is the same "dynamic rendering" pattern historically recommended for JS-heavy sites — it is not full SSR: only the bot-facing snapshot is server-rendered, and it renders no interactivity, just the meta tags and a minimal visible title/description.

The course-preview endpoint reuses `CourseService#getCourse` (the same public course-detail query the SPA itself calls) to resolve `idOrSlug`, so visibility rules are identical to the real page: draft/private/unpublished courses, or an unresolvable id/slug, render a generic `noindex` "not found" page instead of leaking course details — the service treats a `null` `userId` as "anonymous," matching what `@CurrentUser("userId")` actually returns for a logged-out request.

**Course title in the SPA.** `CourseView.page.tsx` now exports `meta` using the existing `setPageTitle` utility, the same convention used by ~50 other pages in the app (a static per-page-type i18n key — e.g. `pages.courseView` — prefixed with the tenant's company name, not the individual course's title; no page in the codebase puts dynamic entity data into the `<title>`, so this intentionally follows that existing pattern rather than inventing a new one).

## Key Technical Context

- Backend: `apps/api/src/seo/` — `SeoController` (3 `@Public()` routes), `SeoService` (pure string-building: robots.txt text, sitemap XML, course-preview HTML), `SeoRepository` (`getPublishedCourses()` — `status = 'published'` courses with `id`/`updatedAt`).
- Course URLs in the sitemap use the same `{shortId}-{slug}` format as the real app (`CourseSlugService#getCoursesSlugs`), falling back to the raw course id when no slug exists yet.
- All user-authored text (course title/description) is escaped before being embedded in HTML attributes/JSON-LD (`escapeHtml`/`embedJsonLd`, mirroring the fix already applied to `packages/shared/src/utils/certificate.ts` — global-regex replace, not a single-occurrence `.replace()`) and XML (`escapeXml`) — course descriptions are rich-text HTML, so they're stripped of tags and HTML-entity-decoded first (`stripHtml`/`decodeHtmlEntities`) so `escapeHtml` re-encodes exactly once instead of double-escaping `&amp;` into `&amp;amp;`.
- Reverse proxy: `apps/reverse-proxy/Caddyfile` (local dev, `*.lms.localhost`) and `deploy/staging/Caddyfile` (staging/production, manually copied to the VPS per that file's existing instructions — this PR does not auto-deploy it) both gained `/robots.txt`, `/sitemap.xml`, and bot-matched `/course/*` routing blocks in front of the existing SPA fallback.
- `apps/web/app/modules/Courses/CourseView/CourseView.page.tsx` — added `export const meta` via `setPageTitle`; added `pages.courseView` to all 7 locale files.
- Deliberately out of scope for Tier 1 (same as the original plan): full SSR/hydration of the SPA itself; anything beyond the `Course` JSON-LD type (e.g. `AggregateRating`, `Review`).

## Test Evidence

`SeoService` has unit tests (`apps/api/src/seo/__tests__/seo.service.spec.ts`) covering: robots.txt sitemap directive, sitemap listing (homepage/catalog/every published course, slug fallback to raw id, XML escaping of special characters), course-preview OG/JSON-LD content, HTML-entity round-tripping through the rich-text description, `</script>`-breakout prevention in the embedded JSON-LD, and the `noindex` fallback for both an unresolvable course and a resolvable-but-unpublished one.

Manually verified end-to-end against the real dev database (tenant1, Node 22, `nest start --watch`): `GET /api/seo/robots.txt` and `GET /api/seo/sitemap.xml` return correct per-tenant content (11 real published courses with resolved slugs and `<lastmod>` values); `GET /api/seo/course-preview/:slug` returns fully-populated OG/Twitter/JSON-LD tags for a real course and a `noindex` fallback (HTTP 200, not a 500) for a nonexistent slug.
