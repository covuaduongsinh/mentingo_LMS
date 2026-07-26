import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_PUZZLE_DAILY_QUERY_KEY = ["chess-puzzle-daily"] as const;

export const chessPuzzleDailyQueryOptions = () =>
  queryOptions({
    queryKey: CHESS_PUZZLE_DAILY_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.api.chessControllerGetDailyPuzzle();
      return response.data.data;
    },
  });

export function useChessPuzzleDaily() {
  return useQuery(chessPuzzleDailyQueryOptions());
}
