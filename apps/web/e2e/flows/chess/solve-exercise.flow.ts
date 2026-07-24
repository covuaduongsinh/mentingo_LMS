import { CHESS_BOARD_HANDLES, CHESS_PRACTICE_SOLVE_PAGE_HANDLES } from "../../data/chess/handles";

import type { Page } from "@playwright/test";

type SolveExerciseFlowInput = {
  exerciseId: string;
  /** UCI move, e.g. "a1a8" */
  solutionUci: string;
};

export const solveExerciseFlow = async (
  page: Page,
  { exerciseId, solutionUci }: SolveExerciseFlowInput,
) => {
  await page.goto(`/chess/practice/${exerciseId}`);

  const from = solutionUci.slice(0, 2);
  const to = solutionUci.slice(2, 4);

  await page.getByTestId(CHESS_BOARD_HANDLES.square(from)).click();
  await page.getByTestId(CHESS_BOARD_HANDLES.square(to)).click();
  await page.getByTestId(CHESS_PRACTICE_SOLVE_PAGE_HANDLES.SUBMIT_BUTTON).click();
};
