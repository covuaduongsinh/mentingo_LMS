import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { ASSIGNMENT_SUBMISSION_QUERY_KEY } from "~/api/queries/admin/useAssignmentSubmissionForGrading";
import { ASSIGNMENT_SUBMISSIONS_QUERY_KEY } from "~/api/queries/admin/useAssignmentSubmissionsForGrading";
import { ASSIGNMENT_SUMMARY_QUERY_KEY } from "~/api/queries/admin/useAssignmentSummary";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useRejectAssignmentTaskSubmission() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (taskSubmissionId: string) => {
      const response =
        await ApiClient.api.assignmentsControllerRejectTaskSubmission(taskSubmissionId);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ASSIGNMENT_SUBMISSION_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ASSIGNMENT_SUBMISSIONS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ASSIGNMENT_SUMMARY_QUERY_KEY });
      toast({
        description: t("adminCourseView.assignmentGrading.toast.rejected", {
          defaultValue: "Submission rejected",
        }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("adminCourseView.assignmentGrading.toast.rejectFailed", {
            defaultValue: "Could not reject submission",
          }),
        ),
      });
    },
  });
}
