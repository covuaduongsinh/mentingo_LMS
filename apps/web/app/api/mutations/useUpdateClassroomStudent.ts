import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_STUDENT_DETAIL_QUERY_KEY } from "~/api/queries/useClassroomStudentDetail";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { UpdateClassroomStudentBody } from "~/api/generated-api";

export function useUpdateClassroomStudent(classroomId: string, userId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: UpdateClassroomStudentBody) => {
      const response = await ApiClient.api.classroomControllerUpdateClassroomStudent(
        classroomId,
        userId,
        data,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CLASSROOM_STUDENT_DETAIL_QUERY_KEY(classroomId, userId),
      });
      toast({
        description: t("classroom.toast.studentUpdated", { defaultValue: "Student updated" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.studentUpdateFailed", {
            defaultValue: "Could not update the student",
          }),
        ),
      });
    },
  });
}
