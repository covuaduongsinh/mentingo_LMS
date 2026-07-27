import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_BROADCAST_GAME_VIEW_QUERY_KEY = (id: string, live: boolean) =>
  ["chess-broadcast-game-view", id, live] as const;

export function useChessBroadcastGameView(
  id: string,
  live: boolean,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: CHESS_BROADCAST_GAME_VIEW_QUERY_KEY(id, live),
    queryFn: async () => {
      const response = await ApiClient.api.chessBroadcastControllerGetGameView(id, { live });
      return response.data.data;
    },
    ...options,
  });
}
