import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Customized, Text, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip } from "~/components/ui/chart";

import { COURSE_STATISTICS_HANDLES } from "../../../../../../e2e/data/statistics/handles";

import type { GetChapterDropoffResponse } from "~/api/generated-api";

interface ChapterDropoffChartProps {
  data?: GetChapterDropoffResponse["data"];
}

export function ChapterDropoffChart({ data }: ChapterDropoffChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => data ?? [], [data]);
  const isEmpty = chartData.length === 0;

  return (
    <div
      data-testid={COURSE_STATISTICS_HANDLES.CHAPTER_DROPOFF_CHART}
      className="rounded-sm p-6 outline outline-1 outline-neutral-200 flex flex-col justify-center gap-6"
    >
      <div className="text-center space-y-2">
        <p className="body-base-md">
          {t("adminCourseView.statistics.deepAnalytics.chapterDropoff.title")}
        </p>
        <p className="body-sm">
          {t("adminCourseView.statistics.deepAnalytics.chapterDropoff.subtitle")}
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
                  {t("adminCourseView.statistics.deepAnalytics.chapterDropoff.noData")}
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
                dataKey="chapterTitle"
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
                      <div className="body-sm-md mb-2">{point.chapterTitle}</div>
                      <div className="details">
                        {t(
                          "adminCourseView.statistics.deepAnalytics.chapterDropoff.completionLabel",
                        )}
                        : {point.completionPercentage}%
                      </div>
                      <div className="details">
                        {t("adminCourseView.statistics.deepAnalytics.chapterDropoff.dropoffLabel")}:{" "}
                        {point.dropoffPercentage}%
                      </div>
                    </div>
                  );
                }}
              />
            </>
          )}
          <Bar
            dataKey="dropoffPercentage"
            name={t("adminCourseView.statistics.deepAnalytics.chapterDropoff.dropoffLabel")}
            fill="var(--error-500)"
            radius={8}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
