import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_INVITES_QUERY_KEY } from "~/api/queries/useClassroomInvites";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useRevokeClassroomInvite(classroomId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      await ApiClient.api.classroomControllerRevokeClassroomInvite(classroomId, inviteId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLASSROOM_INVITES_QUERY_KEY(classroomId) });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.revokeInviteFailed", { defaultValue: "Could not revoke the invite" }),
        ),
      });
    },
  });
}
