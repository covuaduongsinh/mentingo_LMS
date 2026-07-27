import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

import type { SendClassroomAnnouncementBody } from "~/api/generated-api";

export function useSendClassroomAnnouncement(classroomId: string) {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: SendClassroomAnnouncementBody) => {
      await ApiClient.api.classroomControllerSendClassroomAnnouncement(classroomId, data);
    },
    onSuccess: () => {
      toast({
        description: t("classroom.announcement.toast.sent", {
          defaultValue: "Announcement sent to the classroom",
        }),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(
          error,
          t,
          t("classroom.announcement.toast.sendFailed", {
            defaultValue: "Could not send the announcement",
          }),
        ),
      });
    },
  });
}
