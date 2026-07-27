import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_DETAIL_QUERY_KEY } from "~/api/queries/useClassroomDetail";
import { TEACHING_CLASSROOMS_QUERY_KEY } from "~/api/queries/useTeachingClassrooms";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useSetClassroomArchived(classroomId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (archived: boolean) => {
      const response = await ApiClient.api.classroomControllerSetClassroomArchived(classroomId, {
        archived,
      });
      return response.data.data;
    },
    onSuccess: async (_data, archived) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CLASSROOM_DETAIL_QUERY_KEY(classroomId) }),
        queryClient.invalidateQueries({ queryKey: TEACHING_CLASSROOMS_QUERY_KEY }),
      ]);
      toast({
        description: archived
          ? t("classroom.toast.archived", { defaultValue: "Classroom archived" })
          : t("classroom.toast.reopened", { defaultValue: "Classroom reopened" }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.archiveFailed", {
            defaultValue: "Could not change the classroom's archived status",
          }),
        ),
      });
    },
  });
}
