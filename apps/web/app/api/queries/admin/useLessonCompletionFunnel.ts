import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "../../api-client";

import type { GetLessonCompletionFunnelResponse } from "~/api/generated-api";

export const LESSON_COMPLETION_FUNNEL_QUERY_KEY = ["lesson-completion-funnel", "admin"];

interface LessonCompletionFunnelQueryOptions {
  id: string;
  enabled?: boolean;
}

export const lessonCompletionFunnelQueryOptions = ({
  id,
  enabled,
}: LessonCompletionFunnelQueryOptions) =>
  queryOptions({
    enabled,
    queryKey: [LESSON_COMPLETION_FUNNEL_QUERY_KEY, { id }],
    queryFn: async () => {
      const response = await ApiClient.api.courseAnalyticsControllerGetLessonCompletionFunnel(id);

      return response.data;
    },
    select: (data: GetLessonCompletionFunnelResponse) => data.data,
  });

export function useLessonCompletionFunnel({ id, enabled }: LessonCompletionFunnelQueryOptions) {
  return useQuery(lessonCompletionFunnelQueryOptions({ id, enabled }));
}
