import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, getTableColumns, notInArray, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { lessonContentVersions, users } from "src/storage/schema";

import type { SupportedLanguages } from "@repo/shared";

export const MAX_LESSON_CONTENT_VERSIONS = 20;
const EXCERPT_MAX_LENGTH = 100;

function toExcerpt(html: string | null): string {
  if (!html) return "";

  const plainText = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return plainText.length > EXCERPT_MAX_LENGTH
    ? `${plainText.slice(0, EXCERPT_MAX_LENGTH - 1)}…`
    : plainText;
}

type CreateSnapshotData = {
  lessonId: UUIDType;
  language: SupportedLanguages;
  title: string | null;
  description: string | null;
  createdBy: UUIDType | null;
};

@Injectable()
export class LessonContentVersionsRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async createSnapshot(data: CreateSnapshotData, dbInstance: DatabasePg = this.db) {
    const [{ nextVersionNumber }] = await dbInstance
      .select({
        nextVersionNumber: sql<number>`COALESCE(MAX(${lessonContentVersions.versionNumber}), 0) + 1`,
      })
      .from(lessonContentVersions)
      .where(eq(lessonContentVersions.lessonId, data.lessonId));

    const [snapshot] = await dbInstance
      .insert(lessonContentVersions)
      .values({ ...data, versionNumber: nextVersionNumber })
      .returning();

    return snapshot;
  }

  async pruneOldVersions(
    lessonId: UUIDType,
    maxVersions: number = MAX_LESSON_CONTENT_VERSIONS,
    dbInstance: DatabasePg = this.db,
  ) {
    const keptVersionIds = await dbInstance
      .select({ id: lessonContentVersions.id })
      .from(lessonContentVersions)
      .where(eq(lessonContentVersions.lessonId, lessonId))
      .orderBy(desc(lessonContentVersions.versionNumber))
      .limit(maxVersions);

    if (keptVersionIds.length < maxVersions) return;

    await dbInstance.delete(lessonContentVersions).where(
      and(
        eq(lessonContentVersions.lessonId, lessonId),
        notInArray(
          lessonContentVersions.id,
          keptVersionIds.map(({ id }) => id),
        ),
      ),
    );
  }

  async listVersions(lessonId: UUIDType, language: SupportedLanguages) {
    const versions = await this.db
      .select({
        id: lessonContentVersions.id,
        versionNumber: lessonContentVersions.versionNumber,
        description: lessonContentVersions.description,
        createdAt: lessonContentVersions.createdAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(lessonContentVersions)
      .leftJoin(users, eq(users.id, lessonContentVersions.createdBy))
      .where(
        and(
          eq(lessonContentVersions.lessonId, lessonId),
          eq(lessonContentVersions.language, language),
        ),
      )
      .orderBy(desc(lessonContentVersions.versionNumber));

    return versions.map(({ description, createdByFirstName, createdByLastName, ...rest }) => ({
      ...rest,
      excerpt: toExcerpt(description),
      createdByName:
        createdByFirstName && createdByLastName
          ? `${createdByFirstName} ${createdByLastName}`
          : null,
    }));
  }

  async getVersionById(versionId: UUIDType) {
    const [version] = await this.db
      .select({ ...getTableColumns(lessonContentVersions) })
      .from(lessonContentVersions)
      .where(eq(lessonContentVersions.id, versionId));

    return version;
  }
}
