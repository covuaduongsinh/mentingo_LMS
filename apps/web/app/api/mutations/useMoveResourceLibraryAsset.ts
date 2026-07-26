import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { RESOURCE_LIBRARY_ASSETS_QUERY_KEY } from "~/api/queries/useResourceLibraryAssets";
import { RESOURCE_LIBRARY_FOLDERS_QUERY_KEY } from "~/api/queries/useResourceLibraryFolders";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

type MoveResourceLibraryAssetParams = {
  id: string;
  folderId: string | null;
};

export function useMoveResourceLibraryAsset() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, folderId }: MoveResourceLibraryAssetParams) => {
      const response = await ApiClient.api.resourceLibraryControllerMoveAsset(id, { folderId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESOURCE_LIBRARY_ASSETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: RESOURCE_LIBRARY_FOLDERS_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        description: getTranslatedApiErrorMessage(error, t, t("common.toast.somethingWentWrong")),
        variant: "destructive",
      });
    },
  });
}
