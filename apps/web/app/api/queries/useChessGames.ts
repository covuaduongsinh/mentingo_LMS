import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export type ListChessGamesParams = Parameters<typeof ApiClient.api.chessControllerListGames>[0];

export const CHESS_GAMES_QUERY_KEY = ["chess-games"] as const;

export const chessGamesQueryOptions = (
  params?: ListChessGamesParams,
  options: { enabled?: boolean } = { enabled: true },
) =>
  queryOptions({
    queryKey: [...CHESS_GAMES_QUERY_KEY, params],
    queryFn: async () => {
      const response = await ApiClient.api.chessControllerListGames(params);
      return response.data;
    },
    ...options,
  });

export function useChessGames(params?: ListChessGamesParams, options?: { enabled?: boolean }) {
  return useQuery(chessGamesQueryOptions(params, options));
}
