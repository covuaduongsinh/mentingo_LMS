import { getAssignmentDueDateReminderEmailTranslations } from "translations/assignmentDueDateReminder";

import BaseEmailTemplate from "./BaseEmailTemplate";

import { DefaultEmailSettings } from "types";

export type AssignmentDueDateReminderEmailProps = {
  assignmentName: string;
  assignmentLink: string;
  daysBeforeDueDate: number;
} & DefaultEmailSettings;

export const AssignmentDueDateReminderEmail = ({
  assignmentName,
  assignmentLink,
  daysBeforeDueDate,
  primaryColor,
  companyName,
  language = "en",
}: AssignmentDueDateReminderEmailProps) => {
  const { heading, paragraphs, buttonText } = getAssignmentDueDateReminderEmailTranslations(
    language,
    assignmentName,
    daysBeforeDueDate,
  );

  return BaseEmailTemplate({
    heading,
    paragraphs,
    buttonText,
    buttonLink: assignmentLink,
    primaryColor,
    companyName,
  });
};

export default AssignmentDueDateReminderEmail;
