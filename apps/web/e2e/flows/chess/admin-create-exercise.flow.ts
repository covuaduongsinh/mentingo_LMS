import { CHESS_ADMIN_EXERCISES_PAGE_HANDLES } from "../../data/chess/handles";

import type { Page } from "@playwright/test";

export const createChessExerciseFlow = async (page: Page, { title }: { title: string }) => {
  await page.goto("/admin/chess/exercises");
  await page.getByTestId(CHESS_ADMIN_EXERCISES_PAGE_HANDLES.ADD_BUTTON).click();
  await page.getByTestId(CHESS_ADMIN_EXERCISES_PAGE_HANDLES.TITLE_INPUT).fill(title);
  await page.getByTestId(CHESS_ADMIN_EXERCISES_PAGE_HANDLES.SAVE_BUTTON).click();
};
