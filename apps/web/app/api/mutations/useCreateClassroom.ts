import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { TEACHING_CLASSROOMS_QUERY_KEY } from "~/api/queries/useTeachingClassrooms";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { CreateClassroomBody } from "~/api/generated-api";

export function useCreateClassroom() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: CreateClassroomBody) => {
      const response = await ApiClient.api.classroomControllerCreateClassroom(data);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TEACHING_CLASSROOMS_QUERY_KEY });
      toast({ description: t("classroom.toast.created", { defaultValue: "Classroom created" }) });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.createFailed", { defaultValue: "Could not create the classroom" }),
        ),
      });
    },
  });
}
