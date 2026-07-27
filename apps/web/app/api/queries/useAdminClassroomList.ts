import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const ADMIN_CLASSROOM_LIST_QUERY_KEY = (includeArchived: boolean) =>
  ["classrooms", "admin", { includeArchived }] as const;

export const adminClassroomListQueryOptions = (includeArchived: boolean) =>
  queryOptions({
    queryKey: ADMIN_CLASSROOM_LIST_QUERY_KEY(includeArchived),
    queryFn: async () => {
      const response = await ApiClient.api.classroomControllerListAllClassroomsForAdmin({
        includeArchived: includeArchived ? "true" : "false",
      });
      return response.data.data;
    },
  });

export function useAdminClassroomList(includeArchived: boolean) {
  return useQuery(adminClassroomListQueryOptions(includeArchived));
}

export function useAdminClassroomListSuspense(includeArchived: boolean) {
  return useSuspenseQuery(adminClassroomListQueryOptions(includeArchived));
}
