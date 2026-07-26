import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_MATCH_INSIGHT_REPORT_QUERY_KEY = ["chess-match-insight-report"] as const;

export const chessMatchInsightReportQueryOptions = (matchId?: string) =>
  queryOptions({
    queryKey: [...CHESS_MATCH_INSIGHT_REPORT_QUERY_KEY, matchId],
    queryFn: async () => {
      if (!matchId) throw new Error("Match id required");
      const response = await ApiClient.api.chessControllerGetMatchInsightReport(matchId);
      return response.data.data;
    },
    enabled: Boolean(matchId),
    retry: false,
  });

export function useChessMatchInsightReport(matchId?: string) {
  return useQuery(chessMatchInsightReportQueryOptions(matchId));
}
