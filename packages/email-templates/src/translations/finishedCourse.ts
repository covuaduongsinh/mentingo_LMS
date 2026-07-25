import { SupportedLanguages } from "@repo/shared";
import { EmailContent } from "types";

export const getFinishedCourseEmailTranslations = (
  language: SupportedLanguages,
  userName: string,
  courseName: string,
) => {
  const emailContent: Record<SupportedLanguages, EmailContent> = {
    en: {
      heading: "User finished the course",
      paragraphs: ["Hello! 🧑‍💻", `${userName} completed ${courseName}. Review their progress.`],
      buttonText: "VIEW PROGRESS",
    },
    pl: {
      heading: "Użytkownik ukończył kurs",
      paragraphs: [
        "Cześć! 🧑‍💻",
        `${userName} ukończył(-a) kurs ${courseName}. Sprawdź jego postępy.`,
      ],
      buttonText: "ZOBACZ POSTĘPY",
    },
    de: {
      heading: "Benutzer hat den Kurs abgeschlossen",
      paragraphs: [
        "Hallo! 🧑‍💻",
        `${userName} hat ${courseName} abgeschlossen. Prüfe den Fortschritt.`,
      ],
      buttonText: "FORTSCHRITT ANSEHEN",
    },
    lt: {
      heading: "Naudotojas baigė kursą",
      paragraphs: ["Sveiki! 🧑‍💻", `${userName} baigė kursą ${courseName}. Peržiūrėk pažangą.`],
      buttonText: "PERŽIŪRĖTI PAŽANGĄ",
    },
    cs: {
      heading: "Uživatel dokončil kurz",
      paragraphs: [
        "Ahoj! 🧑‍💻",
        `${userName} dokončil(a) kurz ${courseName}. Zkontroluj jeho pokrok.`,
      ],
      buttonText: "ZOBRAZIT POKROK",
    },
    es: {
      heading: "Usuario completó el curso",
      paragraphs: ["¡Hola! 🧑‍💻", `${userName} completó ${courseName}. Revisa su progreso.`],
      buttonText: "VER PROGRESO",
    },
    vi: {
      heading: "Người dùng đã hoàn thành khóa học",
      paragraphs: [
        "Xin chào! 🧑‍💻",
        `${userName} đã hoàn thành ${courseName}. Hãy xem lại tiến độ của họ.`,
      ],
      buttonText: "XEM TIẾN ĐỘ",
    },
  };

  return emailContent[language];
};
