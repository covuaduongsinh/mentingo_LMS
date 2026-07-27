import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const MY_CLASSROOM_INVITES_QUERY_KEY = ["my-classroom-invites"] as const;

export const myClassroomInvitesQueryOptions = (options: { enabled?: boolean } = {}) =>
  queryOptions({
    queryKey: MY_CLASSROOM_INVITES_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.api.classroomControllerListMyClassroomInvites();
      return response.data.data;
    },
    ...options,
  });

export function useMyClassroomInvites(options?: { enabled?: boolean }) {
  return useQuery(myClassroomInvitesQueryOptions(options));
}
