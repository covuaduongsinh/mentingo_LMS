import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_STUDIES_QUERY_KEY } from "~/api/queries/useChessStudies";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { CreateStudyBody } from "~/api/generated-api";

export function useCreateChessStudy() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: CreateStudyBody) => {
      const response = await ApiClient.api.chessControllerCreateStudy(data);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_STUDIES_QUERY_KEY });
      toast({
        description: t("chess.toast.studyCreated", { defaultValue: "Study created" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.studyCreateFailed", { defaultValue: "Could not create study" }),
        ),
      });
    },
  });
}
