import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_EXERCISE_QUERY_KEY } from "~/api/queries/useChessExercise";
import { CHESS_EXERCISES_QUERY_KEY } from "~/api/queries/useChessExercises";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { UpdateExerciseBody } from "~/api/generated-api";

export function useUpdateChessExercise() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateExerciseBody }) => {
      const response = await ApiClient.api.chessControllerUpdateExercise(id, data);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_EXERCISES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: CHESS_EXERCISE_QUERY_KEY });
      toast({
        description: t("chess.toast.exerciseUpdated", { defaultValue: "Exercise updated" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.exerciseUpdateFailed", { defaultValue: "Could not update exercise" }),
        ),
      });
    },
  });
}
