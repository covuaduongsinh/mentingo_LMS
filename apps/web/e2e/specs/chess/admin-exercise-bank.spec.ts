import { randomUUID } from "node:crypto";

import { USER_ROLE } from "~/config/userRoles";

import { CHESS_ADMIN_EXERCISES_PAGE_HANDLES } from "../../data/chess/handles";
import { expect, test } from "../../fixtures/test.fixture";
import { createChessExerciseFlow } from "../../flows/chess/admin-create-exercise.flow";

test("admin creates a chess exercise from the bank and can publish/delete it", async ({
  cleanup,
  factories,
  withWorkerPage,
}) => {
  await withWorkerPage(USER_ROLE.admin, async ({ page }) => {
    const exerciseFactory = factories.createChessExerciseFactory();
    const title = `E2E Admin Chess Exercise ${randomUUID().slice(0, 8)}`;

    cleanup.add(async () => {
      const existing = await exerciseFactory.findByTitle(title);
      if (existing) {
        await exerciseFactory.delete(existing.id);
      }
    });

    await createChessExerciseFlow(page, { title });

    await expect.poll(() => exerciseFactory.findByTitle(title)).not.toBeNull();
    const created = await exerciseFactory.findByTitle(title);
    if (!created) {
      throw new Error("Expected the created chess exercise to be findable by title");
    }

    await expect(
      page.getByTestId(CHESS_ADMIN_EXERCISES_PAGE_HANDLES.row(created.id)),
    ).toBeVisible();

    await page.getByTestId(CHESS_ADMIN_EXERCISES_PAGE_HANDLES.publishButton(created.id)).click();

    await expect
      .poll(async () => (await exerciseFactory.getById(created.id)).published)
      .toBe(!created.published);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId(CHESS_ADMIN_EXERCISES_PAGE_HANDLES.deleteButton(created.id)).click();

    await expect.poll(async () => exerciseFactory.findByTitle(title)).toBeNull();
  });
});
