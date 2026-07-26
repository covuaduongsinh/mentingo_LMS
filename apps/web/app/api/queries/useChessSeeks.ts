import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_SEEKS_QUERY_KEY = ["chess-seeks"] as const;

export const chessSeeksQueryOptions = (
  options: { enabled?: boolean; refetchInterval?: number } = {},
) =>
  queryOptions({
    queryKey: CHESS_SEEKS_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.api.chessControllerListSeeks();
      return response.data.data;
    },
    ...options,
  });

export function useChessSeeks(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery(chessSeeksQueryOptions(options));
}
