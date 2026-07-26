import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { COMMUNITY_RELATIONSHIP_QUERY_KEY } from "~/api/queries/useCommunityRelationship";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

function useRelationshipMutation(
  action: (userId: string) => Promise<unknown>,
  fallbackErrorMessage: string,
) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: action,
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: [...COMMUNITY_RELATIONSHIP_QUERY_KEY, userId] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(error, t, fallbackErrorMessage),
      });
    },
  });
}

export function useFollowUser() {
  return useRelationshipMutation(
    (userId) => ApiClient.api.communityControllerFollowUser(userId),
    "Could not follow this user",
  );
}

export function useUnfollowUser() {
  return useRelationshipMutation(
    (userId) => ApiClient.api.communityControllerUnfollowUser(userId),
    "Could not unfollow this user",
  );
}

export function useBlockUser() {
  return useRelationshipMutation(
    (userId) => ApiClient.api.communityControllerBlockUser(userId),
    "Could not block this user",
  );
}

export function useUnblockUser() {
  return useRelationshipMutation(
    (userId) => ApiClient.api.communityControllerUnblockUser(userId),
    "Could not unblock this user",
  );
}
