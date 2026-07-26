import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_MATCH_QUERY_KEY = ["chess-match"] as const;

export const chessMatchQueryOptions = (id?: string, options: { enabled?: boolean } = {}) =>
  queryOptions({
    queryKey: [...CHESS_MATCH_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error("Match id required");
      const response = await ApiClient.api.chessControllerGetMatch(id);
      return response.data.data;
    },
    enabled: Boolean(id) && (options.enabled ?? true),
  });

export function useChessMatch(id?: string, options?: { enabled?: boolean }) {
  return useQuery(chessMatchQueryOptions(id, options));
}
