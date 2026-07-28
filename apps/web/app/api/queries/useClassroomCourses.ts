import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CLASSROOM_COURSES_QUERY_KEY = (classroomId: string) =>
  ["classrooms", classroomId, "courses"] as const;

export const classroomCoursesQueryOptions = (
  classroomId: string,
  options: { enabled?: boolean } = {},
) =>
  queryOptions({
    queryKey: CLASSROOM_COURSES_QUERY_KEY(classroomId),
    queryFn: async () => {
      const response = await ApiClient.api.classroomControllerListClassroomCourses(classroomId);
      return response.data.data;
    },
    ...options,
  });

export function useClassroomCourses(classroomId: string, options?: { enabled?: boolean }) {
  return useQuery(classroomCoursesQueryOptions(classroomId, options));
}
