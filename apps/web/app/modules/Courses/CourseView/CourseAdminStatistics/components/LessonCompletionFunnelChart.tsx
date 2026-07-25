import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Customized, Text, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip } from "~/components/ui/chart";

import { COURSE_STATISTICS_HANDLES } from "../../../../../../e2e/data/statistics/handles";

import type { GetLessonCompletionFunnelResponse } from "~/api/generated-api";

interface LessonCompletionFunnelChartProps {
  data?: GetLessonCompletionFunnelResponse["data"];
}

export function LessonCompletionFunnelChart({ data }: LessonCompletionFunnelChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => data ?? [], [data]);
  const isEmpty = chartData.length === 0;

  return (
    <div
      data-testid={COURSE_STATISTICS_HANDLES.LESSON_COMPLETION_FUNNEL_CHART}
      className="rounded-sm p-6 outline outline-1 outline-neutral-200 flex flex-col justify-center gap-6"
    >
      <div className="text-center space-y-2">
        <p className="body-base-md">
          {t("adminCourseView.statistics.deepAnalytics.lessonFunnel.title")}
        </p>
        <p className="body-sm">
          {t("adminCourseView.statistics.deepAnalytics.lessonFunnel.subtitle")}
        </p>
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
                  {t("adminCourseView.statistics.deepAnalytics.lessonFunnel.noData")}
                </Text>
              )}
            />
          )}
          <CartesianGrid vertical={false} />
          {!isEmpty && (
            <>
              <YAxis
                domain={[0, 100]}
                ticks={[25, 50, 75, 100]}
                tickFormatter={(value) => `${value}%`}
                axisLine={false}
                tickLine={false}
                fontSize={10}
              />
              <XAxis
                dataKey="lessonTitle"
                tickMargin={10}
                axisLine={false}
                tickLine={false}
                fontSize={10}
                tickFormatter={(value: string) =>
                  value.length > 7 ? `${value.slice(0, 7)}...` : value
                }
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;

                  const point = payload[0].payload as (typeof chartData)[number];

                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="body-sm-md mb-2">{point.lessonTitle}</div>
                      <div className="details">
                        {t("adminCourseView.statistics.deepAnalytics.lessonFunnel.enrolledLabel")}:{" "}
                        {point.enrolledCount}
                      </div>
                      <div className="details">
                        {t("adminCourseView.statistics.deepAnalytics.lessonFunnel.completedLabel")}:{" "}
                        {point.completedCount}
                      </div>
                      <div className="details">{point.completionPercentage}%</div>
                    </div>
                  );
                }}
              />
            </>
          )}
          <Bar
            dataKey="completionPercentage"
            name={t("adminCourseView.statistics.deepAnalytics.lessonFunnel.completedLabel")}
            fill="var(--primary)"
            radius={8}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
