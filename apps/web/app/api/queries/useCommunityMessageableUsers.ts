import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export function useCommunityMessageableUsers() {
  return useQuery({
    queryKey: ["community-messageable-users"],
    queryFn: async () => {
      const response = await ApiClient.api.communityControllerListMessageableUsers();
      return response.data.data;
    },
  });
}
