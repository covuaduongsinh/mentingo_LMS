import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_STUDY_QUERY_KEY } from "~/api/queries/useChessStudy";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { AddMemberBody } from "~/api/generated-api";

export function useAddChessStudyMember() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ studyId, data }: { studyId: string; data: AddMemberBody }) => {
      const response = await ApiClient.api.chessControllerAddMember(studyId, data);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_STUDY_QUERY_KEY });
      toast({
        description: t("chess.toast.memberAdded", { defaultValue: "Member added" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.memberAddFailed", { defaultValue: "Could not add member" }),
        ),
      });
    },
  });
}
