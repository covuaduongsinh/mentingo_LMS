import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { AssignClassroomStudyBody } from "~/api/generated-api";

export function useAssignClassroomStudy(classroomId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: AssignClassroomStudyBody) => {
      const response = await ApiClient.api.classroomControllerAssignClassroomStudy(
        classroomId,
        data,
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      toast({
        description: t("classroom.studies.toast.assigned", {
          defaultValue: "Study shared with {{count}} students",
          count: data.studentCount,
        }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.studies.toast.assignFailed", { defaultValue: "Could not share the study" }),
        ),
      });
    },
  });
}
