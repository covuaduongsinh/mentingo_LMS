import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_STUDIES_QUERY_KEY } from "~/api/queries/useChessStudies";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useCloneChessStudy() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await ApiClient.api.chessControllerCloneStudy(id);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_STUDIES_QUERY_KEY });
      toast({
        description: t("chess.toast.studyCloned", { defaultValue: "Study cloned" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.studyCloneFailed", { defaultValue: "Could not clone study" }),
        ),
      });
    },
  });
}
