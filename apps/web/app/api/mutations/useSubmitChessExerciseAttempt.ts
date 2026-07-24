import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { chessApi } from "~/api/chess-api";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useSubmitChessExerciseAttempt() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      id,
      movesUci,
      timeMs,
    }: {
      id: string;
      movesUci?: string[];
      timeMs?: number;
    }) => {
      const response = await chessApi.submitExerciseAttempt(id, { movesUci, timeMs });
      return response.data;
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.attemptFailed", { defaultValue: "Could not submit attempt" }),
        ),
      });
    },
  });
}
