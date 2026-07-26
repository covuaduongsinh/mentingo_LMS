import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

import type { ListDeliveriesResponse } from "~/api/generated-api";

export type WebhookDelivery = ListDeliveriesResponse["data"][number];

export const WEBHOOK_DELIVERIES_QUERY_KEY = "webhookDeliveries";

export const webhookDeliveriesQueryOptions = (endpointId: string, enabled = true) =>
  queryOptions({
    queryKey: [WEBHOOK_DELIVERIES_QUERY_KEY, endpointId],
    queryFn: async () => {
      const response = await ApiClient.api.webhooksControllerListDeliveries(endpointId);
      return response.data.data;
    },
    enabled,
  });

export function useWebhookDeliveries(endpointId: string, enabled = true) {
  return useQuery(webhookDeliveriesQueryOptions(endpointId, enabled));
}
