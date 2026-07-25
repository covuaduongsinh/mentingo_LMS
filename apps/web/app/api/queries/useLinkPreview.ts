import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "../api-client";

type QueryOptions = {
  enabled?: boolean;
};

export const LINK_PREVIEW_QUERY_KEY = ["link-preview"];

export const linkPreviewQueryOptions = (
  url: string,
  options: QueryOptions = { enabled: true },
) => ({
  queryKey: [...LINK_PREVIEW_QUERY_KEY, url],
  queryFn: async () => {
    const response = await ApiClient.api.linkPreviewControllerGetLinkPreview({ url });

    return response.data.data;
  },
  staleTime: Infinity,
  retry: false,
  ...options,
});

export function useLinkPreview(url: string, options?: QueryOptions) {
  return useQuery(linkPreviewQueryOptions(url, { enabled: Boolean(url), ...options }));
}
