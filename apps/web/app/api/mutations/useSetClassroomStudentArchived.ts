import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_STUDENT_DETAIL_QUERY_KEY } from "~/api/queries/useClassroomStudentDetail";
import { CLASSROOM_STUDENTS_QUERY_KEY } from "~/api/queries/useClassroomStudents";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useSetClassroomStudentArchived(classroomId: string, userId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (archived: boolean) => {
      const response = await ApiClient.api.classroomControllerSetClassroomStudentArchived(
        classroomId,
        userId,
        { archived },
      );
      return response.data.data;
    },
    onSuccess: async (_data, archived) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CLASSROOM_STUDENT_DETAIL_QUERY_KEY(classroomId, userId),
        }),
        queryClient.invalidateQueries({
          queryKey: CLASSROOM_STUDENTS_QUERY_KEY(classroomId, false),
        }),
        queryClient.invalidateQueries({
          queryKey: CLASSROOM_STUDENTS_QUERY_KEY(classroomId, true),
        }),
      ]);
      toast({
        description: archived
          ? t("classroom.toast.studentArchived", { defaultValue: "Student archived" })
          : t("classroom.toast.studentRestored", { defaultValue: "Student restored" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.studentArchiveFailed", {
            defaultValue: "Could not change the student's archived status",
          }),
        ),
      });
    },
  });
}
