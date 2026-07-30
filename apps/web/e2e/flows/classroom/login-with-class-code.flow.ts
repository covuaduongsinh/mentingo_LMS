import { CLASS_LOGIN_PAGE_HANDLES } from "../../data/classroom/handles";

import type { Page } from "@playwright/test";

export const loginWithClassCodeFlow = async (page: Page, code: string): Promise<void> => {
  await page.goto("/class-login");
  await page.getByTestId(CLASS_LOGIN_PAGE_HANDLES.CODE_INPUT).fill(code);
  await page.getByTestId(CLASS_LOGIN_PAGE_HANDLES.SUBMIT_BUTTON).click();
};
