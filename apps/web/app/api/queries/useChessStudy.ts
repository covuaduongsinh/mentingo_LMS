import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_STUDY_QUERY_KEY = ["chess-study"] as const;

export const chessStudyQueryOptions = (id?: string, options: { enabled?: boolean } = {}) =>
  queryOptions({
    queryKey: [...CHESS_STUDY_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error("Study id required");
      const response = await ApiClient.api.chessControllerGetStudy(id);
      return response.data.data;
    },
    enabled: Boolean(id) && (options.enabled ?? true),
  });

export function useChessStudy(id?: string, options?: { enabled?: boolean }) {
  return useQuery(chessStudyQueryOptions(id, options));
}
