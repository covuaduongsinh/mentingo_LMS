import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_TOURNAMENT_QUERY_KEY } from "~/api/queries/useChessTournament";
import { CHESS_TOURNAMENT_STANDINGS_QUERY_KEY } from "~/api/queries/useChessTournamentStandings";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useStartChessTournament(tournamentId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      const response = await ApiClient.api.chessTournamentControllerStartTournament(tournamentId);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_TOURNAMENT_QUERY_KEY(tournamentId) });
      await queryClient.invalidateQueries({
        queryKey: CHESS_TOURNAMENT_STANDINGS_QUERY_KEY(tournamentId),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chessTournament.toast.startFailed", {
            defaultValue: "Could not start the tournament",
          }),
        ),
      });
    },
  });
}
