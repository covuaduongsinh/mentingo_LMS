import { USER_ROLE } from "~/config/userRoles";

import { expect, test } from "../../fixtures/test.fixture";

/**
 * Smoke: authenticated trainer can open the Study list page (Study depth S6).
 * Full create/import/gamebook/embed flows are covered by API unit tests in S1–S5;
 * this guards the route wiring and basic page shell.
 */
test("trainer opens chess studies list", async ({ withWorkerPage }) => {
  await withWorkerPage(USER_ROLE.content_creator, async ({ page }) => {
    await page.goto("/chess/studies");
    await expect(page.getByRole("heading", { name: /studies/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
