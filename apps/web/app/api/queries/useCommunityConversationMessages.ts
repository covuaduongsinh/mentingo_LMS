import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const COMMUNITY_CONVERSATION_MESSAGES_QUERY_KEY = ["community-conversation-messages"];

export function useCommunityConversationMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: [...COMMUNITY_CONVERSATION_MESSAGES_QUERY_KEY, conversationId],
    queryFn: async () => {
      const response = await ApiClient.api.communityControllerGetConversationMessages(
        conversationId as string,
        { page: 1, perPage: 100 },
      );
      return response.data;
    },
    enabled: Boolean(conversationId),
    refetchInterval: 5000,
  });
}
