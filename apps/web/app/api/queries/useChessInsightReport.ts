import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_INSIGHT_REPORT_QUERY_KEY = ["chess-insight-report"] as const;

export const chessInsightReportQueryOptions = (userId?: string) =>
  queryOptions({
    queryKey: [...CHESS_INSIGHT_REPORT_QUERY_KEY, userId ?? "self"],
    queryFn: async () => {
      const response = userId
        ? await ApiClient.api.chessControllerGetUserInsightReport(userId)
        : await ApiClient.api.chessControllerGetOwnInsightReport();
      return response.data.data;
    },
  });

export function useChessInsightReport(userId?: string) {
  return useQuery(chessInsightReportQueryOptions(userId));
}
