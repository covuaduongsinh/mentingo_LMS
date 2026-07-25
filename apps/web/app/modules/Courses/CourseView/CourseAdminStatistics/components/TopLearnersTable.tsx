import { useTranslation } from "react-i18next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatLearningTime } from "~/modules/Courses/CourseView/CourseAdminStatistics/CourseAdminStatistics";

import { COURSE_STATISTICS_HANDLES } from "../../../../../../e2e/data/statistics/handles";

import type { GetTopLearnersResponse } from "~/api/generated-api";

interface TopLearnersTableProps {
  data?: GetTopLearnersResponse["data"];
}

export function TopLearnersTable({ data }: TopLearnersTableProps) {
  const { t } = useTranslation();

  const learners = data ?? [];

  return (
    <div
      data-testid={COURSE_STATISTICS_HANDLES.TOP_LEARNERS_TABLE}
      className="rounded-sm p-6 outline outline-1 outline-neutral-200 flex flex-col gap-6"
    >
      <div className="space-y-2">
        <p className="body-base-md">
          {t("adminCourseView.statistics.deepAnalytics.topLearners.title")}
        </p>
        <p className="body-sm">
          {t("adminCourseView.statistics.deepAnalytics.topLearners.subtitle")}
        </p>
      </div>
      {learners.length === 0 ? (
        <p className="body-sm text-center py-6">
          {t("adminCourseView.statistics.deepAnalytics.topLearners.noData")}
        </p>
      ) : (
        <div className="rounded-lg overflow-hidden border border-neutral-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-neutral-900 body-base-md bg-neutral-50">
                  {t("adminCourseView.statistics.deepAnalytics.topLearners.rank")}
                </TableHead>
                <TableHead className="text-neutral-900 body-base-md bg-neutral-50">
                  {t("adminCourseView.statistics.deepAnalytics.topLearners.student")}
                </TableHead>
                <TableHead className="text-neutral-900 body-base-md bg-neutral-50">
                  {t("adminCourseView.statistics.deepAnalytics.topLearners.totalTime")}
                </TableHead>
                <TableHead className="text-neutral-900 body-base-md bg-neutral-50">
                  {t("adminCourseView.statistics.deepAnalytics.topLearners.completedLessons")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {learners.map((learner, index) => (
                <TableRow
                  key={learner.studentId}
                  data-testid={COURSE_STATISTICS_HANDLES.topLearnersRow(learner.studentId)}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{learner.studentName}</TableCell>
                  <TableCell>{formatLearningTime(learner.totalSeconds)}</TableCell>
                  <TableCell>{learner.completedLessonCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
