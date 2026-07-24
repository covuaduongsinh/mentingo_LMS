import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export type ListChessExercisesParams = Parameters<
  typeof ApiClient.api.chessControllerListExercises
>[0];

export const CHESS_EXERCISES_QUERY_KEY = ["chess-exercises"] as const;

export const chessExercisesQueryOptions = (
  params?: ListChessExercisesParams,
  options: { enabled?: boolean } = { enabled: true },
) =>
  queryOptions({
    queryKey: [...CHESS_EXERCISES_QUERY_KEY, params],
    queryFn: async () => {
      const response = await ApiClient.api.chessControllerListExercises(params);
      return response.data;
    },
    ...options,
  });

export function useChessExercises(
  params?: ListChessExercisesParams,
  options?: { enabled?: boolean },
) {
  return useQuery(chessExercisesQueryOptions(params, options));
}
