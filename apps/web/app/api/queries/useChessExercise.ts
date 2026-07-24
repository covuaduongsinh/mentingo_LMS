import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CHESS_EXERCISE_QUERY_KEY = ["chess-exercise"] as const;

export const chessExerciseQueryOptions = (id?: string, options: { enabled?: boolean } = {}) =>
  queryOptions({
    queryKey: [...CHESS_EXERCISE_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error("Exercise id required");
      const response = await ApiClient.api.chessControllerGetExercise(id);
      return response.data.data;
    },
    enabled: Boolean(id) && (options.enabled ?? true),
  });

export function useChessExercise(id?: string, options?: { enabled?: boolean }) {
  return useQuery(chessExerciseQueryOptions(id, options));
}
