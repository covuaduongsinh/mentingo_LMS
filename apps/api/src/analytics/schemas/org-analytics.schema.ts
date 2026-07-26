import { Type } from "@sinclair/typebox";

import type { Static } from "@sinclair/typebox";

export const dauTrendItemSchema = Type.Object({
  date: Type.String(),
  activeUsers: Type.Number(),
});

export const dauTrendSchema = Type.Array(dauTrendItemSchema);

export const newVsReturningItemSchema = Type.Object({
  date: Type.String(),
  newUsers: Type.Number(),
  returningUsers: Type.Number(),
});

export const newVsReturningSchema = Type.Array(newVsReturningItemSchema);

export const weekdayActivityItemSchema = Type.Object({
  weekday: Type.Number(),
  activityCount: Type.Number(),
});

export const weekdayActivitySchema = Type.Array(weekdayActivityItemSchema);

export const cohortRetentionRowSchema = Type.Object({
  cohortWeek: Type.String(),
  cohortSize: Type.Number(),
  retention: Type.Array(
    Type.Object({
      weekOffset: Type.Number(),
      percentage: Type.Union([Type.Number(), Type.Null()]),
    }),
  ),
});

export const cohortRetentionSchema = Type.Array(cohortRetentionRowSchema);

export const scoreDistributionBucketSchema = Type.Object({
  bucket: Type.String(),
  count: Type.Number(),
});

export const scoreDistributionSchema = Type.Object({
  quiz: Type.Array(scoreDistributionBucketSchema),
  assignment: Type.Array(scoreDistributionBucketSchema),
});

export const certificateIssuanceRateSchema = Type.Object({
  completedCount: Type.Number(),
  certifiedCount: Type.Number(),
  percentage: Type.Number(),
});

export const engagementScoreSchema = Type.Object({
  score: Type.Number(),
  components: Type.Object({
    recentActivityRatio: Type.Number(),
    courseCompletionRatio: Type.Number(),
    quizPassRatio: Type.Number(),
  }),
});

export type DauTrendResponse = Static<typeof dauTrendSchema>;
export type NewVsReturningResponse = Static<typeof newVsReturningSchema>;
export type WeekdayActivityResponse = Static<typeof weekdayActivitySchema>;
export type CohortRetentionResponse = Static<typeof cohortRetentionSchema>;
export type ScoreDistributionResponse = Static<typeof scoreDistributionSchema>;
export type CertificateIssuanceRateResponse = Static<typeof certificateIssuanceRateSchema>;
export type EngagementScoreResponse = Static<typeof engagementScoreSchema>;
