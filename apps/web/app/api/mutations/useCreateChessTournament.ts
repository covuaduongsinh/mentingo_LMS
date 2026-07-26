import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { CreateTournamentBody } from "~/api/generated-api";

export function useCreateChessTournament() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: CreateTournamentBody) => {
      const response = await ApiClient.api.chessTournamentControllerCreateTournament(data);
      return response.data.data;
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chessTournament.toast.createFailed", {
            defaultValue: "Could not create the tournament",
          }),
        ),
      });
    },
  });
}
