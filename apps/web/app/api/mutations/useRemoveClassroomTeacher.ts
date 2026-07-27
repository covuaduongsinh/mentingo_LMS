import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_DETAIL_QUERY_KEY } from "~/api/queries/useClassroomDetail";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useRemoveClassroomTeacher(classroomId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await ApiClient.api.classroomControllerRemoveClassroomTeacher(
        classroomId,
        userId,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLASSROOM_DETAIL_QUERY_KEY(classroomId) });
      toast({
        description: t("classroom.toast.teacherRemoved", { defaultValue: "Teacher removed" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.teacherRemoveFailed", {
            defaultValue: "Could not remove the teacher",
          }),
        ),
      });
    },
  });
}
