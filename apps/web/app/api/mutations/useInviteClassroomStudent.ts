import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { CLASSROOM_INVITES_QUERY_KEY } from "~/api/queries/useClassroomInvites";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { InviteClassroomStudentBody } from "~/api/generated-api";

export function useInviteClassroomStudent(classroomId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: InviteClassroomStudentBody) => {
      const response = await ApiClient.api.classroomControllerInviteClassroomStudent(
        classroomId,
        data,
      );
      return response.data.data;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: CLASSROOM_INVITES_QUERY_KEY(classroomId) });

      const feedbackKey = {
        already: "classroom.toast.inviteAlready",
        found: "classroom.toast.inviteFound",
        invited: "classroom.toast.inviteInvited",
      }[result.feedback];

      toast({
        description: t(feedbackKey, {
          defaultValue:
            result.feedback === "invited"
              ? "Invitation sent"
              : result.feedback === "found"
                ? "That user already has a pending invitation"
                : "That user is now a student of this classroom",
        }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.toast.inviteFailed", { defaultValue: "Could not invite the student" }),
        ),
      });
    },
  });
}
