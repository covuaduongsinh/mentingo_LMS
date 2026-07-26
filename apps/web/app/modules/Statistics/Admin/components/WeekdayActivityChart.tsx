import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { Skeleton } from "~/components/ui/skeleton";

import type { GetWeekdayActivityResponse } from "~/api/generated-api";
import type { ChartConfig } from "~/components/ui/chart";

const chartConfig = {
  activityCount: {
    label: "Activity",
    color: "var(--primary-700)",
  },
} satisfies ChartConfig;

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type WeekdayActivityChartProps = {
  data: GetWeekdayActivityResponse["data"] | undefined;
  isLoading?: boolean;
};

export const WeekdayActivityChart = ({ data, isLoading = false }: WeekdayActivityChartProps) => {
  const { t } = useTranslation();

  const chartData = (data ?? []).map((row) => ({
    ...row,
    weekdayLabel: WEEKDAY_LABELS[row.weekday - 1] ?? row.weekday,
  }));

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
        {t("adminStatisticsView.other.weekdayActivity")}
      </h2>
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <BarChart data={chartData} margin={{ left: -20 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="weekdayLabel" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="activityCount" fill="var(--primary-700)" />
        </BarChart>
      </ChartContainer>
    </div>
  );
};
