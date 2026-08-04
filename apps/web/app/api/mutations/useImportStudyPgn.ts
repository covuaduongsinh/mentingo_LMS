import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_STUDIES_QUERY_KEY } from "~/api/queries/useChessStudies";
import { CHESS_STUDY_QUERY_KEY } from "~/api/queries/useChessStudy";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useImportStudyPgn() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ studyId, pgn, mode }: { studyId: string; pgn: string; mode?: string }) => {
      // Method name must match controller `importStudyPgn` after client regeneration.
      const api = ApiClient.api as typeof ApiClient.api & {
        chessControllerImportStudyPgn: (
          id: string,
          data: { pgn: string; mode?: string },
        ) => Promise<{ data: { data: unknown } }>;
      };
      const response = await api.chessControllerImportStudyPgn(studyId, { pgn, mode });
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHESS_STUDY_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CHESS_STUDIES_QUERY_KEY }),
      ]);
      toast({
        description: t("chess.toast.pgnImported", {
          defaultValue: "PGN imported into new chapter(s)",
        }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.pgnImportFailed", { defaultValue: "Could not import PGN" }),
        ),
      });
    },
  });
}
