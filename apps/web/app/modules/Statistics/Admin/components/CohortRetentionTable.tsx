import { useTranslation } from "react-i18next";

import { Skeleton } from "~/components/ui/skeleton";

import type { GetCohortRetentionResponse } from "~/api/generated-api";

const WEEK_OFFSETS = [0, 1, 2, 3, 4];

type CohortRetentionTableProps = {
  data: GetCohortRetentionResponse["data"] | undefined;
  isLoading?: boolean;
};

export const CohortRetentionTable = ({ data, isLoading = false }: CohortRetentionTableProps) => {
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
        {t("adminStatisticsView.other.cohortRetention")}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-neutral-800">
                {t("adminStatisticsView.other.cohortWeek")}
              </th>
              <th className="p-2 text-right text-neutral-800">
                {t("adminStatisticsView.other.cohortSize")}
              </th>
              {WEEK_OFFSETS.map((offset) => (
                <th key={offset} className="p-2 text-right text-neutral-800">
                  W{offset}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((cohort) => (
              <tr key={cohort.cohortWeek} className="border-t border-neutral-200">
                <td className="p-2 text-neutral-950">{cohort.cohortWeek}</td>
                <td className="p-2 text-right text-neutral-950">{cohort.cohortSize}</td>
                {WEEK_OFFSETS.map((offset) => {
                  const cell = cohort.retention.find((r) => r.weekOffset === offset);

                  return (
                    <td key={offset} className="p-2 text-right text-neutral-950">
                      {cell?.percentage === null || cell?.percentage === undefined
                        ? "—"
                        : `${cell.percentage}%`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
