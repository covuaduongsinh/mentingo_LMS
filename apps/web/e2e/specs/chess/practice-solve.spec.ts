import { USER_ROLE } from "~/config/userRoles";

import { CHESS_PRACTICE_SOLVE_PAGE_HANDLES } from "../../data/chess/handles";
import { CHESS_TEST_DATA } from "../../data/test-data/chess.data";
import { expect, test } from "../../fixtures/test.fixture";
import { solveExerciseFlow } from "../../flows/chess/solve-exercise.flow";

test("student solves a published mate-in-one exercise and sees correct feedback", async ({
  cleanup,
  factories,
  withWorkerPage,
}) => {
  await withWorkerPage(USER_ROLE.student, async ({ page }) => {
    const exerciseFactory = factories.createChessExerciseFactory();
    const exercise = await exerciseFactory.create();

    cleanup.add(async () => {
      await exerciseFactory.delete(exercise.id);
    });

    await solveExerciseFlow(page, {
      exerciseId: exercise.id,
      solutionUci: CHESS_TEST_DATA.exercise.mateInOneSolutionUci,
    });

    await expect(
      page.getByTestId(CHESS_PRACTICE_SOLVE_PAGE_HANDLES.FEEDBACK_CORRECT),
    ).toBeVisible();
  });
});
