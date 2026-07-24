import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_EXERCISES_QUERY_KEY } from "~/api/queries/useChessExercises";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { CreateExerciseBody } from "~/api/generated-api";

export function useCreateChessExercise() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: CreateExerciseBody) => {
      const response = await ApiClient.api.chessControllerCreateExercise(data);
      return response.data.data;
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
