import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_PUZZLE_DASHBOARD_QUERY_KEY } from "~/api/queries/useChessPuzzleDashboard";
import { CHESS_PUZZLE_MISTAKES_QUERY_KEY } from "~/api/queries/useChessPuzzleMistakes";
import { CHESS_PUZZLE_NEXT_QUERY_KEY } from "~/api/queries/useChessPuzzleNext";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { SubmitPuzzleAttemptBody } from "~/api/generated-api";

export function useSubmitChessPuzzleAttempt() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SubmitPuzzleAttemptBody }) => {
      const response = await ApiClient.api.chessControllerSubmitPuzzleAttempt(id, data);
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHESS_PUZZLE_NEXT_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CHESS_PUZZLE_MISTAKES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CHESS_PUZZLE_DASHBOARD_QUERY_KEY }),
      ]);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.puzzleAttemptFailed", { defaultValue: "Could not submit attempt" }),
        ),
      });
    },
  });
}
