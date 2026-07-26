import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { PUBLIC_PROFILE_SETTINGS_QUERY_KEY } from "~/api/queries/usePublicProfileSettings";
import { queryClient } from "~/api/queryClient";
import { useToast } from "~/components/ui/use-toast";

import { ApiClient } from "../api-client";

import type { UpdateSettingsBody } from "../generated-api";
import type { AxiosError } from "axios";

export function useUpdatePublicProfileSettings() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: UpdateSettingsBody) => {
      await ApiClient.api.publicProfileControllerUpdateSettings(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUBLIC_PROFILE_SETTINGS_QUERY_KEY });
      toast({ description: t("publicProfileView.toast.settingsUpdated") });
    },
    onError: (error: AxiosError) => {
      const apiResponseData = error.response?.data as { message: string } | undefined;
      toast({
        description: t(apiResponseData?.message ?? "publicProfileView.errors.generic"),
        variant: "destructive",
      });
    },
  });
}
