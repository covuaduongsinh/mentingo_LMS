import type { ASSIGNMENT_DUE_DATE_REMINDER_DAYS } from "../constants/assignment-due-date-reminders.constants";
import type { UUIDType } from "src/common";
import type { DefaultEmailSettings } from "src/events/types";

export type AssignmentDueDateReminderDays = (typeof ASSIGNMENT_DUE_DATE_REMINDER_DAYS)[number];

export type AssignmentDueDateReminderRecipient = {
  studentId: UUIDType;
  studentEmail: string;
  tenantId: UUIDType;
  tenantHost: string;
  lessonId: UUIDType;
  courseId: UUIDType;
  courseAuthorId: UUIDType;
  assignmentName: string;
  dueDate: string;
  daysBeforeDueDate: AssignmentDueDateReminderDays;
  defaultEmailSettings: DefaultEmailSettings;
};
