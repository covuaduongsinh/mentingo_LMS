import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const ASSIGNMENT_FOR_AUTHOR_QUERY_KEY = ["assignment-for-author"];

export function assignmentForAuthorQueryOptions(lessonId: string | undefined) {
  return {
    queryKey: [...ASSIGNMENT_FOR_AUTHOR_QUERY_KEY, lessonId],
    queryFn: async () => {
      const response = await ApiClient.api.assignmentsControllerGetAssignmentForAuthor(
        lessonId as string,
      );
      return response.data.data;
    },
    enabled: Boolean(lessonId),
  };
}

export function useAssignmentForAuthor(lessonId: string | undefined) {
  return useQuery(assignmentForAuthorQueryOptions(lessonId));
}
