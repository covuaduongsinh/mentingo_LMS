import { queryOptions, useQuery } from "@tanstack/react-query";

import { chessApi, type ListChessExercisesParams } from "~/api/chess-api";

export const CHESS_EXERCISES_QUERY_KEY = ["chess-exercises"] as const;

export const chessExercisesQueryOptions = (
  params?: ListChessExercisesParams,
  options: { enabled?: boolean } = { enabled: true },
) =>
  queryOptions({
    queryKey: [...CHESS_EXERCISES_QUERY_KEY, params],
    queryFn: async () => {
      const response = await chessApi.listExercises(params);
      return response;
    },
    ...options,
  });

export function useChessExercises(
  params?: ListChessExercisesParams,
  options?: { enabled?: boolean },
) {
  return useQuery(chessExercisesQueryOptions(params, options));
}
