import { queryOptions, useQuery } from "@tanstack/react-query";

import { chessApi } from "~/api/chess-api";

export const CHESS_ENGINE_STATUS_QUERY_KEY = ["chess-engine-status"] as const;

export const chessEngineStatusQueryOptions = (options: { enabled?: boolean } = { enabled: true }) =>
  queryOptions({
    queryKey: CHESS_ENGINE_STATUS_QUERY_KEY,
    queryFn: async () => {
      const response = await chessApi.getEngineStatus();
      return response.data;
    },
    staleTime: 60_000,
    ...options,
  });

export function useChessEngineStatus(options?: { enabled?: boolean }) {
  return useQuery(chessEngineStatusQueryOptions(options));
}
