import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const turnstileSiteKeyQueryOptions = () =>
  queryOptions({
    queryKey: ["turnstileSiteKey"],
    queryFn: async () => {
      const response = await ApiClient.api.envControllerGetTurnstileSiteKey();
      return response.data;
    },
  });

export function useTurnstileSiteKey() {
  return useQuery(turnstileSiteKeyQueryOptions());
}
