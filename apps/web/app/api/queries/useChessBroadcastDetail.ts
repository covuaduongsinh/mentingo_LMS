import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_BROADCAST_DETAIL_QUERY_KEY = (id: string) =>
  ["chess-broadcast-detail", id] as const;

export function useChessBroadcastDetail(id: string, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: CHESS_BROADCAST_DETAIL_QUERY_KEY(id),
    queryFn: async () => {
      const response = await ApiClient.api.chessBroadcastControllerGetBroadcastDetail(id);
      return response.data.data;
    },
    ...options,
  });
}
