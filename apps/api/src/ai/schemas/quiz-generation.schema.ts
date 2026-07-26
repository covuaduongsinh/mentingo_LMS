import { Type } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";
import { supportedLanguagesSchema } from "src/courses/schemas/course.schema";

import type { Static } from "@sinclair/typebox";

export const generateQuizQuestionsBodySchema = Type.Object({
  sourceLessonId: UUIDSchema,
  language: supportedLanguagesSchema,
  questionCount: Type.Integer({ minimum: 1, maximum: 10, default: 5 }),
});

export const aiGeneratedQuizOptionSchema = Type.Object({
  optionText: Type.String(),
  isCorrect: Type.Boolean(),
});

export const aiGeneratedQuizQuestionSchema = Type.Object({
  title: Type.String(),
  solutionExplanation: Type.String(),
  options: Type.Array(aiGeneratedQuizOptionSchema),
});

export const aiGeneratedQuizSchema = Type.Object({
  questions: Type.Array(aiGeneratedQuizQuestionSchema),
});

export const generateQuizQuestionsResponseSchema = Type.Array(aiGeneratedQuizQuestionSchema);

export type GenerateQuizQuestionsBody = Static<typeof generateQuizQuestionsBodySchema>;
export type AiGeneratedQuizQuestion = Static<typeof aiGeneratedQuizQuestionSchema>;
export type AiGeneratedQuiz = Static<typeof aiGeneratedQuizSchema>;
export type GenerateQuizQuestionsResponse = Static<typeof generateQuizQuestionsResponseSchema>;
