import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_STUDENTS_QUERY_KEY } from "~/api/queries/useClassroomStudents";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useBulkCreateClassroomStudents(classroomId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (names: string[]) => {
      const response = await ApiClient.api.classroomControllerBulkCreateClassroomStudents(
        classroomId,
        { names },
      );
      return response.data.data.students;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CLASSROOM_STUDENTS_QUERY_KEY(classroomId, false),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.bulkCreateStudentsFailed", {
            defaultValue: "Could not create student accounts",
          }),
        ),
      });
    },
  });
}
