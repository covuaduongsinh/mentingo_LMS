import type { AssignmentDueDateReminderRecipient } from "src/assignments/types/assignment-due-date-reminder.types";

type AssignmentDueDateReminderEmailData = {
  recipients: AssignmentDueDateReminderRecipient[];
};

export class AssignmentDueDateReminderEmailEvent {
  constructor(
    public readonly assignmentDueDateReminderEmailData: AssignmentDueDateReminderEmailData,
  ) {}
}
