import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { ASSIGNMENT_FOR_AUTHOR_QUERY_KEY } from "~/api/queries/admin/useAssignmentForAuthor";
import { COURSE_QUERY_KEY } from "~/api/queries/admin/useBetaCourse";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { UpdateAssignmentBody } from "~/api/generated-api";

type UpdateAssignmentOptions = {
  id: string;
  data: UpdateAssignmentBody;
};

export function useUpdateAssignment() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateAssignmentOptions) => {
      const response = await ApiClient.api.assignmentsControllerUpdateAssignment(id, data);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ASSIGNMENT_FOR_AUTHOR_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [COURSE_QUERY_KEY] });
      toast({ description: t("adminCourseView.curriculum.other.lessonUpdated") });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("adminCourseView.curriculum.lesson.toast.unexpectedError"),
        ),
      });
    },
  });
}
