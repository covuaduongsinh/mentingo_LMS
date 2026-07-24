import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { AnalyzeBody } from "~/api/generated-api";

export function useChessEngineAnalyze() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (body: AnalyzeBody) => {
      const response = await ApiClient.api.chessEngineControllerAnalyze(body);
      return response.data.data;
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.engine.errorAnalyze", { defaultValue: "Engine analysis failed" }),
        ),
      });
    },
  });
}
