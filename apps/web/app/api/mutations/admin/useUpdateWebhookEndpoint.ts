import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { WEBHOOK_ENDPOINTS_QUERY_KEY } from "~/api/queries/admin/useWebhookEndpoints";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { UpdateEndpointBody } from "~/api/generated-api";

type UpdateWebhookEndpointParams = { id: string; body: UpdateEndpointBody };

export function useUpdateWebhookEndpoint() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, body }: UpdateWebhookEndpointParams) => {
      const response = await ApiClient.api.webhooksControllerUpdateEndpoint(id, body);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEBHOOK_ENDPOINTS_QUERY_KEY] });
    },
    onError: (error) => {
      toast({
        description: getTranslatedApiErrorMessage(error, t, t("common.toast.somethingWentWrong")),
        variant: "destructive",
      });
    },
  });
}
