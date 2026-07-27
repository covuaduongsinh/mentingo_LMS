import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_STUDENTS_QUERY_KEY } from "~/api/queries/useClassroomStudents";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { RunClassroomBulkActionBody } from "~/api/generated-api";

export function useRunClassroomBulkAction(classroomId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: RunClassroomBulkActionBody) => {
      const response = await ApiClient.api.classroomControllerRunClassroomBulkAction(
        classroomId,
        data,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CLASSROOM_STUDENTS_QUERY_KEY(classroomId, false),
        }),
        queryClient.invalidateQueries({
          queryKey: CLASSROOM_STUDENTS_QUERY_KEY(classroomId, true),
        }),
      ]);
      toast({
        description: t("classroom.toast.bulkActionApplied", {
          defaultValue: "Bulk action applied",
        }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.bulkActionFailed", { defaultValue: "Could not apply the action" }),
        ),
      });
    },
  });
}
