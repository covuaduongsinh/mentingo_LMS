import { USER_ROLE } from "~/config/userRoles";

import { expect, test } from "../../fixtures/test.fixture";

/**
 * Smoke: authenticated user with chess.learn access can open Learn stages map.
 */
test("user opens chess learn stages map", async ({ withWorkerPage }) => {
  await withWorkerPage(USER_ROLE.contentCreator, async ({ page }) => {
    await page.goto("/chess/learn");
    await expect(page.getByTestId("chess-learn-title")).toBeVisible({ timeout: 30_000 });
  });
});
