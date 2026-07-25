import { useMutation } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";
import { ASSIGNMENT_FOR_LEARNER_QUERY_KEY } from "~/api/queries/useAssignmentForLearner";
import { queryClient } from "~/api/queryClient";

import type { SubmitTaskBody } from "~/api/generated-api";

type SubmitAssignmentTaskOptions = {
  taskId: string;
  data: SubmitTaskBody;
};

export function useSubmitAssignmentTask() {
  return useMutation({
    mutationFn: async ({ taskId, data }: SubmitAssignmentTaskOptions) => {
      const response = await ApiClient.api.assignmentsControllerSubmitTask(taskId, data);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ASSIGNMENT_FOR_LEARNER_QUERY_KEY });
    },
  });
}
