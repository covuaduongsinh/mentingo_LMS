import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { BulkPairingBody } from "~/api/generated-api";

export function useBulkPairing() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: BulkPairingBody) => {
      const response = await ApiClient.api.chessTournamentControllerBulkPairing(data);
      return response.data.data;
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chessTournament.toast.bulkPairingFailed", { defaultValue: "Could not pair players" }),
        ),
      });
    },
  });
}
