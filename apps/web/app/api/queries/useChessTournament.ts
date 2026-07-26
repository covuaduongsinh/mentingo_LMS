import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_TOURNAMENT_QUERY_KEY = (id: string) => ["chess-tournament", id] as const;

export const chessTournamentQueryOptions = (id: string, options: { enabled?: boolean } = {}) =>
  queryOptions({
    queryKey: CHESS_TOURNAMENT_QUERY_KEY(id),
    queryFn: async () => {
      const response = await ApiClient.api.chessTournamentControllerGetTournament(id);
      return response.data.data;
    },
    ...options,
  });

export function useChessTournament(id: string, options?: { enabled?: boolean }) {
  return useQuery(chessTournamentQueryOptions(id, options));
}
