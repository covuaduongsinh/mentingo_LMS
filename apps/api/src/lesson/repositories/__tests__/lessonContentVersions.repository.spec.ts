import {
  LessonContentVersionsRepository,
  MAX_LESSON_CONTENT_VERSIONS,
} from "../lessonContentVersions.repository";

import type { DatabasePg } from "src/common";

const LESSON_ID = "lesson-1";

describe("LessonContentVersionsRepository", () => {
  describe("createSnapshot", () => {
    it("computes the next version number as the current max + 1", async () => {
      const where = jest.fn().mockResolvedValue([{ nextVersionNumber: 4 }]);
      const from = jest.fn().mockReturnValue({ where });
      const select = jest.fn().mockReturnValue({ from });

      const returning = jest.fn().mockResolvedValue([{ id: "version-4", versionNumber: 4 }]);
      const values = jest.fn().mockReturnValue({ returning });
      const insert = jest.fn().mockReturnValue({ values });

      const db = { select, insert } as unknown as DatabasePg;
      const repository = new LessonContentVersionsRepository(db);

      const snapshot = await repository.createSnapshot({
        lessonId: LESSON_ID,
        language: "en",
        title: "Old title",
        description: "<p>Old description</p>",
        createdBy: "user-1",
      });

      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({ lessonId: LESSON_ID, versionNumber: 4 }),
      );
      expect(snapshot).toEqual({ id: "version-4", versionNumber: 4 });
    });

    it("starts numbering at 1 when the lesson has no prior versions", async () => {
      const where = jest.fn().mockResolvedValue([{ nextVersionNumber: 1 }]);
      const from = jest.fn().mockReturnValue({ where });
      const select = jest.fn().mockReturnValue({ from });

      const returning = jest.fn().mockResolvedValue([{ id: "version-1", versionNumber: 1 }]);
      const values = jest.fn().mockReturnValue({ returning });
      const insert = jest.fn().mockReturnValue({ values });

      const db = { select, insert } as unknown as DatabasePg;
      const repository = new LessonContentVersionsRepository(db);

      await repository.createSnapshot({
        lessonId: LESSON_ID,
        language: "en",
        title: null,
        description: null,
        createdBy: null,
      });

      expect(values).toHaveBeenCalledWith(expect.objectContaining({ versionNumber: 1 }));
    });
  });

  describe("pruneOldVersions", () => {
    it("does nothing when the lesson has fewer versions than the max allowed", async () => {
      const keptIds = Array.from({ length: MAX_LESSON_CONTENT_VERSIONS - 1 }, (_, i) => ({
        id: `version-${i}`,
      }));
      const limit = jest.fn().mockResolvedValue(keptIds);
      const orderBy = jest.fn().mockReturnValue({ limit });
      const where = jest.fn().mockReturnValue({ orderBy });
      const from = jest.fn().mockReturnValue({ where });
      const select = jest.fn().mockReturnValue({ from });
      const deleteFn = jest.fn();

      const db = { select, delete: deleteFn } as unknown as DatabasePg;
      const repository = new LessonContentVersionsRepository(db);

      await repository.pruneOldVersions(LESSON_ID);

      expect(deleteFn).not.toHaveBeenCalled();
    });

    it("deletes everything outside the newest MAX_LESSON_CONTENT_VERSIONS when the limit is exceeded", async () => {
      const keptIds = Array.from({ length: MAX_LESSON_CONTENT_VERSIONS }, (_, i) => ({
        id: `version-${i}`,
      }));
      const limit = jest.fn().mockResolvedValue(keptIds);
      const orderBy = jest.fn().mockReturnValue({ limit });
      const selectWhere = jest.fn().mockReturnValue({ orderBy });
      const from = jest.fn().mockReturnValue({ where: selectWhere });
      const select = jest.fn().mockReturnValue({ from });

      const deleteWhere = jest.fn().mockResolvedValue(undefined);
      const deleteFn = jest.fn().mockReturnValue({ where: deleteWhere });

      const db = { select, delete: deleteFn } as unknown as DatabasePg;
      const repository = new LessonContentVersionsRepository(db);

      await repository.pruneOldVersions(LESSON_ID, MAX_LESSON_CONTENT_VERSIONS);

      expect(deleteFn).toHaveBeenCalledTimes(1);
      expect(deleteWhere).toHaveBeenCalledTimes(1);
    });
  });

  describe("listVersions", () => {
    it("derives a plain-text excerpt and a combined author name from raw rows", async () => {
      const rows = [
        {
          id: "version-2",
          versionNumber: 2,
          description: "<p>Hello <strong>world</strong></p>",
          createdAt: "2026-01-02T00:00:00.000Z",
          createdByFirstName: "Ada",
          createdByLastName: "Lovelace",
        },
        {
          id: "version-1",
          versionNumber: 1,
          description: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          createdByFirstName: null,
          createdByLastName: null,
        },
      ];
      const orderBy = jest.fn().mockResolvedValue(rows);
      const where = jest.fn().mockReturnValue({ orderBy });
      const leftJoin = jest.fn().mockReturnValue({ where });
      const from = jest.fn().mockReturnValue({ leftJoin });
      const select = jest.fn().mockReturnValue({ from });

      const db = { select } as unknown as DatabasePg;
      const repository = new LessonContentVersionsRepository(db);

      const result = await repository.listVersions(LESSON_ID, "en");

      expect(result[0]).toMatchObject({
        id: "version-2",
        excerpt: "Hello world",
        createdByName: "Ada Lovelace",
      });
      expect(result[1]).toMatchObject({
        id: "version-1",
        excerpt: "",
        createdByName: null,
      });
    });
  });
});
