import { queryOptions, useQuery } from "@tanstack/react-query";

import { chessApi } from "~/api/chess-api";

export const CHESS_GAME_QUERY_KEY = ["chess-game"] as const;

export const chessGameQueryOptions = (id?: string, options: { enabled?: boolean } = {}) =>
  queryOptions({
    queryKey: [...CHESS_GAME_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error("Game id required");
      const response = await chessApi.getGame(id);
      return response.data;
    },
    enabled: Boolean(id) && (options.enabled ?? true),
  });

export function useChessGame(id?: string, options?: { enabled?: boolean }) {
  return useQuery(chessGameQueryOptions(id, options));
}
