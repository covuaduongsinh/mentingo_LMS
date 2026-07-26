import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { Skeleton } from "~/components/ui/skeleton";
import { ChartLegendBadge } from "~/modules/Statistics/Client/components/ChartLegendBadge";

import type { GetNewVsReturningResponse } from "~/api/generated-api";
import type { ChartConfig } from "~/components/ui/chart";

const chartConfig = {
  newUsers: {
    label: "New",
    color: "var(--primary-700)",
  },
  returningUsers: {
    label: "Returning",
    color: "var(--primary-300)",
  },
} satisfies ChartConfig;

type NewVsReturningChartProps = {
  data: GetNewVsReturningResponse["data"] | undefined;
  isLoading?: boolean;
};

export const NewVsReturningChart = ({ data, isLoading = false }: NewVsReturningChartProps) => {
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
    <div className="flex h-full w-full flex-col gap-y-4 rounded-lg bg-white p-8 drop-shadow-card">
      <h2 className="body-lg-md text-center text-neutral-950">
        {t("adminStatisticsView.other.newVsReturning")}
      </h2>
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <BarChart data={data ?? []} margin={{ left: -20 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="newUsers" stackId="a" fill="var(--primary-700)" />
          <Bar dataKey="returningUsers" stackId="a" fill="var(--primary-300)" />
        </BarChart>
      </ChartContainer>
      <div className="flex justify-center gap-2">
        <ChartLegendBadge
          label={t("adminStatisticsView.other.newUsers")}
          dotColor="var(--primary-700)"
        />
        <ChartLegendBadge
          label={t("adminStatisticsView.other.returningUsers")}
          dotColor="var(--primary-300)"
        />
      </div>
    </div>
  );
};
