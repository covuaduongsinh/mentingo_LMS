import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_COURSES_QUERY_KEY } from "~/api/queries/useClassroomCourses";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { AssignClassroomCourseBody } from "~/api/generated-api";

export function useAssignClassroomCourse(classroomId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: AssignClassroomCourseBody) => {
      const response = await ApiClient.api.classroomControllerAssignClassroomCourse(
        classroomId,
        data,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLASSROOM_COURSES_QUERY_KEY(classroomId) });
      toast({
        description: t("classroom.courses.toast.assigned", { defaultValue: "Course assigned" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.courses.toast.assignFailed", {
            defaultValue: "Could not assign the course",
          }),
        ),
      });
    },
  });
}
