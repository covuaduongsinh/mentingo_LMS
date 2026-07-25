import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Customized, Text, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip } from "~/components/ui/chart";

import { COURSE_STATISTICS_HANDLES } from "../../../../../../e2e/data/statistics/handles";

import type { GetCompletionVelocityResponse } from "~/api/generated-api";

interface CompletionVelocityChartProps {
  data?: GetCompletionVelocityResponse["data"];
}

export function CompletionVelocityChart({ data }: CompletionVelocityChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => data?.distribution ?? [], [data]);
  const isEmpty = (data?.completedCount ?? 0) === 0;
  const bucketSuffix = t(
    "adminCourseView.statistics.deepAnalytics.completionVelocity.bucketDaysSuffix",
  );

  return (
    <div
      data-testid={COURSE_STATISTICS_HANDLES.COMPLETION_VELOCITY_CHART}
      className="rounded-sm p-6 outline outline-1 outline-neutral-200 flex flex-col justify-center gap-6"
    >
      <div className="text-center space-y-2">
        <p className="body-base-md">
          {t("adminCourseView.statistics.deepAnalytics.completionVelocity.title")}
        </p>
        <p className="body-sm">
          {t("adminCourseView.statistics.deepAnalytics.completionVelocity.subtitle")}
        </p>
      </div>
      <div className="flex justify-center gap-6">
        <div className="text-center">
          <p className="h5">{data?.averageDays ?? 0}</p>
          <p className="body-sm">
            {t("adminCourseView.statistics.deepAnalytics.completionVelocity.averageDays")}
          </p>
        </div>
        <div className="text-center">
          <p className="h5">{data?.medianDays ?? 0}</p>
          <p className="body-sm">
            {t("adminCourseView.statistics.deepAnalytics.completionVelocity.medianDays")}
          </p>
        </div>
      </div>
      <ChartContainer config={{}} className="max-h-64">
        <BarChart accessibilityLayer data={chartData}>
          {isEmpty && (
            <Customized
              component={() => (
                <Text
                  x={0}
                  textAnchor="middle"
                  verticalAnchor="middle"
                  className="h6 translate-x-1/2 translate-y-1/2 fill-primary-950"
                >
                  {t("adminCourseView.statistics.deepAnalytics.completionVelocity.noData")}
                </Text>
              )}
            />
          )}
          <CartesianGrid vertical={false} />
          {!isEmpty && (
            <>
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} fontSize={10} />
              <XAxis
                dataKey="bucket"
                tickMargin={10}
                axisLine={false}
                tickLine={false}
                fontSize={10}
                tickFormatter={(value: string) => `${value} ${bucketSuffix}`}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;

                  const point = payload[0].payload as (typeof chartData)[number];

                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="body-sm-md">
                        {point.bucket} {bucketSuffix}
                      </div>
                      <div className="details">
                        {t(
                          "adminCourseView.statistics.deepAnalytics.completionVelocity.distributionLabel",
                        )}
                        : {point.count}
                      </div>
                    </div>
                  );
                }}
              />
            </>
          )}
          <Bar
            dataKey="count"
            name={t(
              "adminCourseView.statistics.deepAnalytics.completionVelocity.distributionLabel",
            )}
            fill="var(--primary)"
            radius={8}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
