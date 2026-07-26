import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { ImportPuzzlesBody } from "~/api/generated-api";

export function useImportChessPuzzles() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: ImportPuzzlesBody) => {
      const response = await ApiClient.api.chessControllerImportPuzzles(data);
      return response.data.data;
    },
    onSuccess: () => {
      toast({
        description: t("chess.toast.puzzleImportQueued", {
          defaultValue: "Import queued — puzzles will appear once the job finishes",
        }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.puzzleImportFailed", { defaultValue: "Could not queue the import" }),
        ),
      });
    },
  });
}
