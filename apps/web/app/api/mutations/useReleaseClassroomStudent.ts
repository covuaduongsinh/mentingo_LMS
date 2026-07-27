import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_STUDENT_DETAIL_QUERY_KEY } from "~/api/queries/useClassroomStudentDetail";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useReleaseClassroomStudent(classroomId: string, userId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (email: string) => {
      const response = await ApiClient.api.classroomControllerReleaseClassroomStudent(
        classroomId,
        userId,
        { email },
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CLASSROOM_STUDENT_DETAIL_QUERY_KEY(classroomId, userId),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.releaseFailed", { defaultValue: "Could not release the account" }),
        ),
      });
    },
  });
}
