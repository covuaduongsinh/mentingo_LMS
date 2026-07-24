import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { chessApi, type CreateChessGameBody } from "~/api/chess-api";
import { CHESS_GAMES_QUERY_KEY } from "~/api/queries/useChessGames";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useCreateChessGame() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: CreateChessGameBody) => {
      const response = await chessApi.createGame(data);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_GAMES_QUERY_KEY });
      toast({
        description: t("chess.toast.gameCreated", { defaultValue: "Game created" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.gameCreateFailed", { defaultValue: "Could not create game" }),
        ),
      });
    },
  });
}
