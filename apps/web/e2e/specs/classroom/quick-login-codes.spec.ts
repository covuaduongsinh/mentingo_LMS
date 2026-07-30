import { randomUUID } from "node:crypto";

import { USER_ROLE } from "~/config/userRoles";

import { NAVIGATION_HANDLES } from "../../data/navigation/handles";
import { TEST_DATA } from "../../data/test-data/entity-name.data";
import { expect, test } from "../../fixtures/test.fixture";
import { addClassroomStudentFlow } from "../../flows/classroom/add-classroom-student.flow";
import { createClassroomFlow } from "../../flows/classroom/create-classroom.flow";
import { generateLoginCodesFlow } from "../../flows/classroom/generate-login-codes.flow";
import { loginWithClassCodeFlow } from "../../flows/classroom/login-with-class-code.flow";

test("a teacher generates a login code for a managed student, and the student logs in with it", async ({
  cleanup,
  createWorkspacePage,
  factories,
  withWorkerPage,
}) => {
  const classroomName = `${TEST_DATA.classroom.namePrefix} ${randomUUID().slice(0, 8)}`;
  const studentName = `${TEST_DATA.classroom.studentNamePrefix} ${randomUUID().slice(0, 8)}`;

  let code = "";

  await withWorkerPage(USER_ROLE.admin, async ({ page }) => {
    const classroomId = await createClassroomFlow(page, { name: classroomName });

    cleanup.add(async () => {
      await factories.createClassroomFactory().archive(classroomId);
    });

    await addClassroomStudentFlow(page, classroomId, { realName: studentName });
    code = await generateLoginCodesFlow(page, classroomId);
  });

  const student = await createWorkspacePage();
  try {
    await loginWithClassCodeFlow(student.page, code);

    await expect(student.page.getByTestId(NAVIGATION_HANDLES.PROFILE_FOOTER)).toBeVisible();
    await expect(student.page).toHaveURL("/");
  } finally {
    await student.context.close();
  }
});

test("a used login code cannot be reused", async ({
  cleanup,
  createWorkspacePage,
  factories,
  withWorkerPage,
}) => {
  const classroomName = `${TEST_DATA.classroom.namePrefix} ${randomUUID().slice(0, 8)}`;
  const studentName = `${TEST_DATA.classroom.studentNamePrefix} ${randomUUID().slice(0, 8)}`;

  let code = "";

  await withWorkerPage(USER_ROLE.admin, async ({ page }) => {
    const classroomId = await createClassroomFlow(page, { name: classroomName });

    cleanup.add(async () => {
      await factories.createClassroomFactory().archive(classroomId);
    });

    await addClassroomStudentFlow(page, classroomId, { realName: studentName });
    code = await generateLoginCodesFlow(page, classroomId);
  });

  const firstAttempt = await createWorkspacePage();
  try {
    await loginWithClassCodeFlow(firstAttempt.page, code);
    await expect(firstAttempt.page.getByTestId(NAVIGATION_HANDLES.PROFILE_FOOTER)).toBeVisible();
  } finally {
    await firstAttempt.context.close();
  }

  const secondAttempt = await createWorkspacePage();
  try {
    await loginWithClassCodeFlow(secondAttempt.page, code);

    await expect(secondAttempt.page).toHaveURL("/class-login");
    await expect(
      secondAttempt.page.getByTestId(NAVIGATION_HANDLES.PROFILE_FOOTER),
    ).not.toBeVisible();
  } finally {
    await secondAttempt.context.close();
  }
});
