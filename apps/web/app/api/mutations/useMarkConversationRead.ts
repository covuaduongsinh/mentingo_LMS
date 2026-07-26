import { useMutation } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";
import { COMMUNITY_CONVERSATIONS_QUERY_KEY } from "~/api/queries/useCommunityConversations";
import { queryClient } from "~/api/queryClient";

export function useMarkConversationRead() {
  return useMutation({
    mutationFn: async (conversationId: string) => {
      await ApiClient.api.communityControllerMarkConversationRead(conversationId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COMMUNITY_CONVERSATIONS_QUERY_KEY }),
  });
}
