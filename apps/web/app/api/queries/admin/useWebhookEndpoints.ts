import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

import type { ListEndpointsResponse } from "~/api/generated-api";

export type WebhookEndpoint = ListEndpointsResponse["data"][number];

export const WEBHOOK_ENDPOINTS_QUERY_KEY = "webhookEndpoints";

export const webhookEndpointsQueryOptions = queryOptions({
  queryKey: [WEBHOOK_ENDPOINTS_QUERY_KEY],
  queryFn: async () => {
    const response = await ApiClient.api.webhooksControllerListEndpoints();
    return response.data.data;
  },
});

export function useWebhookEndpoints() {
  return useQuery(webhookEndpointsQueryOptions);
}
