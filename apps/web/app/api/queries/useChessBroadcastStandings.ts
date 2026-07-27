import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_BROADCAST_STANDINGS_QUERY_KEY = (id: string) =>
  ["chess-broadcast-standings", id] as const;

export function useChessBroadcastStandings(id: string, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: CHESS_BROADCAST_STANDINGS_QUERY_KEY(id),
    queryFn: async () => {
      const response = await ApiClient.api.chessBroadcastControllerGetBroadcastStandings(id);
      return response.data.data;
    },
    ...options,
  });
}
