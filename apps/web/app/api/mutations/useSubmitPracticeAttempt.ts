import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

type SubmitPracticeAttemptOptions = {
  studyId: string;
  chapterId: string;
  movesUci: string[];
};

export function useSubmitPracticeAttempt() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ studyId, chapterId, movesUci }: SubmitPracticeAttemptOptions) => {
      const response = await ApiClient.api.chessControllerSubmitPracticeAttempt(
        studyId,
        chapterId,
        { movesUci },
      );
      return response.data.data;
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.study.practiceAttemptFailedToast", {
            defaultValue: "Could not submit your practice attempt",
          }),
        ),
      });
    },
  });
}
