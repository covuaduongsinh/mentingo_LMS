import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { LEARNING_CLASSROOMS_QUERY_KEY } from "~/api/queries/useLearningClassrooms";
import { MY_CLASSROOM_INVITES_QUERY_KEY } from "~/api/queries/useMyClassroomInvites";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useAcceptClassroomInvite() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await ApiClient.api.classroomControllerAcceptClassroomInvite(inviteId);
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_CLASSROOM_INVITES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LEARNING_CLASSROOMS_QUERY_KEY }),
      ]);
      toast({
        description: t("classroom.toast.inviteAccepted", { defaultValue: "Invitation accepted" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.inviteAcceptFailed", { defaultValue: "Could not accept the invite" }),
        ),
      });
    },
  });
}
