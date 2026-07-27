import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const LEARNING_CLASSROOMS_QUERY_KEY = ["classrooms", "learning"] as const;

export const learningClassroomsQueryOptions = (options: { enabled?: boolean } = {}) =>
  queryOptions({
    queryKey: LEARNING_CLASSROOMS_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.api.classroomControllerListLearningClassrooms();
      return response.data.data;
    },
    ...options,
  });

export function useLearningClassrooms(options?: { enabled?: boolean }) {
  return useQuery(learningClassroomsQueryOptions(options));
}
