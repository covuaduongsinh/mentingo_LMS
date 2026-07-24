import { USER_ROLE } from "~/config/userRoles";

import { CHESS_PLAY_PAGE_HANDLES } from "../../data/chess/handles";
import { expect, test } from "../../fixtures/test.fixture";
import {
  makeBoardMoveFlow,
  resignGameFlow,
  startNewGameAsWhiteFlow,
} from "../../flows/chess/play-engine-move.flow";

// The engine (Arasan or the builtin MIT fallback, whichever is configured on the API
// under test) replies with whatever it judges best — never assert a specific move,
// only that a legal reply landed. No factory-created fixture, no DELETE endpoint for
// play sessions: this spec is willing to leave a residual session row per worker run.
test("student plays a move, the engine replies, and resigning saves the session", async ({
  factories,
  withWorkerPage,
}) => {
  await withWorkerPage(USER_ROLE.student, async ({ page }) => {
    await startNewGameAsWhiteFlow(page);
    await makeBoardMoveFlow(page, "e2e4");

    await expect
      .poll(async () => {
        const text = await page.getByTestId(CHESS_PLAY_PAGE_HANDLES.MOVES_LIST).innerText();
        return text.trim().split(/\s+/).filter(Boolean).length;
      })
      .toBeGreaterThanOrEqual(2);

    await resignGameFlow(page);

    await expect(page.getByTestId(CHESS_PLAY_PAGE_HANDLES.RESIGN_BUTTON)).toBeDisabled();

    const sessionFactory = factories.createChessPlaySessionFactory();
    await expect
      .poll(async () => sessionFactory.findLatestByEndReason("resignation"))
      .not.toBeNull();
  });
});
