import { CLASSROOM_STUDENTS_PAGE_HANDLES } from "../../data/classroom/handles";

import type { Page } from "@playwright/test";

/** Opens the "Generate login codes" dialog (which fires the request as soon as it opens) and
 * returns the first generated code's text. Assumes exactly one managed student in the
 * classroom — callers with more than one should read `page.getByTestId(LOGIN_CODE)` directly. */
export const generateLoginCodesFlow = async (page: Page, classroomId: string): Promise<string> => {
  await page.goto(`/classrooms/${classroomId}/students`);
  await page.getByTestId(CLASSROOM_STUDENTS_PAGE_HANDLES.GENERATE_LOGIN_CODES_TRIGGER).click();

  const codeCell = page.getByTestId(CLASSROOM_STUDENTS_PAGE_HANDLES.LOGIN_CODE).first();
  await codeCell.waitFor({ state: "visible" });
  const code = await codeCell.textContent();

  if (!code?.trim()) {
    throw new Error("Expected a login code to be generated");
  }

  return code.trim();
};
