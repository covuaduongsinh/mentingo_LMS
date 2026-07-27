import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CLASSROOM_STUDENT_DETAIL_QUERY_KEY = (classroomId: string, userId: string) =>
  ["classroom-student-detail", classroomId, userId] as const;

export const classroomStudentDetailQueryOptions = (
  classroomId: string,
  userId: string,
  options: { enabled?: boolean } = {},
) =>
  queryOptions({
    queryKey: CLASSROOM_STUDENT_DETAIL_QUERY_KEY(classroomId, userId),
    queryFn: async () => {
      const response = await ApiClient.api.classroomControllerGetClassroomStudentDetail(
        classroomId,
        userId,
      );
      return response.data.data;
    },
    ...options,
  });

export function useClassroomStudentDetail(
  classroomId: string,
  userId: string,
  options?: { enabled?: boolean },
) {
  return useQuery(classroomStudentDetailQueryOptions(classroomId, userId, options));
}
