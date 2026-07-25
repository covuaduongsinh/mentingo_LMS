import { Download, Lightbulb } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useUploadFile } from "~/api/mutations/admin/useUploadFile";
import { useSubmitAssignmentTask } from "~/api/mutations/useSubmitAssignmentTask";
import { useAssignmentForLearner } from "~/api/queries/useAssignmentForLearner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/components/ui/use-toast";
import { FenBoard } from "~/modules/Chess/board";
import Loader from "~/modules/common/Loader/Loader";

import { AssignmentChessMoveInput } from "./AssignmentChessMoveInput";
import { DEFAULT_CHESS_START_FEN } from "./chessAssignmentUtils";

import type React from "react";
import type { GetAssignmentForLearnerResponse, GetLessonByIdResponse } from "~/api/generated-api";

type AssignmentTask = GetAssignmentForLearnerResponse["data"]["tasks"][number];
type AssignmentTaskSubmission = NonNullable<
  GetAssignmentForLearnerResponse["data"]["taskSubmissions"]
>[number];
type SubmissionDraft = AssignmentTaskSubmission["submission"];

type AssignmentLessonProps = {
  lessonId: string;
  lesson: GetLessonByIdResponse["data"];
};

const localizedText = (value: Record<string, string> | object | null | undefined) => {
  if (!value) return "";
  return Object.values(value as Record<string, string>)[0] ?? "";
};

/** Student view for an assignment lesson. */
export const AssignmentLesson = ({ lessonId }: AssignmentLessonProps) => {
  const { t } = useTranslation();
  const { data: view, isLoading } = useAssignmentForLearner(lessonId);
  const { mutateAsync: submitTaskMutation, isPending: isSubmitting } = useSubmitAssignmentTask();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SubmissionDraft>>({});
  const [visibleHints, setVisibleHints] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (isLoading) return <Loader />;
  if (!view) return null;

  const { assignment, tasks, taskSubmissions } = view;
  const submissionByTask = new Map<string, AssignmentTaskSubmission>(
    taskSubmissions.map((submission) => [submission.taskId, submission]),
  );

  const setDraft = (taskId: string, patch: Partial<SubmissionDraft>) => {
    setDrafts((previous) => ({ ...previous, [taskId]: { ...previous[taskId], ...patch } }));
  };

  const submitTask = async (task: AssignmentTask) => {
    const draft = drafts[task.id];
    if (!draft) return;

    setSubmittingTaskId(task.id);
    try {
      await submitTaskMutation({ taskId: task.id, data: { submission: draft } });
      toast({ title: t("studentLessonView.assignment.submitted") });
    } catch {
      toast({
        title: t("studentLessonView.assignment.submitError"),
        variant: "destructive",
      });
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const handleFileSelected = async (task: AssignmentTask, file: File | undefined) => {
    if (!file) return;
    try {
      const uploaded = await uploadFile({ file, resource: "file" });
      setDraft(task.id, { fileS3Key: uploaded.fileKey, fileName: file.name });
    } catch {
      toast({
        title: t("studentLessonView.assignment.fileUploadError", {
          defaultValue: "Could not upload the file.",
        }),
        variant: "destructive",
      });
    }
  };

  const handleBlockedPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!assignment.antiCopyPaste) return;
    event.preventDefault();
    toast({
      title: t("studentLessonView.assignment.pasteDisabled", {
        defaultValue: "Pasting is disabled for this assignment",
      }),
    });
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
        const draft = drafts[task.id];
        const startFen = task.contents.fen?.trim() || DEFAULT_CHESS_START_FEN;

        const hintText = localizedText(task.hint);
        const isHintVisible = Boolean(visibleHints[task.id]);

        return (
          <Card key={task.id}>
            <CardContent className="flex flex-col gap-3 pt-6">
              <h3 className="h6">{localizedText(task.title)}</h3>
              {task.description && (
                <p className="body-sm text-neutral-700">{localizedText(task.description)}</p>
              )}

              {hintText && (
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit px-0 text-primary-700"
                    onClick={() =>
                      setVisibleHints((previous) => ({
                        ...previous,
                        [task.id]: !previous[task.id],
                      }))
                    }
                  >
                    <Lightbulb className="mr-1.5 size-3.5" aria-hidden />
                    {t(
                      isHintVisible
                        ? "studentLessonView.assignment.hideHint"
                        : "studentLessonView.assignment.showHint",
                    )}
                  </Button>
                  {isHintVisible && (
                    <p className="body-sm rounded bg-amber-50 p-3 text-amber-900">{hintText}</p>
                  )}
                </div>
              )}

              {task.referenceFileUrl && (
                <a
                  href={task.referenceFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="body-sm inline-flex w-fit items-center gap-1.5 text-primary-700 underline"
                >
                  <Download className="size-3.5" aria-hidden />
                  {t("studentLessonView.assignment.downloadReferenceFile", {
                    defaultValue: "Download reference file",
                  })}
                </a>
              )}

              {task.taskType === "short_answer" && (
                <Textarea
                  defaultValue={submission?.submission.text ?? ""}
                  placeholder={t("studentLessonView.assignment.answerPlaceholder")}
                  onChange={(event) => setDraft(task.id, { text: event.target.value })}
                  onPaste={handleBlockedPaste}
                />
              )}

              {task.taskType === "chess_pgn_analysis" && (
                <div className="flex flex-col gap-3">
                  {task.contents.fen && (
                    <FenBoard fen={task.contents.fen} size={280} className="self-start" />
                  )}
                  <Textarea
                    defaultValue={submission?.submission.pgn ?? ""}
                    placeholder={t("studentLessonView.assignment.pgnPlaceholder")}
                    onChange={(event) => setDraft(task.id, { pgn: event.target.value })}
                    onPaste={handleBlockedPaste}
                  />
                </div>
              )}

              {task.taskType === "number_answer" && (
                <Input
                  type="number"
                  defaultValue={submission?.submission.number ?? ""}
                  onChange={(event) => setDraft(task.id, { number: Number(event.target.value) })}
                />
              )}

              {task.taskType === "chess_position_line" && (
                <AssignmentChessMoveInput
                  fen={startFen}
                  moves={draft?.movesUci ?? submission?.submission.movesUci ?? []}
                  onChange={(movesUci) => setDraft(task.id, { movesUci })}
                  disabled={Boolean(isGraded && !assignment.allowRetries)}
                />
              )}

              {task.taskType === "file_submission" && (
                <div className="flex flex-col gap-2">
                  <input
                    ref={(element) => {
                      fileInputRefs.current[task.id] = element;
                    }}
                    type="file"
                    className="hidden"
                    accept={task.contents.allowedFileTypes?.join(",")}
                    onChange={(event) => handleFileSelected(task, event.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit"
                    disabled={isUploading}
                    onClick={() => fileInputRefs.current[task.id]?.click()}
                  >
                    {t("studentLessonView.assignment.chooseFile", { defaultValue: "Choose file" })}
                  </Button>
                  {(draft?.fileName ?? submission?.submission.fileName) && (
                    <p className="body-sm text-neutral-700">
                      {draft?.fileName ?? submission?.submission.fileName}
                    </p>
                  )}
                  {task.contents.maxFileSizeMb && (
                    <p className="body-sm text-neutral-500">
                      {t("studentLessonView.assignment.maxFileSize", {
                        defaultValue: "Max {{size}} MB",
                        size: task.contents.maxFileSizeMb,
                      })}
                    </p>
                  )}
                </div>
              )}

              {submission?.feedback && (
                <p className="body-sm rounded bg-neutral-50 p-3 text-neutral-700">
                  {t("studentLessonView.assignment.feedback")}: {submission.feedback}
                </p>
              )}

              <Button
                className="w-fit"
                disabled={
                  (submittingTaskId === task.id && isSubmitting) ||
                  (isGraded && !assignment.allowRetries) ||
                  !draft
                }
                onClick={() => submitTask(task)}
              >
                {isGraded
                  ? t("studentLessonView.assignment.resubmit")
                  : t("studentLessonView.assignment.submit")}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
