import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const COMMUNITY_CONVERSATIONS_QUERY_KEY = ["community-conversations"];

export function useCommunityConversations(page = 1, perPage = 20) {
  return useQuery({
    queryKey: [...COMMUNITY_CONVERSATIONS_QUERY_KEY, page, perPage],
    queryFn: async () => {
      const response = await ApiClient.api.communityControllerListConversations({ page, perPage });
      return response.data;
    },
    refetchInterval: 15000,
  });
}
