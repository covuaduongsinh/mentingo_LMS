import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useBecomeClassroomTeacher() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      await ApiClient.api.classroomControllerBecomeClassroomTeacher();
    },
    onSuccess: () => {
      toast({
        description: t("classroom.becomeTeacher.toast.success", {
          defaultValue: "You're now a teacher — sign in again to activate it",
        }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.becomeTeacher.toast.failed", {
            defaultValue: "Could not register you as a teacher",
          }),
        ),
      });
    },
  });
}
