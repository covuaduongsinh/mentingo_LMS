import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { MY_CLASSROOM_INVITES_QUERY_KEY } from "~/api/queries/useMyClassroomInvites";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useDeclineClassroomInvite() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await ApiClient.api.classroomControllerDeclineClassroomInvite(inviteId);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MY_CLASSROOM_INVITES_QUERY_KEY });
      toast({
        description: t("classroom.toast.inviteDeclined", { defaultValue: "Invitation declined" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.inviteDeclineFailed", {
            defaultValue: "Could not decline the invite",
          }),
        ),
      });
    },
  });
}
