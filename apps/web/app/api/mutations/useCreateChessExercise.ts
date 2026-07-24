import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { chessApi, type CreateChessExerciseBody } from "~/api/chess-api";
import { CHESS_EXERCISES_QUERY_KEY } from "~/api/queries/useChessExercises";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useCreateChessExercise() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: CreateChessExerciseBody) => {
      const response = await chessApi.createExercise(data);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_EXERCISES_QUERY_KEY });
      toast({
        description: t("chess.toast.exerciseCreated", { defaultValue: "Exercise created" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.exerciseCreateFailed", { defaultValue: "Could not create exercise" }),
        ),
      });
    },
  });
}
