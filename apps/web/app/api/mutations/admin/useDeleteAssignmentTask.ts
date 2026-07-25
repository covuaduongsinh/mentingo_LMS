import { useMutation } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

/** No toast here — used from AssignmentLessonForm's save flow, which reports one summary toast for the whole diff. */
export function useDeleteAssignmentTask() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await ApiClient.api.assignmentsControllerDeleteTask(taskId);
      return response.data.data;
    },
  });
}
