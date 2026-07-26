import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useToast } from "~/components/ui/use-toast";

import { ApiClient } from "../../api-client";

import type { GenerateQuizQuestionsBody } from "../../generated-api";
import type { AxiosError } from "axios";

type GenerateQuizQuestionsOptions = {
  data: GenerateQuizQuestionsBody;
};

export function useGenerateQuizQuestions() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (options: GenerateQuizQuestionsOptions) => {
      const response = await ApiClient.api.aiControllerGenerateQuizQuestions(options.data);
      return response.data.data;
    },
    onError: (error: AxiosError) => {
      const apiResponseData = error.response?.data as { message: string };
      toast({
        description: t(apiResponseData?.message ?? "aiQuizGeneration.errors.generic"),
        variant: "destructive",
      });
    },
  });
}
