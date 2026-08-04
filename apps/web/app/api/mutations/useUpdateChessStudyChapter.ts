import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CHESS_STUDY_QUERY_KEY } from "~/api/queries/useChessStudy";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { UpdateStudyChapterBody } from "~/api/generated-api";

export function useUpdateChessStudyChapter(options?: { silent?: boolean }) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      studyId,
      chapterId,
      data,
    }: {
      studyId: string;
      chapterId: string;
      data: UpdateStudyChapterBody & { expectedUpdatedAt?: string };
    }) => {
      const response = await ApiClient.api.chessControllerUpdateStudyChapter(
        studyId,
        chapterId,
        data as UpdateStudyChapterBody,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_STUDY_QUERY_KEY });
      if (!options?.silent) {
        toast({
          description: t("chess.toast.chapterSaved", { defaultValue: "Chapter saved" }),
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.chapterSaveFailed", { defaultValue: "Could not save chapter" }),
        ),
      });
    },
  });
}
