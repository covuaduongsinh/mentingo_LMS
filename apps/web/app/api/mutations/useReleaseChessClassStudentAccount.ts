import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

type ReleaseStudentAccountOptions = { userId: string; email: string };

export function useReleaseChessClassStudentAccount() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ userId, email }: ReleaseStudentAccountOptions) => {
      const response = await ApiClient.api.chessClassControllerReleaseStudentAccount(userId, {
        email,
      });
      return response.data.data;
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chessClass.toast.releaseFailed", { defaultValue: "Could not release the account" }),
        ),
      });
    },
  });
}
