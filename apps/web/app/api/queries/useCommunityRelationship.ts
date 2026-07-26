import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const COMMUNITY_RELATIONSHIP_QUERY_KEY = ["community-relationship"];

export function useCommunityRelationship(userId: string | undefined) {
  return useQuery({
    queryKey: [...COMMUNITY_RELATIONSHIP_QUERY_KEY, userId],
    queryFn: async () => {
      const response = await ApiClient.api.communityControllerGetRelationship(userId as string);
      return response.data.data;
    },
    enabled: Boolean(userId),
  });
}
