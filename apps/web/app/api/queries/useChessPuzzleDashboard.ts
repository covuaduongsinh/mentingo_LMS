import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_PUZZLE_DASHBOARD_QUERY_KEY = ["chess-puzzle-dashboard"] as const;

export const chessPuzzleDashboardQueryOptions = () =>
  queryOptions({
    queryKey: CHESS_PUZZLE_DASHBOARD_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.api.chessControllerGetPuzzleDashboard();
      return response.data.data;
    },
  });

export function useChessPuzzleDashboard() {
  return useQuery(chessPuzzleDashboardQueryOptions());
}
