# Certificates Business Spec

## Business Overview

Certificates provide formal proof that a learner completed a course or learning path. They support HR and L&D needs around recognition, compliance evidence, auditability, and external sharing of learning achievements.

The feature also gives course managers controlled ways to handle certificate validity and resets when course requirements change. Existing certificates can remain valid for historical record, receive updated validity rules, expire automatically, or be reset when the organization needs learners to re-complete training.

## Who Uses It

- Learners viewing, downloading, or sharing certificates from their profile.
- HR and L&D administrators reviewing learner certificate records.
- Course administrators managing certificate availability, validity, and resets for courses they can update.
- External viewers opening public certificate share pages created by learners.

## Feature Functions

- List active certificates for a learner profile.
- Open certificate previews for completed courses and learning paths.
- Switch certificate preview language between all supported platform languages.
- Download certificate PDFs with generated filenames.
- Share certificates externally through LinkedIn/public share links, keyed by a per-share token the certificate owner can revoke.
- Every issued certificate (downloaded PDF, shared image) carries a QR code that opens its public verification page — no separate "make it verifiable" action needed.
- Anyone with the link (or who scans the QR) can see the certificate's verification status — valid, expired, or revoked — on a page indexable by search engines when the certificate is valid.
- Configure whether a course issues certificates.
- Set certificate validity rules for a course.
- Show the impact of validity changes before applying them to active certificates.
- Reset course certificates for all holders, selected groups, or selected users.
- Optionally notify affected learners when certificates are reset.
- Archive expired or reset certificates while preserving activity history.

## End-User Value

Learners receive portable proof of completion that they can keep, download, and share outside Mentingo. HR and L&D teams get a reliable record of achievement for audits, compliance programs, and internal mobility.

For administrators, the reset and validity tools reduce operational risk. When a course changes materially, the team can identify affected certificate holders, choose the right reset scope, and keep historical certificate activity instead of silently overwriting records.

## How It Works

Learners access certificates from the profile certificate area. Each certificate can be previewed, rendered as a PDF, and shared when sharing is enabled. Certificate rendering is available in every supported platform language, including Spanish, even when the related course or learning path does not have a translation in that language; in that case Mentingo falls back to the base title. Public share endpoints serve external certificate pages and images, while protected certificate listing, rendering, and share-link creation remain permission-gated.

Requesting a share link mints (or reuses, if one already exists) a random per-certificate token; the public share page and share image are looked up by that token only, never by the certificate's own id. The certificate owner can revoke the token, which immediately breaks the previously issued link — anyone still holding the old URL sees a 404. Regenerating a link after revocation mints a fresh token.

A share token is minted automatically the first time a certificate is downloaded or shared, not only on an explicit "share" action — every downloaded PDF and every rendered share image embeds a QR code pointing at that certificate's verification page, so anyone holding a physical or digital copy can confirm it's genuine without needing the certificate owner to have separately clicked "share." The verification page shows the certificate content plus an explicit status badge (valid / expired / revoked) computed from the certificate's status and archive reason — a revoked or expired certificate still resolves and says so, rather than 404ing as if it never existed (only a token that was never issued, or a raw certificate id, 404s). Search engines are told to index the page only while the certificate is valid.

Course certificate settings are managed from the admin course settings workflow. Administrators can enable certificate issuance, define validity, inspect how a validity change affects active certificates, and choose whether the change applies only to future certificates or also to existing active certificates.

Certificate reset actions archive matching active certificates, reset the relevant learner progress, record certificate activity, and optionally send reset emails. Reset scope can target all certificate holders for the course, selected groups, or selected users with active certificates.

## Key Technical Context

- Profile certificate UI lives under `apps/web/app/modules/Profile/Certificates`.
- Course certificate settings and reset UI live under `apps/web/app/modules/Admin/EditCourse/CourseSettings`.
- API endpoints are implemented under `apps/api/src/certificates`.
- Core permissions include `PERMISSIONS.CERTIFICATE_READ`, `PERMISSIONS.CERTIFICATE_RENDER`, and `PERMISSIONS.CERTIFICATE_SHARE`.
- Course certificate validity and reset operations require `PERMISSIONS.COURSE_UPDATE` or `PERMISSIONS.COURSE_UPDATE_OWN`.
- Public share endpoints intentionally allow external certificate page and image access for share workflows, but only through `certificates.share_token` (`GET /api/certificates/share(-image)?token=...`) — never the certificate's own id. This was fixed 2026-07-25: the public endpoints previously accepted `?certificateId=<uuid>`, so anyone who learned a certificate's id (a small, sequential-feeling UUID visible in several authenticated views) could look up the holder's full name, course, and dates indefinitely, with no way to revoke access. `POST /api/certificates/share-link/revoke` (requires `PERMISSIONS.CERTIFICATE_SHARE` + ownership) clears the token.
- **The same IDOR existed in the learning-path certificate flow** (`apps/api/src/learning-path/services/learning-path-certificate.service.ts`, `apps/api/src/learning-path/controllers/learning-path-certificate.controller.ts`) — a fully parallel implementation that was never fixed alongside the course-certificate one. Fixed the same way: `learning_path_certificates.share_token` column (migration `0169_mean_king_cobra.sql`), `LearningPathCertificateService#resolveCertificateIdFromShareToken`, public endpoints now resolve by `?token=` only.
- QR generation: `packages/shared/src/utils/certificate.ts#buildCertificateMarkup` accepts a pre-rendered `qrCodeDataUri` + `verificationUrl` and embeds them — the function itself stays synchronous and platform-agnostic; the async, Node-only QR bitmap rendering (`qrcode` npm package, `QRCode.toDataURL`) happens at each call site (`CertificatesService#buildVerificationQrCode`, mirrored in `LearningPathCertificateService`). Both PDF download and share-image render paths now auto-provision a share token if one doesn't exist yet (`ensureShareToken`), so a certificate is verifiable via QR from the moment it's first downloaded or shared, not only after an explicit "share" action.
- Verification-page status: `CertificateRepository#findPublicShareCertificateById` no longer filters to `ACTIVE` only (deliberately — a verification page must be able to say "revoked", not 404 as if the certificate never existed) and now also selects `status`/`archiveReason`/`shareToken`. `getSharePageContent` derives `isRevoked`/`isExpired`/`isIndexable` from those fields; `<meta name="robots">` is `index,follow` only when the certificate is currently valid.
- Fixed alongside (found while extending this code, not scope creep — it directly affects rendering correctness): `escapeHtml` in `packages/shared/src/utils/certificate.ts` used non-global string `.replace()`, so a student name or course title containing two or more `&`/`<`/`>`/quote characters only had the _first_ occurrence escaped.
- Certificate PDFs, previews, share pages, and share images use the shared supported-language list, so new platform languages become available to certificates through the same contract.

## Test Evidence

- API E2E coverage verifies authenticated certificate listing, archived certificate exclusion, pagination and sorting, single certificate retrieval, PDF downloads, custom download filenames, validity-impact counts, bulk validity application, expiration handling, reset by all/users/groups, reset validation, reset options, reset-user search, authorization, and activity logging.
- (2026-07-25) API E2E coverage in "Certificate sharing" verifies: the share-link response never contains the certificate id, only an opaque token; repeated share-link requests reuse the same token; the public share page 404s for a raw certificate id and for an unknown token, and 200s for a valid token; revoke breaks a previously valid token; a non-owner cannot revoke another learner's share link. Re-verified (32/32) after the QR/verification-page changes.
- New (2026-07-25) `learning-path-certificate-sharing.e2e-spec.ts` (4/4 passing) covers the same IDOR fix for learning-path certificates: token-only resolution, 404 on a raw certificate id, 404 on an unknown token, 200 on a valid token.
- Frontend unit/source evidence covers profile certificate cards, previews, downloads, language toggles, LinkedIn sharing controls, certificate theme behavior, course certificate settings, validity-impact confirmation, and reset dialogs. There is no frontend UI yet for revoking a share link (backend endpoint only), and the in-browser preview modal (`CertificateContent.tsx`, a separate React implementation from the shared `buildCertificateMarkup` used for PDF/PNG rendering) does not show a QR code — the QR only matters once a certificate is actually shared/downloaded by a third party, not in the owner's private preview.
- I did not find a dedicated frontend E2E certificate spec in the current test tree.
