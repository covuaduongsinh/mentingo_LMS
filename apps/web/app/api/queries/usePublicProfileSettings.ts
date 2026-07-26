import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const PUBLIC_PROFILE_SETTINGS_QUERY_KEY = ["public-profile-settings"];

export function usePublicProfileSettings() {
  return useQuery({
    queryKey: PUBLIC_PROFILE_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.api.publicProfileControllerGetOwnSettings();
      return response.data.data;
    },
  });
}
