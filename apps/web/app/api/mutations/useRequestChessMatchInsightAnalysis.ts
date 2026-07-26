import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_MATCH_INSIGHT_REPORT_QUERY_KEY } from "~/api/queries/useChessMatchInsightReport";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useRequestChessMatchInsightAnalysis() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (matchId: string) => {
      const response = await ApiClient.api.chessControllerRequestMatchInsightAnalysis(matchId);
      return response.data.data;
    },
    onSuccess: async () => {
      toast({
        description: t("chess.insight.reanalyzeQueued", {
          defaultValue: "Re-analysis queued — refresh in a moment.",
        }),
      });
      await queryClient.invalidateQueries({ queryKey: CHESS_MATCH_INSIGHT_REPORT_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.insight.reanalyzeFailed", { defaultValue: "Could not queue re-analysis" }),
        ),
      });
    },
  });
}
