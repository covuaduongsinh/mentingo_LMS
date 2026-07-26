import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useResetChessClassStudentPassword() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await ApiClient.api.chessClassControllerResetStudentPassword(userId);
      return response.data.data;
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chessClass.toast.resetPasswordFailed", { defaultValue: "Could not reset password" }),
        ),
      });
    },
  });
}
