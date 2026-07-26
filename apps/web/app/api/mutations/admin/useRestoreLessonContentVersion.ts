import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { LESSON_CONTENT_VERSIONS_QUERY_KEY } from "~/api/queries/admin/useLessonContentVersions";
import { queryClient } from "~/api/queryClient";
import { useToast } from "~/components/ui/use-toast";

import { ApiClient } from "../../api-client";

import type { AxiosError } from "axios";

type RestoreLessonContentVersionOptions = {
  versionId: string;
};

export function useRestoreLessonContentVersion() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (options: RestoreLessonContentVersionOptions) => {
      const response = await ApiClient.api.lessonControllerRestoreLessonContentVersion(
        options.versionId,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: LESSON_CONTENT_VERSIONS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["course"] });

      toast({
        description: t("adminCourseView.curriculum.lesson.toast.contentVersionRestored"),
      });
    },
    onError: (error: AxiosError) => {
      const apiResponseData = error.response?.data as { message: string };
      toast({
        description: t(apiResponseData.message),
        variant: "destructive",
      });
    },
  });
}
