import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CLASSROOM_STUDENTS_QUERY_KEY = (classroomId: string, includeArchived: boolean) =>
  ["classroom-students", classroomId, includeArchived] as const;

export const classroomStudentsQueryOptions = (
  classroomId: string,
  includeArchived: boolean,
  options: { enabled?: boolean } = {},
) =>
  queryOptions({
    queryKey: CLASSROOM_STUDENTS_QUERY_KEY(classroomId, includeArchived),
    queryFn: async () => {
      const response = await ApiClient.api.classroomControllerListClassroomStudents(classroomId, {
        includeArchived: includeArchived ? "true" : undefined,
      });
      return response.data.data;
    },
    ...options,
  });

export function useClassroomStudents(
  classroomId: string,
  includeArchived: boolean,
  options?: { enabled?: boolean },
) {
  return useQuery(classroomStudentsQueryOptions(classroomId, includeArchived, options));
}
