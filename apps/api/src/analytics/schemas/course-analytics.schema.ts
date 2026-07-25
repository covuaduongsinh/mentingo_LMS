import { Type } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";

import type { Static } from "@sinclair/typebox";

export const lessonCompletionFunnelItemSchema = Type.Object({
  lessonId: UUIDSchema,
  chapterId: UUIDSchema,
  lessonTitle: Type.String(),
  chapterOrder: Type.Union([Type.Number(), Type.Null()]),
  lessonOrder: Type.Union([Type.Number(), Type.Null()]),
  enrolledCount: Type.Number(),
  completedCount: Type.Number(),
  completionPercentage: Type.Number(),
});

export const lessonCompletionFunnelSchema = Type.Array(lessonCompletionFunnelItemSchema);

export const chapterDropoffItemSchema = Type.Object({
  chapterId: UUIDSchema,
  chapterTitle: Type.String(),
  chapterOrder: Type.Union([Type.Number(), Type.Null()]),
  enrolledCount: Type.Number(),
  completedCount: Type.Number(),
  completionPercentage: Type.Number(),
  dropoffPercentage: Type.Number(),
});

export const chapterDropoffSchema = Type.Array(chapterDropoffItemSchema);

export const completionVelocityBucketSchema = Type.Object({
  bucket: Type.String(),
  count: Type.Number(),
});

export const completionVelocitySchema = Type.Object({
  completedCount: Type.Number(),
  averageDays: Type.Number(),
  medianDays: Type.Number(),
  distribution: Type.Array(completionVelocityBucketSchema),
});

export const topLearnerItemSchema = Type.Object({
  studentId: UUIDSchema,
  studentName: Type.String(),
  totalSeconds: Type.Number(),
  completedLessonCount: Type.Number(),
});

export const topLearnersSchema = Type.Array(topLearnerItemSchema);

export type LessonCompletionFunnelItem = Static<typeof lessonCompletionFunnelItemSchema>;
export type LessonCompletionFunnelResponse = Static<typeof lessonCompletionFunnelSchema>;
export type ChapterDropoffItem = Static<typeof chapterDropoffItemSchema>;
export type ChapterDropoffResponse = Static<typeof chapterDropoffSchema>;
export type CompletionVelocityResponse = Static<typeof completionVelocitySchema>;
export type TopLearnerItem = Static<typeof topLearnerItemSchema>;
export type TopLearnersResponse = Static<typeof topLearnersSchema>;
