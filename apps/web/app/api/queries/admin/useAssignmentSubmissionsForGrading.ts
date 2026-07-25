import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const ASSIGNMENT_SUBMISSIONS_QUERY_KEY = ["assignment-submissions-for-grading"];

export function assignmentSubmissionsForGradingQueryOptions(assignmentId: string | undefined) {
  return {
    queryKey: [...ASSIGNMENT_SUBMISSIONS_QUERY_KEY, assignmentId],
    queryFn: async () => {
      const response = await ApiClient.api.assignmentsControllerListSubmissionsForGrading(
        assignmentId as string,
      );
      return response.data.data;
    },
    enabled: Boolean(assignmentId),
  };
}

export function useAssignmentSubmissionsForGrading(assignmentId: string | undefined) {
  return useQuery(assignmentSubmissionsForGradingQueryOptions(assignmentId));
}
