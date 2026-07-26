import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export type ChessPuzzleNextParams = Parameters<
  typeof ApiClient.api.chessControllerGetNextPuzzle
>[0];

export const CHESS_PUZZLE_NEXT_QUERY_KEY = ["chess-puzzle-next"] as const;

export const chessPuzzleNextQueryOptions = (
  params?: ChessPuzzleNextParams,
  options: { enabled?: boolean } = { enabled: true },
) =>
  queryOptions({
    queryKey: [...CHESS_PUZZLE_NEXT_QUERY_KEY, params],
    queryFn: async () => {
      const response = await ApiClient.api.chessControllerGetNextPuzzle(params);
      return response.data.data;
    },
    staleTime: 0,
    ...options,
  });

export function useChessPuzzleNext(
  params?: ChessPuzzleNextParams,
  options?: { enabled?: boolean },
) {
  return useQuery(chessPuzzleNextQueryOptions(params, options));
}
