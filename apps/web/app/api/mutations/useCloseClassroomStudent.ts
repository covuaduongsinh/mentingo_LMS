import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_STUDENTS_QUERY_KEY } from "~/api/queries/useClassroomStudents";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useCloseClassroomStudent(classroomId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (userId: string) => {
      await ApiClient.api.classroomControllerCloseClassroomStudent(classroomId, userId);
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
        description: t("classroom.toast.studentClosed", { defaultValue: "Account closed" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.studentCloseFailed", { defaultValue: "Could not close the account" }),
        ),
      });
    },
  });
}
