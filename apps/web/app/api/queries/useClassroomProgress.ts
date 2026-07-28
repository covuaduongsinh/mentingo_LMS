import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CLASSROOM_PROGRESS_QUERY_KEY = (classroomId: string, days: number) =>
  ["classrooms", classroomId, "progress", days] as const;

export const classroomProgressQueryOptions = (
  classroomId: string,
  days: number,
  options: { enabled?: boolean } = {},
) =>
  queryOptions({
    queryKey: CLASSROOM_PROGRESS_QUERY_KEY(classroomId, days),
    queryFn: async () => {
      const response = await ApiClient.api.classroomControllerGetClassroomProgress(classroomId, {
        days,
      });
      return response.data.data;
    },
    ...options,
  });

export function useClassroomProgress(
  classroomId: string,
  days: number,
  options?: { enabled?: boolean },
) {
  return useQuery(classroomProgressQueryOptions(classroomId, days, options));
}
