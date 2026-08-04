import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useCreateChessStudyLesson() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      chapterId: string;
      title: string;
      description?: string | null;
      studyId: string;
      studyChapterId?: string | null;
    }) => {
      const api = ApiClient.api as typeof ApiClient.api & {
        chessControllerCreateChessStudyLesson: (
          body: typeof data,
        ) => Promise<{ data: { data: { lessonId: string; studyId: string | null } } }>;
      };
      const response = await api.chessControllerCreateChessStudyLesson(data);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["course"] });
      toast({
        description: t("chess.toast.studyLessonCreated", {
          defaultValue: "Chess study lesson created",
        }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("chess.toast.studyLessonCreateFailed", {
            defaultValue: "Could not create chess study lesson",
          }),
        ),
      });
    },
  });
}
