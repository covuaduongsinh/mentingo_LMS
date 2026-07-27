import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const TEACHING_CLASSROOMS_QUERY_KEY = ["classrooms", "teaching"] as const;

export const teachingClassroomsQueryOptions = (options: { enabled?: boolean } = {}) =>
  queryOptions({
    queryKey: TEACHING_CLASSROOMS_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.api.classroomControllerListTeachingClassrooms();
      return response.data.data;
    },
    ...options,
  });

export function useTeachingClassrooms(options?: { enabled?: boolean }) {
  return useQuery(teachingClassroomsQueryOptions(options));
}
