import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { chessApi, type ChessEngineAnalyzeResult } from "~/api/chess-api";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useChessEngineAnalyze() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (body: {
      fen: string;
      movesUci?: string[];
      depth?: number;
    }): Promise<ChessEngineAnalyzeResult> => {
      const response = await chessApi.engineAnalyze(body);
      return response.data;
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.engine.errorAnalyze", { defaultValue: "Engine analysis failed" }),
        ),
      });
    },
  });
}
