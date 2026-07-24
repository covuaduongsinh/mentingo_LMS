import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_PLAY_SESSIONS_QUERY_KEY } from "~/api/queries/useChessPlaySessions";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { CreatePlaySessionBody } from "~/api/generated-api";

export function useCreateChessPlaySession() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePlaySessionBody) => {
      const response = await ApiClient.api.chessControllerCreatePlaySession(data);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_PLAY_SESSIONS_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.play.toast.sessionSaveFailed", { defaultValue: "Could not save the game" }),
        ),
      });
    },
  });
}
