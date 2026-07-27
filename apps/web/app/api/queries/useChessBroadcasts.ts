import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_BROADCASTS_QUERY_KEY = ["chess-broadcasts"] as const;

export function useChessBroadcasts() {
  return useQuery({
    queryKey: CHESS_BROADCASTS_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.api.chessBroadcastControllerListBroadcasts();
      return response.data.data;
    },
  });
}
