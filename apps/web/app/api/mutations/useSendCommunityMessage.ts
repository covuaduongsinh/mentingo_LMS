import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { COMMUNITY_CONVERSATION_MESSAGES_QUERY_KEY } from "~/api/queries/useCommunityConversationMessages";
import { COMMUNITY_CONVERSATIONS_QUERY_KEY } from "~/api/queries/useCommunityConversations";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useSendCommunityMessage() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      recipientUserId,
      content,
    }: {
      recipientUserId: string;
      content: string;
    }) => {
      const response = await ApiClient.api.communityControllerSendMessage({
        recipientUserId,
        content,
      });
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: COMMUNITY_CONVERSATIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: COMMUNITY_CONVERSATION_MESSAGES_QUERY_KEY }),
      ]);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("communityView.errors.messageSendFailed", { defaultValue: "Could not send message" }),
        ),
      });
    },
  });
}
