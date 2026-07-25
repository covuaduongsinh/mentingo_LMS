import { useMutation } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

import type { UpdateTaskBody } from "~/api/generated-api";

type UpdateAssignmentTaskOptions = {
  taskId: string;
  data: UpdateTaskBody;
};

/** No toast here — used from AssignmentLessonForm's save flow, which reports one summary toast for the whole diff. */
export function useUpdateAssignmentTask() {
  return useMutation({
    mutationFn: async ({ taskId, data }: UpdateAssignmentTaskOptions) => {
      const response = await ApiClient.api.assignmentsControllerUpdateTask(taskId, data);
      return response.data.data;
    },
  });
}
