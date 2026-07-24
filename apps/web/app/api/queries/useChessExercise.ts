import { queryOptions, useQuery } from "@tanstack/react-query";

import { chessApi } from "~/api/chess-api";

export const CHESS_EXERCISE_QUERY_KEY = ["chess-exercise"] as const;

export const chessExerciseQueryOptions = (id?: string, options: { enabled?: boolean } = {}) =>
  queryOptions({
    queryKey: [...CHESS_EXERCISE_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error("Exercise id required");
      const response = await chessApi.getExercise(id);
      return response.data;
    },
    enabled: Boolean(id) && (options.enabled ?? true),
  });

export function useChessExercise(id?: string, options?: { enabled?: boolean }) {
  return useQuery(chessExerciseQueryOptions(id, options));
}
