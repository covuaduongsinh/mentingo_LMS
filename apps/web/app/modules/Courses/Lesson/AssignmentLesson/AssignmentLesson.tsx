import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { assignmentsApi } from "~/api/assignments-api";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/components/ui/use-toast";
import Loader from "~/modules/common/Loader/Loader";

import type {
  AssignmentSubmissionContents,
  AssignmentTask,
  AssignmentTaskSubmission,
  LearnerAssignmentView,
} from "~/api/assignments-api";
import type { GetLessonByIdResponse } from "~/api/generated-api";

type AssignmentLessonProps = {
  lessonId: string;
  lesson: GetLessonByIdResponse["data"];
};

const localizedText = (value: Record<string, string> | null | undefined) => {
  if (!value) return "";
  return Object.values(value)[0] ?? "";
};

/**
 * Student view for an assignment lesson. Fetches directly via the
 * hand-rolled `assignmentsApi` (see apps/web/app/api/assignments-api.ts)
 * rather than a TanStack Query hook, since the generated client does not
 * cover these endpoints yet — see that file's header comment for the
 * follow-up migration once `pnpm generate:client` is run.
 */
export const AssignmentLesson = ({ lessonId }: AssignmentLessonProps) => {
  const { t } = useTranslation();
  const [view, setView] = useState<LearnerAssignmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, AssignmentSubmissionContents>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await assignmentsApi.getForLearner(lessonId);
      setView(data);
    } catch {
      toast({
        title: t("studentLessonView.assignment.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  if (loading) return <Loader />;
  if (!view) return null;

  const { assignment, tasks, taskSubmissions } = view;
  const submissionByTask = new Map<string, AssignmentTaskSubmission>(
    taskSubmissions.map((submission) => [submission.taskId, submission]),
  );

  const setDraft = (taskId: string, patch: AssignmentSubmissionContents) => {
    setDrafts((previous) => ({ ...previous, [taskId]: { ...previous[taskId], ...patch } }));
  };

  const submitTask = async (task: AssignmentTask) => {
    const draft = drafts[task.id];
    if (!draft) return;

    setSubmittingTaskId(task.id);
    try {
      await assignmentsApi.submitTask(task.id, draft);
      toast({ title: t("studentLessonView.assignment.submitted") });
      await load();
    } catch {
      toast({
        title: t("studentLessonView.assignment.submitError"),
        variant: "destructive",
      });
    } finally {
      setSubmittingTaskId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <h2 className="h5">{localizedText(assignment.title)}</h2>
          {assignment.description && (
            <p className="body-base text-neutral-700">{localizedText(assignment.description)}</p>
          )}
          {view.userSubmission && (
            <p className="body-sm text-neutral-600">
              {t("studentLessonView.assignment.status")}: {view.userSubmission.status}
              {view.userSubmission.grade != null &&
                ` — ${t("studentLessonView.assignment.grade")}: ${view.userSubmission.grade}%`}
            </p>
          )}
        </CardHeader>
      </Card>

      {tasks.map((task) => {
        const submission = submissionByTask.get(task.id);
        const isGraded = submission?.grade != null;

        return (
          <Card key={task.id}>
            <CardContent className="flex flex-col gap-3 pt-6">
              <h3 className="h6">{localizedText(task.title)}</h3>
              {task.description && (
                <p className="body-sm text-neutral-700">{localizedText(task.description)}</p>
              )}

              {(task.taskType === "short_answer" || task.taskType === "chess_pgn_analysis") && (
                <Textarea
                  defaultValue={submission?.submission.text ?? ""}
                  placeholder={
                    task.taskType === "chess_pgn_analysis"
                      ? t("studentLessonView.assignment.pgnPlaceholder")
                      : t("studentLessonView.assignment.answerPlaceholder")
                  }
                  onChange={(event) =>
                    setDraft(task.id, {
                      [task.taskType === "chess_pgn_analysis" ? "pgn" : "text"]: event.target.value,
                    })
                  }
                />
              )}

              {task.taskType === "number_answer" && (
                <Input
                  type="number"
                  defaultValue={submission?.submission.number ?? ""}
                  onChange={(event) => setDraft(task.id, { number: Number(event.target.value) })}
                />
              )}

              {task.taskType === "chess_position_line" && (
                <Input
                  defaultValue={submission?.submission.movesUci?.join(" ") ?? ""}
                  placeholder="e2e4 e7e5 g1f3"
                  onChange={(event) =>
                    setDraft(task.id, { movesUci: event.target.value.trim().split(/\s+/) })
                  }
                />
              )}

              {task.taskType === "file_submission" && (
                <p className="body-sm text-neutral-500">
                  {t("studentLessonView.assignment.fileSubmissionFollowUp")}
                </p>
              )}

              {submission?.feedback && (
                <p className="body-sm rounded bg-neutral-50 p-3 text-neutral-700">
                  {t("studentLessonView.assignment.feedback")}: {submission.feedback}
                </p>
              )}

              {task.taskType !== "file_submission" && (
                <Button
                  className="w-fit"
                  disabled={submittingTaskId === task.id || (isGraded && !assignment.allowRetries)}
                  onClick={() => submitTask(task)}
                >
                  {isGraded
                    ? t("studentLessonView.assignment.resubmit")
                    : t("studentLessonView.assignment.submit")}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
