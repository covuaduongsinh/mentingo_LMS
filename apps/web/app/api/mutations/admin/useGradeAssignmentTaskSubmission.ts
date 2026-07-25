import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { ASSIGNMENT_SUBMISSION_QUERY_KEY } from "~/api/queries/admin/useAssignmentSubmissionForGrading";
import { ASSIGNMENT_SUBMISSIONS_QUERY_KEY } from "~/api/queries/admin/useAssignmentSubmissionsForGrading";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { GradeTaskSubmissionBody } from "~/api/generated-api";

type GradeAssignmentTaskSubmissionOptions = {
  taskSubmissionId: string;
  data: GradeTaskSubmissionBody;
};

export function useGradeAssignmentTaskSubmission() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ taskSubmissionId, data }: GradeAssignmentTaskSubmissionOptions) => {
      const response = await ApiClient.api.assignmentsControllerGradeTaskSubmission(
        taskSubmissionId,
        data,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ASSIGNMENT_SUBMISSION_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ASSIGNMENT_SUBMISSIONS_QUERY_KEY });
      toast({
        description: t("adminCourseView.assignmentGrading.toast.graded", {
          defaultValue: "Grade saved",
        }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("adminCourseView.assignmentGrading.toast.gradeFailed", {
            defaultValue: "Could not save grade",
          }),
        ),
      });
    },
  });
}
