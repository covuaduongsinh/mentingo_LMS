import { useTranslation } from "react-i18next";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { Skeleton } from "~/components/ui/skeleton";

import type { GetDauTrendResponse } from "~/api/generated-api";
import type { ChartConfig } from "~/components/ui/chart";

const chartConfig = {
  activeUsers: {
    label: "Active users",
    color: "var(--primary-700)",
  },
} satisfies ChartConfig;

type DauTrendChartProps = {
  data: GetDauTrendResponse["data"] | undefined;
  isLoading?: boolean;
};

export const DauTrendChart = ({ data, isLoading = false }: DauTrendChartProps) => {
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
        {t("adminStatisticsView.other.dauTrend")}
      </h2>
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <LineChart data={data ?? []} margin={{ left: -20 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="activeUsers"
            stroke="var(--primary-700)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
};
