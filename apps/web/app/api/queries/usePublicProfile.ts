import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const response = await ApiClient.api.publicProfileControllerGetPublicProfile(
        username as string,
      );
      return response.data.data;
    },
    enabled: Boolean(username),
    retry: false,
  });
}
