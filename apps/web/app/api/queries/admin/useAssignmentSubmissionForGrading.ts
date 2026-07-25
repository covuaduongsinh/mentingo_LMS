import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const ASSIGNMENT_SUBMISSION_QUERY_KEY = ["assignment-submission-for-grading"];

export function assignmentSubmissionForGradingQueryOptions(
  assignmentId: string | undefined,
  userId: string | undefined,
) {
  return {
    queryKey: [...ASSIGNMENT_SUBMISSION_QUERY_KEY, assignmentId, userId],
    queryFn: async () => {
      const response = await ApiClient.api.assignmentsControllerGetSubmissionForGrading(
        assignmentId as string,
        userId as string,
      );
      return response.data.data;
    },
    enabled: Boolean(assignmentId && userId),
  };
}

export function useAssignmentSubmissionForGrading(
  assignmentId: string | undefined,
  userId: string | undefined,
) {
  return useQuery(assignmentSubmissionForGradingQueryOptions(assignmentId, userId));
}
