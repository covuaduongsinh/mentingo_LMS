import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  COMMUNITY_COMMENTS_QUERY_KEY,
  COMMUNITY_POST_QUERY_KEY,
  COMMUNITY_POSTS_QUERY_KEY,
} from "~/api/queries/useCommunity";
import { queryClient } from "~/api/queryClient";
import { useToast } from "~/components/ui/use-toast";

import { ApiClient } from "../api-client";

import type { CreatePostBody, UpdatePostBody } from "../generated-api";
import type { AxiosError } from "axios";

function useApiErrorToast() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return (error: AxiosError) => {
    const apiResponseData = error.response?.data as { message: string } | undefined;
    toast({
      description: t(apiResponseData?.message ?? "communityView.errors.generic"),
      variant: "destructive",
    });
  };
}

export function useCreateCommunityPost() {
  const onError = useApiErrorToast();

  return useMutation({
    mutationFn: async (data: CreatePostBody) => {
      const response = await ApiClient.api.communityControllerCreatePost(data);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COMMUNITY_POSTS_QUERY_KEY }),
    onError,
  });
}

export function useUpdateCommunityPost() {
  const onError = useApiErrorToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePostBody }) => {
      const response = await ApiClient.api.communityControllerUpdatePost(id, data);
      return response.data.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_POSTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...COMMUNITY_POST_QUERY_KEY, id] });
    },
    onError,
  });
}

export function useDeleteCommunityPost() {
  const onError = useApiErrorToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await ApiClient.api.communityControllerDeletePost(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COMMUNITY_POSTS_QUERY_KEY }),
    onError,
  });
}

export function useSetCommunityPostPinned() {
  const onError = useApiErrorToast();

  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      await ApiClient.api.communityControllerSetPinned(id, { pinned });
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_POSTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...COMMUNITY_POST_QUERY_KEY, id] });
    },
    onError,
  });
}

export function useSetCommunityPostLocked() {
  const onError = useApiErrorToast();

  return useMutation({
    mutationFn: async ({ id, locked }: { id: string; locked: boolean }) => {
      await ApiClient.api.communityControllerSetLocked(id, { locked });
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_POSTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...COMMUNITY_POST_QUERY_KEY, id] });
    },
    onError,
  });
}

export function useCreateCommunityComment() {
  const onError = useApiErrorToast();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      await ApiClient.api.communityControllerCreateComment(postId, { content });
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: [...COMMUNITY_COMMENTS_QUERY_KEY, postId] });
      queryClient.invalidateQueries({ queryKey: [...COMMUNITY_POST_QUERY_KEY, postId] });
    },
    onError,
  });
}

export function useDeleteCommunityComment() {
  const onError = useApiErrorToast();

  return useMutation({
    mutationFn: async ({ id }: { id: string; postId: string }) => {
      await ApiClient.api.communityControllerDeleteComment(id);
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: [...COMMUNITY_COMMENTS_QUERY_KEY, postId] });
    },
    onError,
  });
}

export function useCommunityVote() {
  const onError = useApiErrorToast();

  return useMutation({
    mutationFn: async ({
      targetType,
      targetId,
    }: {
      targetType: "post" | "comment";
      targetId: string;
      postId: string;
    }) => {
      await ApiClient.api.communityControllerVote({ targetType, targetId });
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_POSTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...COMMUNITY_POST_QUERY_KEY, postId] });
      queryClient.invalidateQueries({ queryKey: [...COMMUNITY_COMMENTS_QUERY_KEY, postId] });
    },
    onError,
  });
}
