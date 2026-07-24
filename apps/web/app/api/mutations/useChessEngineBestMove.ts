import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  chessApi,
  type ChessEngineBestMoveResult,
  type ChessEnginePlayLevel,
} from "~/api/chess-api";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useChessEngineBestMove() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (body: {
      fen: string;
      movesUci?: string[];
      level?: ChessEnginePlayLevel;
    }): Promise<ChessEngineBestMoveResult> => {
      const response = await chessApi.engineBestMove(body);
      return response.data;
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.engine.errorBestMove", { defaultValue: "Engine could not move" }),
        ),
      });
    },
  });
}
