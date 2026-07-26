import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";

import { AI_GENERATION_STATUS } from "../../repositories/ai-generations.repository";
import { QuizGenerationService } from "../quiz-generation.service";

import type { AiGenerationsRepository } from "../../repositories/ai-generations.repository";
import type { ChatService } from "../chat.service";
import type { CurrentUserType } from "src/common/types/current-user.type";
import type { SettingsService } from "src/settings/settings.service";

const SOURCE_LESSON_ID = "lesson-1";
const AUTHOR_ID = "author-1";

function buildCurrentUser(overrides: Partial<CurrentUserType> = {}): CurrentUserType {
  return {
    userId: AUTHOR_ID,
    permissions: [PERMISSIONS.COURSE_UPDATE_OWN],
    ...overrides,
  } as CurrentUserType;
}

describe("QuizGenerationService", () => {
  let chatService: jest.Mocked<ChatService>;
  let aiGenerationsRepository: jest.Mocked<AiGenerationsRepository>;
  let settingsService: jest.Mocked<SettingsService>;
  let service: QuizGenerationService;

  const longDescription = "<p>" + "Lesson content covering photosynthesis. ".repeat(5) + "</p>";

  beforeEach(() => {
    chatService = {
      generateStructured: jest.fn(),
    } as unknown as jest.Mocked<ChatService>;

    aiGenerationsRepository = {
      getSourceLessonWithCourseAuthor: jest.fn(),
      countCompletedThisMonth: jest.fn(),
      logGeneration: jest.fn(),
    } as unknown as jest.Mocked<AiGenerationsRepository>;

    settingsService = {
      getAiGenerationMonthlyLimit: jest.fn().mockResolvedValue(20),
    } as unknown as jest.Mocked<SettingsService>;

    service = new QuizGenerationService(chatService, aiGenerationsRepository, settingsService);
  });

  it("throws when the source lesson doesn't exist", async () => {
    aiGenerationsRepository.getSourceLessonWithCourseAuthor.mockResolvedValue(undefined as never);

    await expect(
      service.generateQuizQuestions(SOURCE_LESSON_ID, "en", 5, buildCurrentUser()),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws forbidden when the user doesn't own the course and lacks COURSE_UPDATE", async () => {
    aiGenerationsRepository.getSourceLessonWithCourseAuthor.mockResolvedValue({
      lessonId: SOURCE_LESSON_ID,
      title: "Photosynthesis",
      description: longDescription,
      courseAuthorId: "someone-else",
    } as never);

    await expect(
      service.generateQuizQuestions(
        SOURCE_LESSON_ID,
        "en",
        5,
        buildCurrentUser({ permissions: [PERMISSIONS.COURSE_UPDATE_OWN] }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("allows generation when the user holds COURSE_UPDATE regardless of authorship", async () => {
    aiGenerationsRepository.getSourceLessonWithCourseAuthor.mockResolvedValue({
      lessonId: SOURCE_LESSON_ID,
      title: "Photosynthesis",
      description: longDescription,
      courseAuthorId: "someone-else",
    } as never);
    aiGenerationsRepository.countCompletedThisMonth.mockResolvedValue(0);
    chatService.generateStructured.mockResolvedValue({
      questions: [{ title: "Q1", solutionExplanation: "because", options: [] }],
    } as never);

    const result = await service.generateQuizQuestions(
      SOURCE_LESSON_ID,
      "en",
      5,
      buildCurrentUser({ permissions: [PERMISSIONS.COURSE_UPDATE] }),
    );

    expect(result).toHaveLength(1);
  });

  it("rejects when the source lesson content is too short", async () => {
    aiGenerationsRepository.getSourceLessonWithCourseAuthor.mockResolvedValue({
      lessonId: SOURCE_LESSON_ID,
      title: "Hi",
      description: "<p>short</p>",
      courseAuthorId: AUTHOR_ID,
    } as never);

    await expect(
      service.generateQuizQuestions(SOURCE_LESSON_ID, "en", 5, buildCurrentUser()),
    ).rejects.toThrow(BadRequestException);

    expect(chatService.generateStructured).not.toHaveBeenCalled();
  });

  it("rejects once the monthly quota has been reached, without calling the AI provider", async () => {
    aiGenerationsRepository.getSourceLessonWithCourseAuthor.mockResolvedValue({
      lessonId: SOURCE_LESSON_ID,
      title: "Photosynthesis",
      description: longDescription,
      courseAuthorId: AUTHOR_ID,
    } as never);
    aiGenerationsRepository.countCompletedThisMonth.mockResolvedValue(20);

    await expect(
      service.generateQuizQuestions(SOURCE_LESSON_ID, "en", 5, buildCurrentUser()),
    ).rejects.toThrow(BadRequestException);

    expect(chatService.generateStructured).not.toHaveBeenCalled();
  });

  it("logs a completed generation and returns the generated questions on success", async () => {
    aiGenerationsRepository.getSourceLessonWithCourseAuthor.mockResolvedValue({
      lessonId: SOURCE_LESSON_ID,
      title: "Photosynthesis",
      description: longDescription,
      courseAuthorId: AUTHOR_ID,
    } as never);
    aiGenerationsRepository.countCompletedThisMonth.mockResolvedValue(3);
    chatService.generateStructured.mockResolvedValue({
      questions: [
        {
          title: "What is photosynthesis?",
          solutionExplanation: "It converts light into energy.",
          options: [
            { optionText: "A chemical process", isCorrect: true },
            { optionText: "A physical process", isCorrect: false },
          ],
        },
      ],
    } as never);

    const result = await service.generateQuizQuestions(
      SOURCE_LESSON_ID,
      "en",
      5,
      buildCurrentUser(),
    );

    expect(result).toHaveLength(1);
    expect(aiGenerationsRepository.logGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ status: AI_GENERATION_STATUS.COMPLETED }),
    );
  });

  it("logs a failed generation and rethrows when the AI call fails", async () => {
    aiGenerationsRepository.getSourceLessonWithCourseAuthor.mockResolvedValue({
      lessonId: SOURCE_LESSON_ID,
      title: "Photosynthesis",
      description: longDescription,
      courseAuthorId: AUTHOR_ID,
    } as never);
    aiGenerationsRepository.countCompletedThisMonth.mockResolvedValue(0);
    chatService.generateStructured.mockRejectedValue(new Error("provider down"));

    await expect(
      service.generateQuizQuestions(SOURCE_LESSON_ID, "en", 5, buildCurrentUser()),
    ).rejects.toThrow("provider down");

    expect(aiGenerationsRepository.logGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ status: AI_GENERATION_STATUS.FAILED }),
    );
  });
});
