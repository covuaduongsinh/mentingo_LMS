import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_PUZZLE_MISTAKES_QUERY_KEY = ["chess-puzzle-mistakes"] as const;

export const chessPuzzleMistakesQueryOptions = () =>
  queryOptions({
    queryKey: CHESS_PUZZLE_MISTAKES_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.api.chessControllerGetPuzzleMistakes();
      return response.data.data;
    },
  });

export function useChessPuzzleMistakes() {
  return useQuery(chessPuzzleMistakesQueryOptions());
}
