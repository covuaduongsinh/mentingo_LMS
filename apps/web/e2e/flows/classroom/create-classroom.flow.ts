import { CLASSROOM_LIST_PAGE_HANDLES } from "../../data/classroom/handles";

import type { Page } from "@playwright/test";

/** Creates a classroom through the real UI and returns the new classroom's id, read back off
 * the post-create redirect (`ClassroomList.page.tsx` does `window.location.assign`, a real
 * navigation `waitForURL` can observe). */
export const createClassroomFlow = async (
  page: Page,
  { name }: { name: string },
): Promise<string> => {
  await page.goto("/classrooms");
  await page.getByTestId(CLASSROOM_LIST_PAGE_HANDLES.CREATE_BUTTON).click();
  await page.getByTestId(CLASSROOM_LIST_PAGE_HANDLES.NAME_INPUT).fill(name);
  await page.getByTestId(CLASSROOM_LIST_PAGE_HANDLES.CREATE_SUBMIT).click();

  await page.waitForURL(/\/classrooms\/[^/]+$/);
  const classroomId = new URL(page.url()).pathname.split("/").filter(Boolean).pop();

  if (!classroomId) {
    throw new Error("Expected to be redirected to the new classroom's detail page");
  }

  return classroomId;
};
