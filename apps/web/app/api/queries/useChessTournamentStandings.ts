import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_TOURNAMENT_STANDINGS_QUERY_KEY = (id: string) =>
  ["chess-tournament-standings", id] as const;

export const chessTournamentStandingsQueryOptions = (
  id: string,
  options: { enabled?: boolean; refetchInterval?: number } = {},
) =>
  queryOptions({
    queryKey: CHESS_TOURNAMENT_STANDINGS_QUERY_KEY(id),
    queryFn: async () => {
      const response = await ApiClient.api.chessTournamentControllerGetStandings(id);
      return response.data.data;
    },
    ...options,
  });

export function useChessTournamentStandings(
  id: string,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  return useQuery(chessTournamentStandingsQueryOptions(id, options));
}
