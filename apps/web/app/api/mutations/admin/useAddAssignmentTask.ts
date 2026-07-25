import { useMutation } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

import type { AddTaskBody } from "~/api/generated-api";

type AddAssignmentTaskOptions = {
  assignmentId: string;
  data: AddTaskBody;
};

/** No toast here — used from AssignmentLessonForm's save flow, which reports one summary toast for the whole diff. */
export function useAddAssignmentTask() {
  return useMutation({
    mutationFn: async ({ assignmentId, data }: AddAssignmentTaskOptions) => {
      const response = await ApiClient.api.assignmentsControllerAddTask(assignmentId, data);
      return response.data.data;
    },
  });
}
