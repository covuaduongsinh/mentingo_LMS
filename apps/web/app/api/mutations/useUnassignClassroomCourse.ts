import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_COURSES_QUERY_KEY } from "~/api/queries/useClassroomCourses";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useUnassignClassroomCourse(classroomId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const response = await ApiClient.api.classroomControllerUnassignClassroomCourse(
        classroomId,
        courseId,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLASSROOM_COURSES_QUERY_KEY(classroomId) });
      toast({
        description: t("classroom.courses.toast.unassigned", { defaultValue: "Course removed" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.courses.toast.unassignFailed", {
            defaultValue: "Could not remove the course",
          }),
        ),
      });
    },
  });
}
