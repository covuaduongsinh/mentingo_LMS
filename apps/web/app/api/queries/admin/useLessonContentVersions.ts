import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

import type { SupportedLanguages } from "@repo/shared";

export const LESSON_CONTENT_VERSIONS_QUERY_KEY = ["lesson-content-versions"];

export function lessonContentVersionsQueryOptions(
  lessonId: string | undefined,
  language: SupportedLanguages,
  enabled: boolean,
) {
  return {
    queryKey: [...LESSON_CONTENT_VERSIONS_QUERY_KEY, lessonId, language],
    queryFn: async () => {
      const response = await ApiClient.api.lessonControllerGetLessonContentVersions(
        lessonId as string,
        { language },
      );
      return response.data.data;
    },
    enabled: Boolean(lessonId) && enabled,
  };
}

export function useLessonContentVersions(
  lessonId: string | undefined,
  language: SupportedLanguages,
  enabled: boolean,
) {
  return useQuery(lessonContentVersionsQueryOptions(lessonId, language, enabled));
}
