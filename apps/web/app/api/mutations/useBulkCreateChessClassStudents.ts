import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { BulkCreateStudentsBody } from "~/api/generated-api";

export function useBulkCreateChessClassStudents(groupId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: BulkCreateStudentsBody) => {
      const response = await ApiClient.api.chessClassControllerBulkCreateStudents(groupId, data);
      return response.data.data;
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chessClass.toast.bulkCreateFailed", {
            defaultValue: "Could not create student accounts",
          }),
        ),
      });
    },
  });
}
