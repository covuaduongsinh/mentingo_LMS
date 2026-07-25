import { useParams } from "@remix-run/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useGradeAssignmentTaskSubmission } from "~/api/mutations/admin/useGradeAssignmentTaskSubmission";
import { useAssignmentForAuthor } from "~/api/queries/admin/useAssignmentForAuthor";
import { useAssignmentSubmissionForGrading } from "~/api/queries/admin/useAssignmentSubmissionForGrading";
import { useAssignmentSubmissionsForGrading } from "~/api/queries/admin/useAssignmentSubmissionsForGrading";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { FenBoard, PgnViewer } from "~/modules/Chess/board";
import Loader from "~/modules/common/Loader/Loader";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.assignmentGrading");

const localizedText = (value: Record<string, string> | object | null | undefined) => {
  if (!value) return "";
  return Object.values(value as Record<string, string>)[0] ?? "";
};

type GradeDraft = { grade: number; feedback: string };

export default function AssignmentGrading() {
  const { lessonId } = useParams();
  const { t } = useTranslation();

  const { data: assignment, isLoading: isAssignmentLoading } = useAssignmentForAuthor(lessonId);
  const { data: submissions, isLoading: isSubmissionsLoading } = useAssignmentSubmissionsForGrading(
    assignment?.id,
  );
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const { data: detail } = useAssignmentSubmissionForGrading(assignment?.id, selectedUserId);
  const { mutateAsync: gradeTaskSubmission, isPending: isSaving } =
    useGradeAssignmentTaskSubmission();
  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>({});

  useEffect(() => {
    if (!detail) return;
    const next: Record<string, GradeDraft> = {};
    for (const submission of detail.taskSubmissions) {
      next[submission.id] = { grade: submission.grade ?? 0, feedback: submission.feedback ?? "" };
    }
    setDrafts(next);
  }, [detail]);

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

  return (
    <PageWrapper breadcrumbs={breadcrumbs} className="flex flex-col gap-y-6">
      <h1 className="h4">{localizedText(assignment.title)}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-2 lg:col-span-1">
          {(submissions ?? []).map((submission) => (
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
          {(submissions ?? []).length === 0 && (
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
                <Button
                  className="w-fit"
                  disabled={isSaving}
                  onClick={() => handleSaveGrade(submission.id)}
                >
                  {t("adminCourseView.assignmentGrading.saveGrade", {
                    defaultValue: "Save grade",
                  })}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}
