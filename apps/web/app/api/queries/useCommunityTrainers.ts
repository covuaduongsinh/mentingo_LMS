import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export function useCommunityTrainers(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ["community-trainers", page, perPage],
    queryFn: async () => {
      const response = await ApiClient.api.communityControllerListTrainers({ page, perPage });
      return response.data;
    },
  });
}
