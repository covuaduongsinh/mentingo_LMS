import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_LEARN_LEVEL_QUERY_KEY = (stageId: string, levelId: string) =>
  ["chess-learn-level", stageId, levelId] as const;

export const chessLearnLevelQueryOptions = (stageId: string, levelId: string) =>
  queryOptions({
    queryKey: CHESS_LEARN_LEVEL_QUERY_KEY(stageId, levelId),
    queryFn: async () => {
      const response = await ApiClient.api.chessLearnControllerGetLevel(stageId, levelId);
      return response.data.data;
    },
  });

export function useChessLearnLevel(stageId: string, levelId: string) {
  return useQuery(chessLearnLevelQueryOptions(stageId, levelId));
}
