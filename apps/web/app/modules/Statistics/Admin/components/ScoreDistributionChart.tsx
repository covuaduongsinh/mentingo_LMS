import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { Skeleton } from "~/components/ui/skeleton";

import type { GetScoreDistributionResponse } from "~/api/generated-api";
import type { ChartConfig } from "~/components/ui/chart";

const chartConfig = {
  count: {
    label: "Count",
    color: "var(--primary-700)",
  },
} satisfies ChartConfig;

type ScoreDistributionChartProps = {
  data: GetScoreDistributionResponse["data"] | undefined;
  isLoading?: boolean;
};

export const ScoreDistributionChart = ({
  data,
  isLoading = false,
}: ScoreDistributionChartProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col gap-4 rounded-lg bg-white p-8 drop-shadow-card">
        <Skeleton className="mx-auto h-6 w-[240px] rounded-lg" />
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-y-6 rounded-lg bg-white p-8 drop-shadow-card">
      <h2 className="body-lg-md text-center text-neutral-950">
        {t("adminStatisticsView.other.scoreDistribution")}
      </h2>
      <div>
        <p className="body-sm-md mb-2 text-center text-neutral-800">
          {t("adminStatisticsView.other.quizScores")}
        </p>
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <BarChart data={data?.quiz ?? []} margin={{ left: -20 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--primary-700)" />
          </BarChart>
        </ChartContainer>
      </div>
      <div>
        <p className="body-sm-md mb-2 text-center text-neutral-800">
          {t("adminStatisticsView.other.assignmentScores")}
        </p>
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <BarChart data={data?.assignment ?? []} margin={{ left: -20 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--primary-300)" />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
};
