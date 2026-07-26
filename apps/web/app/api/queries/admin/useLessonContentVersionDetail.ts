import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const LESSON_CONTENT_VERSION_DETAIL_QUERY_KEY = ["lesson-content-version-detail"];

export function useLessonContentVersionDetail(versionId: string | undefined) {
  return useQuery({
    queryKey: [...LESSON_CONTENT_VERSION_DETAIL_QUERY_KEY, versionId],
    queryFn: async () => {
      const response = await ApiClient.api.lessonControllerGetLessonContentVersion(
        versionId as string,
      );
      return response.data.data;
    },
    enabled: Boolean(versionId),
  });
}
