import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_STUDIES_QUERY_KEY } from "~/api/queries/useChessStudies";
import { CHESS_STUDY_QUERY_KEY } from "~/api/queries/useChessStudy";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { UpdateStudyBody } from "~/api/generated-api";

export function useUpdateChessStudy() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStudyBody }) => {
      const response = await ApiClient.api.chessControllerUpdateStudy(id, data);
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHESS_STUDIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CHESS_STUDY_QUERY_KEY }),
      ]);
      toast({
        description: t("chess.toast.studyUpdated", { defaultValue: "Study updated" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.studyUpdateFailed", { defaultValue: "Could not update study" }),
        ),
      });
    },
  });
}
