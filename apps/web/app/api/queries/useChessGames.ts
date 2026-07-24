import { queryOptions, useQuery } from "@tanstack/react-query";

import { chessApi, type ListChessGamesParams } from "~/api/chess-api";

export const CHESS_GAMES_QUERY_KEY = ["chess-games"] as const;

export const chessGamesQueryOptions = (
  params?: ListChessGamesParams,
  options: { enabled?: boolean } = { enabled: true },
) =>
  queryOptions({
    queryKey: [...CHESS_GAMES_QUERY_KEY, params],
    queryFn: async () => {
      const response = await chessApi.listGames(params);
      return response;
    },
    ...options,
  });

export function useChessGames(params?: ListChessGamesParams, options?: { enabled?: boolean }) {
  return useQuery(chessGamesQueryOptions(params, options));
}
