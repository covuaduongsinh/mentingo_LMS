import { SYSTEM_ROLE_SLUGS } from "@repo/shared";
import { isNull, sql } from "drizzle-orm";
import request from "supertest";

import { createE2ETest } from "../../../test/create-e2e-test";
import { createLearningPathFactory } from "../../../test/factory/learningPath.factory";
import { createSettingsFactory } from "../../../test/factory/settings.factory";
import { createUserFactory } from "../../../test/factory/user.factory";
import { cookieFor, truncateAllTables } from "../../../test/helpers/test-helpers";
import { DB, DB_ADMIN } from "../../storage/db/db.providers";
import { learningPathCertificates, settings } from "../../storage/schema";

import type { INestApplication } from "@nestjs/common";
import type { DatabasePg } from "src/common";

/**
 * Mirrors CertificatesController's "Certificate sharing" e2e coverage — the
 * learning-path certificate share endpoints had the exact same IDOR
 * (public endpoints resolving by the certificate's own id, with no
 * per-share secret) that was fixed for course certificates; this covers
 * the same fix applied here.
 */
describe("LearningPathCertificateController — sharing (e2e)", () => {
  let app: INestApplication;
  let db: DatabasePg;
  let baseDb: DatabasePg;
  let userFactory: ReturnType<typeof createUserFactory>;
  let learningPathFactory: ReturnType<typeof createLearningPathFactory>;
  let settingsFactory: ReturnType<typeof createSettingsFactory>;
  const password = "password123";

  beforeAll(async () => {
    const { app: testApp } = await createE2ETest();
    app = testApp;
    db = app.get(DB);
    baseDb = app.get(DB_ADMIN);
    userFactory = createUserFactory(db);
    learningPathFactory = createLearningPathFactory(db);
    settingsFactory = createSettingsFactory(db);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await settingsFactory.create({ userId: null });
    // learningPathsEnabled defaults to false — every endpoint under this
    // controller is gated by LearningPathsEnabledGuard.
    await db
      .update(settings)
      .set({
        settings: sql`jsonb_set(settings.settings, '{learningPathsEnabled}', to_jsonb(true), true)`,
      })
      .where(isNull(settings.userId));
  });

  afterEach(async () => {
    await truncateAllTables(baseDb, db);
  });

  const createStudentWithCertificate = async () => {
    const student = await userFactory
      .withCredentials({ password })
      .withUserSettings(db)
      .create({ role: SYSTEM_ROLE_SLUGS.STUDENT });
    const cookies = await cookieFor(student, app);
    const learningPath = await learningPathFactory.create({ includesCertificate: true });
    const [certificate] = await db
      .insert(learningPathCertificates)
      .values({ userId: student.id, learningPathId: learningPath.id })
      .returning();

    return { student, cookies, certificate };
  };

  describe("POST /api/learning-path/certificates/share-link", () => {
    it("returns a share URL keyed by an opaque token, not the certificate id", async () => {
      const { cookies, certificate } = await createStudentWithCertificate();

      const response = await request(app.getHttpServer())
        .post("/api/learning-path/certificates/share-link")
        .set("Cookie", cookies)
        .send({ certificateId: certificate.id, language: "en" })
        .expect(201);

      const shareUrl = new URL(response.body.shareUrl);
      expect(shareUrl.searchParams.get("token")).toEqual(expect.any(String));
      expect(shareUrl.searchParams.get("token")).not.toBe(certificate.id);
      expect(shareUrl.searchParams.has("certificateId")).toBe(false);
    });
  });

  describe("GET /api/learning-path/certificates/share", () => {
    it("returns 404 for a raw certificate id — the id alone must not resolve a share page", async () => {
      const { certificate } = await createStudentWithCertificate();

      await request(app.getHttpServer())
        .get("/api/learning-path/certificates/share")
        .query({ certificateId: certificate.id, lang: "en" })
        .expect(404);
    });

    it("returns 404 for an unknown token", async () => {
      await request(app.getHttpServer())
        .get("/api/learning-path/certificates/share")
        .query({ token: "not-a-real-token", lang: "en" })
        .expect(404);
    });

    it("serves the share page for a valid token, anonymously", async () => {
      const { cookies, certificate } = await createStudentWithCertificate();
      const created = await request(app.getHttpServer())
        .post("/api/learning-path/certificates/share-link")
        .set("Cookie", cookies)
        .send({ certificateId: certificate.id, language: "en" })
        .expect(201);
      const token = new URL(created.body.shareUrl).searchParams.get("token")!;

      const response = await request(app.getHttpServer())
        .get("/api/learning-path/certificates/share")
        .query({ token, lang: "en" })
        .expect(200);

      expect(response.headers["content-type"]).toContain("text/html");
    });
  });
});
