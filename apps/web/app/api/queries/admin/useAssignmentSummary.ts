import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const ASSIGNMENT_SUMMARY_QUERY_KEY = ["assignment-summary"];

export function assignmentSummaryQueryOptions(assignmentId: string | undefined) {
  return {
    queryKey: [...ASSIGNMENT_SUMMARY_QUERY_KEY, assignmentId],
    queryFn: async () => {
      const response = await ApiClient.api.assignmentsControllerGetAssignmentSummary(
        assignmentId as string,
      );
      return response.data.data;
    },
    enabled: Boolean(assignmentId),
  };
}

export function useAssignmentSummary(assignmentId: string | undefined) {
  return useQuery(assignmentSummaryQueryOptions(assignmentId));
}
