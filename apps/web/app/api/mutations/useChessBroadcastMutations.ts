import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_BROADCAST_DETAIL_QUERY_KEY } from "~/api/queries/useChessBroadcastDetail";
import { CHESS_BROADCAST_GAME_VIEW_QUERY_KEY } from "~/api/queries/useChessBroadcastGameView";
import { CHESS_BROADCASTS_QUERY_KEY } from "~/api/queries/useChessBroadcasts";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type {
  CreateBroadcastBody,
  CreateBroadcastGameBody,
  CreateRoundBody,
  CreateTeamBody,
  UpdateBroadcastBody,
  UpdateBroadcastGameBody,
} from "~/api/generated-api";

function useBroadcastErrorToast() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return (error: unknown, fallback: string) => {
    toast({
      variant: "destructive",
      description: getTranslatedApiErrorMessage(error, t, fallback),
    });
  };
}

export function useCreateChessBroadcast() {
  const showError = useBroadcastErrorToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (body: CreateBroadcastBody) => {
      const response = await ApiClient.api.chessBroadcastControllerCreateBroadcast(body);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_BROADCASTS_QUERY_KEY });
    },
    onError: (error) =>
      showError(
        error,
        t("chessBroadcast.toast.createBroadcastFailed", {
          defaultValue: "Could not create the broadcast",
        }),
      ),
  });
}

export function useUpdateChessBroadcast(broadcastId: string) {
  const showError = useBroadcastErrorToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (body: UpdateBroadcastBody) => {
      const response = await ApiClient.api.chessBroadcastControllerUpdateBroadcast(
        broadcastId,
        body,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHESS_BROADCASTS_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: CHESS_BROADCAST_DETAIL_QUERY_KEY(broadcastId),
        }),
      ]);
    },
    onError: (error) =>
      showError(
        error,
        t("chessBroadcast.toast.updateBroadcastFailed", {
          defaultValue: "Could not update the broadcast",
        }),
      ),
  });
}

export function useCreateChessBroadcastRound(broadcastId: string) {
  const showError = useBroadcastErrorToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (body: CreateRoundBody) => {
      const response = await ApiClient.api.chessBroadcastControllerCreateRound(broadcastId, body);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CHESS_BROADCAST_DETAIL_QUERY_KEY(broadcastId),
      });
    },
    onError: (error) =>
      showError(
        error,
        t("chessBroadcast.toast.createRoundFailed", { defaultValue: "Could not add the round" }),
      ),
  });
}

export function useCreateChessBroadcastTeam(broadcastId: string) {
  const showError = useBroadcastErrorToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (body: CreateTeamBody) => {
      const response = await ApiClient.api.chessBroadcastControllerCreateTeam(broadcastId, body);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CHESS_BROADCAST_DETAIL_QUERY_KEY(broadcastId),
      });
    },
    onError: (error) =>
      showError(
        error,
        t("chessBroadcast.toast.createTeamFailed", { defaultValue: "Could not add the team" }),
      ),
  });
}

export function useCreateChessBroadcastGame(broadcastId: string, roundId: string) {
  const showError = useBroadcastErrorToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (body: CreateBroadcastGameBody) => {
      const response = await ApiClient.api.chessBroadcastControllerCreateBroadcastGame(
        roundId,
        body,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CHESS_BROADCAST_DETAIL_QUERY_KEY(broadcastId),
      });
    },
    onError: (error) =>
      showError(
        error,
        t("chessBroadcast.toast.createGameFailed", { defaultValue: "Could not add the board" }),
      ),
  });
}

export function useUpdateChessBroadcastGame(broadcastId: string, gameId: string) {
  const showError = useBroadcastErrorToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (body: UpdateBroadcastGameBody) => {
      const response = await ApiClient.api.chessBroadcastControllerUpdateBroadcastGame(
        gameId,
        body,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CHESS_BROADCAST_DETAIL_QUERY_KEY(broadcastId),
        }),
        queryClient.invalidateQueries({
          queryKey: CHESS_BROADCAST_GAME_VIEW_QUERY_KEY(gameId, true),
        }),
        queryClient.invalidateQueries({
          queryKey: CHESS_BROADCAST_GAME_VIEW_QUERY_KEY(gameId, false),
        }),
      ]);
    },
    onError: (error) =>
      showError(
        error,
        t("chessBroadcast.toast.updateGameFailed", { defaultValue: "Could not update the board" }),
      ),
  });
}

export function usePasteChessBroadcastPgn(broadcastId: string, gameId: string) {
  const showError = useBroadcastErrorToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (pgn: string) => {
      const response = await ApiClient.api.chessBroadcastControllerPastePgn(gameId, { pgn });
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CHESS_BROADCAST_DETAIL_QUERY_KEY(broadcastId),
        }),
        queryClient.invalidateQueries({
          queryKey: CHESS_BROADCAST_GAME_VIEW_QUERY_KEY(gameId, true),
        }),
        queryClient.invalidateQueries({
          queryKey: CHESS_BROADCAST_GAME_VIEW_QUERY_KEY(gameId, false),
        }),
      ]);
    },
    onError: (error) =>
      showError(
        error,
        t("chessBroadcast.toast.pastePgnFailed", { defaultValue: "Could not apply the PGN" }),
      ),
  });
}
