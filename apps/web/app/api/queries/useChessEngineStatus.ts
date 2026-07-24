import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_ENGINE_STATUS_QUERY_KEY = ["chess-engine-status"] as const;

export const chessEngineStatusQueryOptions = (options: { enabled?: boolean } = { enabled: true }) =>
  queryOptions({
    queryKey: CHESS_ENGINE_STATUS_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.api.chessEngineControllerGetStatus();
      return response.data.data;
    },
    staleTime: 60_000,
    ...options,
  });

export function useChessEngineStatus(options?: { enabled?: boolean }) {
  return useQuery(chessEngineStatusQueryOptions(options));
}
