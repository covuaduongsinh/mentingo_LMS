import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export type ListChessPlaySessionsParams = Parameters<
  typeof ApiClient.api.chessControllerListPlaySessions
>[0];

export const CHESS_PLAY_SESSIONS_QUERY_KEY = ["chess-play-sessions"] as const;

export const chessPlaySessionsQueryOptions = (
  params?: ListChessPlaySessionsParams,
  options: { enabled?: boolean } = { enabled: true },
) =>
  queryOptions({
    queryKey: [...CHESS_PLAY_SESSIONS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await ApiClient.api.chessControllerListPlaySessions(params);
      return response.data;
    },
    ...options,
  });

export function useChessPlaySessions(
  params?: ListChessPlaySessionsParams,
  options?: { enabled?: boolean },
) {
  return useQuery(chessPlaySessionsQueryOptions(params, options));
}
