import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_STUDY_LESSON_QUERY_KEY = ["chess-study-lesson"] as const;

export function useChessStudyLessonForLearner(lessonId: string | undefined) {
  return useQuery(
    queryOptions({
      queryKey: [...CHESS_STUDY_LESSON_QUERY_KEY, lessonId],
      enabled: Boolean(lessonId),
      queryFn: async () => {
        const api = ApiClient.api as typeof ApiClient.api & {
          chessControllerGetChessStudyLessonForLearner: (
            lessonId: string,
          ) => Promise<{ data: { data: ChessStudyLessonLearnerView } }>;
        };
        const response = await api.chessControllerGetChessStudyLessonForLearner(lessonId!);
        return response.data.data;
      },
    }),
  );
}

export type ChessStudyLessonLearnerView = {
  lessonId: string;
  studyId: string | null;
  studyChapterId: string | null;
  studyMissing: boolean;
  study: {
    id: string;
    title: string;
    description: string | null;
    chapters: Array<{
      id: string;
      title: string;
      rootFen: string;
      moveNodes: Array<Record<string, unknown>>;
      mode: string;
      concealFromPly: number | null;
      orientation?: "white" | "black";
      practiceGoalType?: string | null;
      practiceGoal?: string | null;
      practiceGoalTargetValue?: number | null;
    }>;
    canWrite: boolean;
  } | null;
};
