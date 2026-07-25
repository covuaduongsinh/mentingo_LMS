import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "../../api-client";

import type { GetTopLearnersResponse } from "~/api/generated-api";

export const TOP_LEARNERS_QUERY_KEY = ["top-learners", "admin"];

interface TopLearnersQueryOptions {
  id: string;
  enabled?: boolean;
}

export const topLearnersQueryOptions = ({ id, enabled }: TopLearnersQueryOptions) =>
  queryOptions({
    enabled,
    queryKey: [TOP_LEARNERS_QUERY_KEY, { id }],
    queryFn: async () => {
      const response = await ApiClient.api.courseAnalyticsControllerGetTopLearners(id);

      return response.data;
    },
    select: (data: GetTopLearnersResponse) => data.data,
  });

export function useTopLearners({ id, enabled }: TopLearnersQueryOptions) {
  return useQuery(topLearnersQueryOptions({ id, enabled }));
}
