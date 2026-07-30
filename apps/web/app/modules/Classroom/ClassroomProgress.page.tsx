import { useParams } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useClassroomDetail } from "~/api/queries/useClassroomDetail";
import { useClassroomProgress } from "~/api/queries/useClassroomProgress";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useLanguageStore } from "~/modules/Dashboard/Settings/Language/LanguageStore";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";
import type { GetClassroomProgressResponse } from "~/api/generated-api";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.classroomProgress");

const DAYS_OPTIONS = [7, 30, 90];

type ChessStudentProgress = GetClassroomProgressResponse["data"]["chess"]["students"][number];
type CourseProgress = GetClassroomProgressResponse["data"]["courses"][number];

const getLocalizedTitle = (title: unknown, language: string): string => {
  const record = title as Record<string, string>;
  return record[language] ?? record.en ?? Object.values(record)[0] ?? "";
};

const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;
const formatMinutes = (ms: number) => Math.round(ms / 60000);

export default function ClassroomProgressPage() {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const { classroomId } = useParams<{ classroomId: string }>();
  const [days, setDays] = useState(30);

  const { data: classroom } = useClassroomDetail(classroomId ?? "", { enabled: !!classroomId });
  const { data: report, isLoading } = useClassroomProgress(classroomId ?? "", days, {
    enabled: !!classroomId,
  });

  if (!classroomId) return null;

  const breadcrumbs = [
    { title: t("classroom.nav.title", { defaultValue: "Classrooms" }), href: "/classrooms" },
    { title: classroom?.name ?? "", href: `/classrooms/${classroomId}` },
    {
      title: t("classroom.progress.title", { defaultValue: "Progress report" }),
      href: `/classrooms/${classroomId}/progress`,
    },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="h4 text-neutral-950">
            {t("classroom.progress.title", { defaultValue: "Progress report" })}
          </h1>
          <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
            <SelectTrigger className="w-40" data-testid="classroom-progress-days-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {t("classroom.progress.daysOption", {
                    defaultValue: "Last {{count}} days",
                    count: option,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading || !report ? (
          <p className="body-base text-neutral-600">
            {t("common.loading", { defaultValue: "Loading…" })}
          </p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("classroom.progress.chessHeading", { defaultValue: "Chess" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4">
                  <Badge variant="outline">
                    {t("classroom.progress.classAverageWinRate", {
                      defaultValue: "Class avg. win rate: {{value}}",
                      value: formatPercent(report.chess.classAverage.winRate),
                    })}
                  </Badge>
                  <Badge variant="outline">
                    {t("classroom.progress.classAveragePuzzleAccuracy", {
                      defaultValue: "Class avg. puzzle accuracy: {{value}}",
                      value: formatPercent(report.chess.classAverage.puzzleAccuracy),
                    })}
                  </Badge>
                  <Badge variant="outline">
                    {t("classroom.progress.classAverageLearn", {
                      defaultValue: "Class avg. Learn completion: {{value}}%",
                      value: report.chess.classAverage.learnCompletionPercentage,
                    })}
                  </Badge>
                </div>

                {report.chess.students.length === 0 ? (
                  <p className="body-sm text-neutral-500">
                    {t("classroom.progress.chessEmpty", {
                      defaultValue: "No students in this classroom yet.",
                    })}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t("classroom.students.realName", { defaultValue: "Name" })}
                        </TableHead>
                        <TableHead>
                          {t("classroom.progress.ratings", { defaultValue: "Ratings" })}
                        </TableHead>
                        <TableHead>
                          {t("classroom.progress.matches", { defaultValue: "Matches" })}
                        </TableHead>
                        <TableHead>
                          {t("classroom.progress.winRate", { defaultValue: "Win rate" })}
                        </TableHead>
                        <TableHead>
                          {t("classroom.progress.puzzles", { defaultValue: "Puzzles" })}
                        </TableHead>
                        <TableHead>
                          {t("classroom.progress.playDuration", { defaultValue: "Play time" })}
                        </TableHead>
                        <TableHead>
                          {t("classroom.progress.learn", { defaultValue: "Learn" })}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.chess.students.map((student: ChessStudentProgress) => (
                        <TableRow key={student.userId}>
                          <TableCell>
                            {student.realName ??
                              t("classroom.students.you", { defaultValue: "You" })}
                          </TableCell>
                          <TableCell>
                            {student.ratings.length === 0 ? (
                              <span className="text-neutral-500">—</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {student.ratings.map((rating) => (
                                  <span key={rating.category} className="details-sm">
                                    {rating.category}: {Math.round(rating.ratingStart)} →{" "}
                                    {Math.round(rating.ratingEnd)} (
                                    {t("classroom.progress.currentRating", {
                                      defaultValue: "now {{value}}",
                                      value: Math.round(rating.current),
                                    })}
                                    )
                                  </span>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.matchesWon}/{student.matchesPlayed}
                          </TableCell>
                          <TableCell>
                            {student.matchesPlayed > 0 ? formatPercent(student.winRate) : "—"}
                          </TableCell>
                          <TableCell>
                            {student.puzzlesCorrect}/{student.puzzlesAttempted}
                          </TableCell>
                          <TableCell>
                            {t("classroom.progress.minutes", {
                              defaultValue: "{{count}} min",
                              count: formatMinutes(student.playDurationMs),
                            })}
                          </TableCell>
                          <TableCell>
                            {student.learnCompletedLevels}/{student.learnTotalLevels} (
                            {student.learnCompletionPercentage}%)
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t("classroom.progress.coursesHeading", { defaultValue: "Courses" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {report.courses.length === 0 ? (
                  <p className="body-sm text-neutral-500">
                    {t("classroom.progress.coursesEmpty", {
                      defaultValue: "No courses assigned to this classroom yet.",
                    })}
                  </p>
                ) : (
                  report.courses.map((course: CourseProgress) => (
                    <div key={course.courseId} className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="h6 text-neutral-800">
                          {getLocalizedTitle(course.title, language)}
                        </h3>
                        <Badge variant="outline">
                          {t("classroom.progress.courseAverage", {
                            defaultValue: "Avg. completion: {{value}}%",
                            value: course.averageCompletionPercentage,
                          })}
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              {t("classroom.students.realName", { defaultValue: "Name" })}
                            </TableHead>
                            <TableHead>
                              {t("classroom.progress.status", { defaultValue: "Status" })}
                            </TableHead>
                            <TableHead>
                              {t("classroom.progress.chapters", { defaultValue: "Chapters" })}
                            </TableHead>
                            <TableHead>
                              {t("classroom.progress.completion", { defaultValue: "Completion" })}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {course.students.map((student) => {
                            const chessStudent = report.chess.students.find(
                              (s: ChessStudentProgress) => s.userId === student.userId,
                            );
                            return (
                              <TableRow key={student.userId}>
                                <TableCell>
                                  {chessStudent
                                    ? (chessStudent.realName ??
                                      t("classroom.students.you", { defaultValue: "You" }))
                                    : student.userId}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      student.progress === "not_enrolled" ? "secondary" : "outline"
                                    }
                                  >
                                    {t(`classroom.progress.courseStatus.${student.progress}`, {
                                      defaultValue: student.progress,
                                    })}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {student.finishedChapterCount}/{course.totalChapterCount}
                                </TableCell>
                                <TableCell>{student.completionPercentage}%</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
