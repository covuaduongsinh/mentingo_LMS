import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const ASSIGNMENT_FOR_LEARNER_QUERY_KEY = ["assignment-for-learner"];

export function assignmentForLearnerQueryOptions(lessonId: string) {
  return {
    queryKey: [...ASSIGNMENT_FOR_LEARNER_QUERY_KEY, lessonId],
    queryFn: async () => {
      const response = await ApiClient.api.assignmentsControllerGetAssignmentForLearner(lessonId);
      return response.data.data;
    },
    enabled: Boolean(lessonId),
  };
}

export function useAssignmentForLearner(lessonId: string) {
  return useQuery(assignmentForLearnerQueryOptions(lessonId));
}
