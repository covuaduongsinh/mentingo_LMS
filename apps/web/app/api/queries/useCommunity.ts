import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const COMMUNITY_POSTS_QUERY_KEY = ["community-posts"];
export const COMMUNITY_POST_QUERY_KEY = ["community-post"];
export const COMMUNITY_COMMENTS_QUERY_KEY = ["community-comments"];

type ListPostsParams = NonNullable<
  Parameters<typeof ApiClient.api.communityControllerListPosts>[0]
>;

export function useCommunityPosts(params: ListPostsParams) {
  return useQuery({
    queryKey: [...COMMUNITY_POSTS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await ApiClient.api.communityControllerListPosts(params);
      return response.data;
    },
  });
}

export function useCommunityPost(postId: string | undefined) {
  return useQuery({
    queryKey: [...COMMUNITY_POST_QUERY_KEY, postId],
    queryFn: async () => {
      const response = await ApiClient.api.communityControllerGetPost(postId as string);
      return response.data.data;
    },
    enabled: Boolean(postId),
  });
}

export function useCommunityComments(postId: string | undefined) {
  return useQuery({
    queryKey: [...COMMUNITY_COMMENTS_QUERY_KEY, postId],
    queryFn: async () => {
      const response = await ApiClient.api.communityControllerListComments(postId as string);
      return response.data.data;
    },
    enabled: Boolean(postId),
  });
}
