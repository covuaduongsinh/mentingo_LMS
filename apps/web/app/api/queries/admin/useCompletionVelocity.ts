import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "../../api-client";

import type { GetCompletionVelocityResponse } from "~/api/generated-api";

export const COMPLETION_VELOCITY_QUERY_KEY = ["completion-velocity", "admin"];

interface CompletionVelocityQueryOptions {
  id: string;
  enabled?: boolean;
}

export const completionVelocityQueryOptions = ({ id, enabled }: CompletionVelocityQueryOptions) =>
  queryOptions({
    enabled,
    queryKey: [COMPLETION_VELOCITY_QUERY_KEY, { id }],
    queryFn: async () => {
      const response = await ApiClient.api.courseAnalyticsControllerGetCompletionVelocity(id);

      return response.data;
    },
    select: (data: GetCompletionVelocityResponse) => data.data,
  });

export function useCompletionVelocity({ id, enabled }: CompletionVelocityQueryOptions) {
  return useQuery(completionVelocityQueryOptions({ id, enabled }));
}
