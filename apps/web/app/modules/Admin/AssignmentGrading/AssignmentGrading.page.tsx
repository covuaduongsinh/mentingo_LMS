import { useParams } from "@remix-run/react";
import { ArrowUpDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useGradeAssignmentTaskSubmission } from "~/api/mutations/admin/useGradeAssignmentTaskSubmission";
import { useRejectAssignmentTaskSubmission } from "~/api/mutations/admin/useRejectAssignmentTaskSubmission";
import { useAssignmentForAuthor } from "~/api/queries/admin/useAssignmentForAuthor";
import { useAssignmentSubmissionForGrading } from "~/api/queries/admin/useAssignmentSubmissionForGrading";
import { useAssignmentSubmissionsForGrading } from "~/api/queries/admin/useAssignmentSubmissionsForGrading";
import { useAssignmentSummary } from "~/api/queries/admin/useAssignmentSummary";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useDebounce } from "~/hooks/useDebounce";
import { FenBoard, PgnViewer } from "~/modules/Chess/board";
import Loader from "~/modules/common/Loader/Loader";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";
import type { ListSubmissionsForGradingResponse } from "~/api/generated-api";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.assignmentGrading");

const localizedText = (value: Record<string, string> | object | null | undefined) => {
  if (!value) return "";
  return Object.values(value as Record<string, string>)[0] ?? "";
};

type GradeDraft = { grade: number; feedback: string };

type SubmissionRow = ListSubmissionsForGradingResponse["data"][number];

const STATUS_FILTER_VALUES = ["all", "not_submitted", "submitted", "graded", "late"] as const;
type StatusFilter = (typeof STATUS_FILTER_VALUES)[number];

const SORT_OPTIONS = ["name", "status", "grade"] as const;
type SortField = (typeof SORT_OPTIONS)[number];

export default function AssignmentGrading() {
  const { lessonId } = useParams();
  const { t } = useTranslation();

  const { data: assignment, isLoading: isAssignmentLoading } = useAssignmentForAuthor(lessonId);
  const { data: submissions, isLoading: isSubmissionsLoading } = useAssignmentSubmissionsForGrading(
    assignment?.id,
  );
  const { data: summary } = useAssignmentSummary(assignment?.id);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const { data: detail } = useAssignmentSubmissionForGrading(assignment?.id, selectedUserId);
  const { mutateAsync: gradeTaskSubmission, isPending: isSaving } =
    useGradeAssignmentTaskSubmission();
  const { mutateAsync: rejectTaskSubmission, isPending: isRejecting } =
    useRejectAssignmentTaskSubmission();
  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>({});

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300).trim().toLowerCase();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDescending, setSortDescending] = useState(false);

  useEffect(() => {
    if (!detail) return;
    const next: Record<string, GradeDraft> = {};
    for (const submission of detail.taskSubmissions) {
      next[submission.id] = { grade: submission.grade ?? 0, feedback: submission.feedback ?? "" };
    }
    setDrafts(next);
  }, [detail]);

  const visibleSubmissions = useMemo(() => {
    const rows = (submissions ?? []).filter((submission: SubmissionRow) => {
      if (statusFilter !== "all" && submission.status !== statusFilter) return false;
      if (!search) return true;
      const haystack =
        `${submission.userFirstName} ${submission.userLastName} ${submission.userEmail}`.toLowerCase();
      return haystack.includes(search);
    });

    const sorted = [...rows].sort((a, b) => {
      if (sortField === "grade") return (a.grade ?? -1) - (b.grade ?? -1);
      if (sortField === "status") return a.status.localeCompare(b.status);
      return `${a.userFirstName} ${a.userLastName}`.localeCompare(
        `${b.userFirstName} ${b.userLastName}`,
      );
    });

    return sortDescending ? sorted.reverse() : sorted;
  }, [submissions, statusFilter, search, sortField, sortDescending]);

  const breadcrumbs = [{ title: t("adminCourseView.assignmentGrading.title"), href: "" }];

  if (isAssignmentLoading || isSubmissionsLoading) return <Loader />;
  if (!assignment) return null;

  const handleSaveGrade = async (taskSubmissionId: string) => {
    const draft = drafts[taskSubmissionId];
    if (!draft) return;
    await gradeTaskSubmission({
      taskSubmissionId,
      data: { grade: draft.grade, feedback: draft.feedback || undefined },
    });
  };

  const handleQuickGrade = (submissionId: string, maxGradeValue: number, fraction: 1 | 0.5 | 0) => {
    setDrafts((previous) => ({
      ...previous,
      [submissionId]: {
        ...(previous[submissionId] ?? { grade: 0, feedback: "" }),
        grade: Math.round(maxGradeValue * fraction),
      },
    }));
  };

  return (
    <PageWrapper breadcrumbs={breadcrumbs} className="flex flex-col gap-y-6">
      <h1 className="h4">{localizedText(assignment.title)}</h1>

      {summary && (
        <div className="flex flex-wrap gap-4 rounded-lg border border-neutral-200 p-4">
          <div className="flex flex-col">
            <span className="body-sm text-neutral-500">
              {t("adminCourseView.assignmentGrading.summary.totalLearners", {
                defaultValue: "Learners",
              })}
            </span>
            <span className="h6">{summary.totalLearners}</span>
          </div>
          <div className="flex flex-col">
            <span className="body-sm text-neutral-500">
              {t("adminCourseView.assignmentGrading.summary.averageGrade", {
                defaultValue: "Average grade",
              })}
            </span>
            <span className="h6">
              {summary.averageGrade != null ? `${summary.averageGrade}%` : "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="body-sm text-neutral-500">
              {t("adminCourseView.assignmentGrading.summary.passRate", {
                defaultValue: "Pass rate",
              })}
            </span>
            <span className="h6">{summary.passRate != null ? `${summary.passRate}%` : "—"}</span>
          </div>
          <div className="flex flex-col">
            <span className="body-sm text-neutral-500">
              {t("adminCourseView.assignmentGrading.summary.graded", { defaultValue: "Graded" })}
            </span>
            <span className="h6">
              {summary.statusCounts.graded} / {summary.totalLearners}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t("adminCourseView.assignmentGrading.searchPlaceholder", {
                defaultValue: "Search by name or email",
              })}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`adminCourseView.assignmentGrading.statusFilter.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`adminCourseView.assignmentGrading.sortField.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setSortDescending((previous) => !previous)}
              aria-label={t("adminCourseView.assignmentGrading.toggleSortDirection", {
                defaultValue: "Toggle sort direction",
              })}
            >
              <ArrowUpDown className="size-4" />
            </Button>
          </div>

          {visibleSubmissions.map((submission) => (
            <button
              key={submission.userId}
              type="button"
              onClick={() => setSelectedUserId(submission.userId)}
              className={`flex flex-col gap-1 rounded-lg border p-3 text-left ${
                selectedUserId === submission.userId
                  ? "border-primary-600 bg-primary-50"
                  : "border-neutral-200"
              }`}
            >
              <span className="body-base-md">
                {submission.userFirstName} {submission.userLastName}
              </span>
              <span className="body-sm text-neutral-600">{submission.userEmail}</span>
              <div className="flex items-center gap-2">
                <Badge>{submission.status}</Badge>
                {submission.grade != null && (
                  <span className="body-sm">
                    {t("studentLessonView.assignment.grade")}: {submission.grade}%
                  </span>
                )}
              </div>
            </button>
          ))}
          {visibleSubmissions.length === 0 && (
            <p className="body-sm text-neutral-600">
              {t("adminCourseView.assignmentGrading.noSubmissions", {
                defaultValue: "No submissions yet.",
              })}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          {!detail && (
            <p className="body-sm text-neutral-600">
              {t("adminCourseView.assignmentGrading.selectLearner", {
                defaultValue: "Select a learner to grade their submission.",
              })}
            </p>
          )}

          {detail?.tasks.map((task) => {
            const submission = detail.taskSubmissions.find((item) => item.taskId === task.id);
            if (!submission) return null;
            const draft = drafts[submission.id] ?? { grade: 0, feedback: "" };

            return (
              <div key={task.id} className="flex flex-col gap-3 rounded-lg border p-4">
                <h3 className="h6">{localizedText(task.title)}</h3>

                {task.taskType === "short_answer" && (
                  <p className="body-sm whitespace-pre-wrap">{submission.submission.text}</p>
                )}
                {task.taskType === "number_answer" && (
                  <p className="body-sm">{submission.submission.number}</p>
                )}
                {task.taskType === "chess_position_line" && (
                  <p className="body-sm font-mono">{submission.submission.movesUci?.join(" ")}</p>
                )}
                {task.taskType === "chess_pgn_analysis" && submission.submission.pgn && (
                  <PgnViewer pgn={submission.submission.pgn} size={240} />
                )}
                {task.taskType === "chess_pgn_analysis" && task.contents.fen && (
                  <FenBoard fen={task.contents.fen} size={200} />
                )}
                {task.taskType === "file_submission" && (
                  <div>
                    {submission.submission.fileUrl ? (
                      <a
                        href={submission.submission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="body-sm text-primary-700 underline"
                      >
                        {submission.submission.fileName ??
                          t("adminCourseView.assignmentGrading.downloadFile", {
                            defaultValue: "Download file",
                          })}
                      </a>
                    ) : (
                      <p className="body-sm text-neutral-500">
                        {t("adminCourseView.assignmentGrading.noFile", {
                          defaultValue: "No file submitted.",
                        })}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-end gap-3">
                  <div className="space-y-1">
                    <Label>
                      {t("adminCourseView.assignmentGrading.grade", { defaultValue: "Grade" })}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={task.maxGradeValue}
                      value={draft.grade}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [submission.id]: { ...draft, grade: Number(event.target.value) },
                        }))
                      }
                      className="w-24"
                    />
                  </div>
                  <span className="body-sm text-neutral-500">/ {task.maxGradeValue}</span>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => handleQuickGrade(submission.id, task.maxGradeValue, 1)}
                    >
                      {t("adminCourseView.assignmentGrading.quickGrade.full", {
                        defaultValue: "Full",
                      })}
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => handleQuickGrade(submission.id, task.maxGradeValue, 0.5)}
                    >
                      {t("adminCourseView.assignmentGrading.quickGrade.half", {
                        defaultValue: "Half",
                      })}
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => handleQuickGrade(submission.id, task.maxGradeValue, 0)}
                    >
                      {t("adminCourseView.assignmentGrading.quickGrade.zero", {
                        defaultValue: "Zero",
                      })}
                    </Button>
                  </div>
                </div>
                <Textarea
                  placeholder={t("adminCourseView.assignmentGrading.feedbackPlaceholder", {
                    defaultValue: "Feedback for the learner (optional)",
                  })}
                  value={draft.feedback}
                  onChange={(event) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [submission.id]: { ...draft, feedback: event.target.value },
                    }))
                  }
                />
                <div className="flex gap-2">
                  <Button
                    className="w-fit"
                    disabled={isSaving}
                    onClick={() => handleSaveGrade(submission.id)}
                  >
                    {t("adminCourseView.assignmentGrading.saveGrade", {
                      defaultValue: "Save grade",
                    })}
                  </Button>
                  <Button
                    type="button"
                    className="w-fit"
                    variant="outline"
                    disabled={isRejecting}
                    onClick={() => rejectTaskSubmission(submission.id)}
                  >
                    <X className="mr-1.5 size-3.5" aria-hidden />
                    {t("adminCourseView.assignmentGrading.reject", {
                      defaultValue: "Reject",
                    })}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}
