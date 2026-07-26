import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { CreateAnalysisSessionBody } from "~/api/generated-api";

export function useCreateChessAnalysisSession() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (body: CreateAnalysisSessionBody) => {
      const response = await ApiClient.api.chessControllerCreateAnalysisSession(body);
      return response.data.data;
    },
    onError: (error) => {
      toast({
        description: getTranslatedApiErrorMessage(error, t, t("common.toast.somethingWentWrong")),
        variant: "destructive",
      });
    },
  });
}
