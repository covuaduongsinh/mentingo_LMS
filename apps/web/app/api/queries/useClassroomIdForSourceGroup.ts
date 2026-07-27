import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

/** Đợt C2 backward-compat bridge only — resolves a legacy chess-class `groupId` to its
 * backfilled `classroomId`, if one exists, so old chess-class admin pages can link to the
 * new Classroom module page. Not part of the Classroom feature surface itself. */
export const CLASSROOM_ID_FOR_SOURCE_GROUP_QUERY_KEY = (groupId: string) =>
  ["classroom-id-for-source-group", groupId] as const;

export const classroomIdForSourceGroupQueryOptions = (
  groupId: string,
  options: { enabled?: boolean } = {},
) =>
  queryOptions({
    queryKey: CLASSROOM_ID_FOR_SOURCE_GROUP_QUERY_KEY(groupId),
    queryFn: async () => {
      const response = await ApiClient.api.classroomControllerGetClassroomIdForSourceGroup(groupId);
      return response.data.data.classroomId;
    },
    ...options,
  });

export function useClassroomIdForSourceGroup(groupId: string, options?: { enabled?: boolean }) {
  return useQuery(classroomIdForSourceGroupQueryOptions(groupId, options));
}
