import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

import type { ListFoldersResponse } from "~/api/generated-api";

export type ResourceLibraryFolder = ListFoldersResponse["data"][number];

type QueryOptions = {
  enabled?: boolean;
};

export const RESOURCE_LIBRARY_FOLDERS_QUERY_KEY = ["resource-library-folders"] as const;

export const resourceLibraryFoldersQueryOptions = (
  parentFolderId?: string,
  options: QueryOptions = { enabled: true },
) =>
  queryOptions({
    queryKey: [...RESOURCE_LIBRARY_FOLDERS_QUERY_KEY, parentFolderId ?? null],
    queryFn: async () => {
      const response = await ApiClient.api.resourceLibraryControllerListFolders(
        parentFolderId ? { parentFolderId } : undefined,
      );
      return response.data;
    },
    ...options,
  });

export function useResourceLibraryFolders(parentFolderId?: string, options?: QueryOptions) {
  return useQuery(resourceLibraryFoldersQueryOptions(parentFolderId, options));
}
