import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "../../api-client";

import type { GetChapterDropoffResponse } from "~/api/generated-api";

export const CHAPTER_DROPOFF_QUERY_KEY = ["chapter-dropoff", "admin"];

interface ChapterDropoffQueryOptions {
  id: string;
  enabled?: boolean;
}

export const chapterDropoffQueryOptions = ({ id, enabled }: ChapterDropoffQueryOptions) =>
  queryOptions({
    enabled,
    queryKey: [CHAPTER_DROPOFF_QUERY_KEY, { id }],
    queryFn: async () => {
      const response = await ApiClient.api.courseAnalyticsControllerGetChapterDropoff(id);

      return response.data;
    },
    select: (data: GetChapterDropoffResponse) => data.data,
  });

export function useChapterDropoff({ id, enabled }: ChapterDropoffQueryOptions) {
  return useQuery(chapterDropoffQueryOptions({ id, enabled }));
}
