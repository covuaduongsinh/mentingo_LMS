import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CLASSROOM_DETAIL_QUERY_KEY = (classroomId: string) =>
  ["classrooms", classroomId] as const;

export const classroomDetailQueryOptions = (
  classroomId: string,
  options: { enabled?: boolean } = {},
) =>
  queryOptions({
    queryKey: CLASSROOM_DETAIL_QUERY_KEY(classroomId),
    queryFn: async () => {
      const response = await ApiClient.api.classroomControllerGetClassroomDetail(classroomId);
      return response.data.data;
    },
    ...options,
  });

export function useClassroomDetail(classroomId: string, options?: { enabled?: boolean }) {
  return useQuery(classroomDetailQueryOptions(classroomId, options));
}
