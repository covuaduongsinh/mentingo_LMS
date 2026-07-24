import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { chessApi, type UpdateChessGameBody } from "~/api/chess-api";
import { CHESS_GAME_QUERY_KEY } from "~/api/queries/useChessGame";
import { CHESS_GAMES_QUERY_KEY } from "~/api/queries/useChessGames";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useUpdateChessGame() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateChessGameBody }) => {
      const response = await chessApi.updateGame(id, data);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_GAMES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: CHESS_GAME_QUERY_KEY });
      toast({
        description: t("chess.toast.gameUpdated", { defaultValue: "Game updated" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.gameUpdateFailed", { defaultValue: "Could not update game" }),
        ),
      });
    },
  });
}
