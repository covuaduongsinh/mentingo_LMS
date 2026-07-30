import { CLASSROOM_ADD_STUDENT_PAGE_HANDLES } from "../../data/classroom/handles";

import type { Page } from "@playwright/test";

/** Waits for the created student's name to render in the one-time credentials table before
 * returning — the create button's click resolves before the mutation does, and navigating away
 * immediately would abort the in-flight request. */
export const addClassroomStudentFlow = async (
  page: Page,
  classroomId: string,
  { realName }: { realName: string },
): Promise<void> => {
  await page.goto(`/classrooms/${classroomId}/students/add`);
  await page.getByTestId(CLASSROOM_ADD_STUDENT_PAGE_HANDLES.REALNAME_INPUT).fill(realName);
  await page.getByTestId(CLASSROOM_ADD_STUDENT_PAGE_HANDLES.SUBMIT_BUTTON).click();
  await page.getByText(realName, { exact: true }).first().waitFor({ state: "visible" });
};
