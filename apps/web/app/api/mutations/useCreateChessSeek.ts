import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_SEEKS_QUERY_KEY } from "~/api/queries/useChessSeeks";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { CreateSeekBody } from "~/api/generated-api";

export function useCreateChessSeek() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: CreateSeekBody) => {
      const response = await ApiClient.api.chessControllerCreateSeek(data);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_SEEKS_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.seekCreateFailed", { defaultValue: "Could not create the seek" }),
        ),
      });
    },
  });
}
