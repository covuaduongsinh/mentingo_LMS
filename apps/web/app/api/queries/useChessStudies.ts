import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export type ListChessStudiesParams = Parameters<typeof ApiClient.api.chessControllerListStudies>[0];

export const CHESS_STUDIES_QUERY_KEY = ["chess-studies"] as const;

export const chessStudiesQueryOptions = (
  params?: ListChessStudiesParams,
  options: { enabled?: boolean } = { enabled: true },
) =>
  queryOptions({
    queryKey: [...CHESS_STUDIES_QUERY_KEY, params],
    queryFn: async () => {
      const response = await ApiClient.api.chessControllerListStudies(params);
      return response.data;
    },
    ...options,
  });

export function useChessStudies(params?: ListChessStudiesParams, options?: { enabled?: boolean }) {
  return useQuery(chessStudiesQueryOptions(params, options));
}
