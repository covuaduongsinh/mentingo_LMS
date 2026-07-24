import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_GAME_QUERY_KEY = ["chess-game"] as const;

export const chessGameQueryOptions = (id?: string, options: { enabled?: boolean } = {}) =>
  queryOptions({
    queryKey: [...CHESS_GAME_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error("Game id required");
      const response = await ApiClient.api.chessControllerGetGame(id);
      return response.data.data;
    },
    enabled: Boolean(id) && (options.enabled ?? true),
  });

export function useChessGame(id?: string, options?: { enabled?: boolean }) {
  return useQuery(chessGameQueryOptions(id, options));
}
