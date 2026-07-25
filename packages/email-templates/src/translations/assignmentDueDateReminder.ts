import { SupportedLanguages } from "@repo/shared";
import { EmailContent } from "types";

import { getDaysLabel } from "./courseDueDateReminder";

export const getAssignmentDueDateReminderEmailTranslations = (
  language: SupportedLanguages,
  assignmentName: string,
  daysBeforeDueDate: number,
) => {
  const daysLabel = getDaysLabel(language, daysBeforeDueDate);

  const emailContent: Record<SupportedLanguages, EmailContent> = {
    en: {
      heading: "Assignment deadline approaching",
      paragraphs: [`The deadline to submit assignment "${assignmentName}" is ${daysLabel}.`],
      buttonText: "OPEN ASSIGNMENT",
    },
    pl: {
      heading: "Zbliża się termin zadania",
      paragraphs: [`Termin złożenia zadania "${assignmentName}" mija ${daysLabel}.`],
      buttonText: "OTWÓRZ ZADANIE",
    },
    de: {
      heading: "Aufgabenfrist naht",
      paragraphs: [`Die Frist zur Abgabe der Aufgabe "${assignmentName}" endet ${daysLabel}.`],
      buttonText: "AUFGABE ÖFFNEN",
    },
    lt: {
      heading: "Artėja užduoties terminas",
      paragraphs: [`Užduoties "${assignmentName}" pateikimo terminas baigiasi ${daysLabel}.`],
      buttonText: "ATIDARYTI UŽDUOTĮ",
    },
    cs: {
      heading: "Termín úkolu se blíží",
      paragraphs: [`Termín odevzdání úkolu "${assignmentName}" vyprší ${daysLabel}.`],
      buttonText: "OTEVŘÍT ÚKOL",
    },
    es: {
      heading: "Se acerca la fecha límite de la tarea",
      paragraphs: [`La fecha límite para entregar la tarea "${assignmentName}" es ${daysLabel}.`],
      buttonText: "ABRIR TAREA",
    },
    vi: {
      heading: "Sắp đến hạn nộp bài tập",
      paragraphs: [`Hạn nộp bài tập "${assignmentName}" là ${daysLabel}.`],
      buttonText: "MỞ BÀI TẬP",
    },
  };

  return emailContent[language];
};
