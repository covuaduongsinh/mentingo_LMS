import { useTranslation } from "react-i18next";

import { Skeleton } from "~/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import type { GetEngagementScoreResponse } from "~/api/generated-api";

type EngagementScoreCardProps = {
  data: GetEngagementScoreResponse["data"] | undefined;
  isLoading?: boolean;
};

export const EngagementScoreCard = ({ data, isLoading = false }: EngagementScoreCardProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg bg-white p-8 drop-shadow-card">
        <Skeleton className="h-6 w-[200px] rounded-lg" />
        <Skeleton className="h-12 w-[100px] rounded-lg" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex h-full w-full cursor-default flex-col items-center justify-center gap-2 rounded-lg bg-white p-8 text-center drop-shadow-card">
            <h2 className="body-lg-md text-neutral-950">
              {t("adminStatisticsView.other.engagementScore")}
            </h2>
            <p className="h2 text-primary-700">{data?.score ?? 0}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {t("adminStatisticsView.other.engagementScoreActivity")}:{" "}
            {data?.components.recentActivityRatio ?? 0}%
          </p>
          <p>
            {t("adminStatisticsView.other.engagementScoreCompletion")}:{" "}
            {data?.components.courseCompletionRatio ?? 0}%
          </p>
          <p>
            {t("adminStatisticsView.other.engagementScoreQuizPass")}:{" "}
            {data?.components.quizPassRatio ?? 0}%
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
