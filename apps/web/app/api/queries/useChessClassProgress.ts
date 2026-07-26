import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_CLASS_PROGRESS_QUERY_KEY = (groupId: string, days: number) =>
  ["chess-class-progress", groupId, days] as const;

export const chessClassProgressQueryOptions = (
  groupId: string,
  days: number,
  options: { enabled?: boolean } = {},
) =>
  queryOptions({
    queryKey: CHESS_CLASS_PROGRESS_QUERY_KEY(groupId, days),
    queryFn: async () => {
      const response = await ApiClient.api.chessClassControllerGetClassProgress(groupId, { days });
      return response.data.data;
    },
    ...options,
  });

export function useChessClassProgress(
  groupId: string,
  days: number,
  options?: { enabled?: boolean },
) {
  return useQuery(chessClassProgressQueryOptions(groupId, days, options));
}
