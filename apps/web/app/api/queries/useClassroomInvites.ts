import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const CLASSROOM_INVITES_QUERY_KEY = (classroomId: string) =>
  ["classroom-invites", classroomId] as const;

export const classroomInvitesQueryOptions = (
  classroomId: string,
  options: { enabled?: boolean } = {},
) =>
  queryOptions({
    queryKey: CLASSROOM_INVITES_QUERY_KEY(classroomId),
    queryFn: async () => {
      const response = await ApiClient.api.classroomControllerListClassroomInvites(classroomId);
      return response.data.data;
    },
    ...options,
  });

export function useClassroomInvites(classroomId: string, options?: { enabled?: boolean }) {
  return useQuery(classroomInvitesQueryOptions(classroomId, options));
}
