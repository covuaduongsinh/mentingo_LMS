import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

import type { GetAnalysisSessionResponse } from "~/api/generated-api";

export type ChessAnalysisSession = GetAnalysisSessionResponse["data"];

export const CHESS_ANALYSIS_SESSION_QUERY_KEY = "chess-analysis-session";

export const chessAnalysisSessionQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [CHESS_ANALYSIS_SESSION_QUERY_KEY, id],
    queryFn: async () => {
      const response = await ApiClient.api.chessControllerGetAnalysisSession(id);
      return response.data.data;
    },
    enabled: Boolean(id),
  });

export function useChessAnalysisSession(id: string) {
  return useQuery(chessAnalysisSessionQueryOptions(id));
}
