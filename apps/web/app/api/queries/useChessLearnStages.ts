import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_LEARN_STAGES_QUERY_KEY = ["chess-learn-stages"] as const;

export const chessLearnStagesQueryOptions = () =>
  queryOptions({
    queryKey: CHESS_LEARN_STAGES_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.api.chessLearnControllerGetStages();
      return response.data.data.stages;
    },
  });

export function useChessLearnStages() {
  return useQuery(chessLearnStagesQueryOptions());
}
