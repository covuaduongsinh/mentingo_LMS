import { Link, useParams } from "@remix-run/react";
import { ASSIGNMENT_TASK_TYPE } from "@repo/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAddAssignmentTask } from "~/api/mutations/admin/useAddAssignmentTask";
import { useCreateAssignmentLesson } from "~/api/mutations/admin/useCreateAssignmentLesson";
import { useDeleteAssignmentTask } from "~/api/mutations/admin/useDeleteAssignmentTask";
import { useDeleteLesson } from "~/api/mutations/admin/useDeleteLesson";
import { useUpdateAssignment } from "~/api/mutations/admin/useUpdateAssignment";
import { useUpdateAssignmentTask } from "~/api/mutations/admin/useUpdateAssignmentTask";
import { useAssignmentForAuthor } from "~/api/queries/admin/useAssignmentForAuthor";
import { courseQueryOptions } from "~/api/queries/admin/useBetaCourse";
import { queryClient } from "~/api/queryClient";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
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
import { toast } from "~/components/ui/use-toast";
import DeleteConfirmationModal from "~/modules/Admin/components/DeleteConfirmationModal";
import Breadcrumb from "~/modules/Admin/EditCourse/CourseLessons/NewLesson/components/Breadcrumb";
import { ContentTypes, DeleteContentType } from "~/modules/Admin/EditCourse/EditCourse.types";
import { AssignmentChessMoveInput } from "~/modules/Courses/Lesson/AssignmentLesson/AssignmentChessMoveInput";
import { DEFAULT_CHESS_START_FEN } from "~/modules/Courses/Lesson/AssignmentLesson/chessAssignmentUtils";

import type { SupportedLanguages } from "@repo/shared";
import type { AddTaskBody, UpdateTaskBody } from "~/api/generated-api";
import type { Chapter, Lesson } from "~/modules/Admin/EditCourse/EditCourse.types";

type AssignmentTaskType = (typeof ASSIGNMENT_TASK_TYPE)[keyof typeof ASSIGNMENT_TASK_TYPE];

type DraftTask = {
  /** Present only for tasks loaded from an existing assignment — drives update-vs-add on save. */
  id?: string;
  taskType: AssignmentTaskType;
  title: string;
  expectedAnswer?: string;
  expectedNumber?: number;
  fen?: string;
  solutionMovesUci: string[];
  allowedFileTypes?: string;
  maxFileSizeMb?: number;
  maxGradeValue: number;
};

const TASK_TYPES: AssignmentTaskType[] = [
  ASSIGNMENT_TASK_TYPE.SHORT_ANSWER,
  ASSIGNMENT_TASK_TYPE.NUMBER_ANSWER,
  ASSIGNMENT_TASK_TYPE.CHESS_POSITION_LINE,
  ASSIGNMENT_TASK_TYPE.CHESS_PGN_ANALYSIS,
  ASSIGNMENT_TASK_TYPE.FILE_SUBMISSION,
];

const emptyTask = (): DraftTask => ({
  taskType: ASSIGNMENT_TASK_TYPE.SHORT_ANSWER,
  title: "",
  solutionMovesUci: [],
  maxGradeValue: 100,
});

const taskToDraft = (task: {
  id: string;
  taskType: string;
  title: object;
  maxGradeValue: number;
  contents: {
    expectedAnswer?: string;
    expectedNumber?: number;
    fen?: string;
    solutionMovesUci?: string[];
    allowedFileTypes?: string[];
    maxFileSizeMb?: number;
  };
}): DraftTask => ({
  id: task.id,
  taskType: task.taskType as AssignmentTaskType,
  title: Object.values(task.title as Record<string, string>)[0] ?? "",
  expectedAnswer: task.contents.expectedAnswer,
  expectedNumber: task.contents.expectedNumber,
  fen: task.contents.fen,
  solutionMovesUci: task.contents.solutionMovesUci ?? [],
  allowedFileTypes: task.contents.allowedFileTypes?.join(","),
  maxFileSizeMb: task.contents.maxFileSizeMb,
  maxGradeValue: task.maxGradeValue,
});

const draftToContents = (task: DraftTask) => ({
  expectedAnswer: task.expectedAnswer,
  expectedNumber: task.expectedNumber,
  fen: task.fen?.trim() || undefined,
  solutionMovesUci: task.solutionMovesUci.length ? task.solutionMovesUci : undefined,
  allowedFileTypes: task.allowedFileTypes
    ?.split(",")
    .map((type) => type.trim())
    .filter(Boolean),
  maxFileSizeMb: task.maxFileSizeMb,
});

type AssignmentLessonFormProps = {
  lessonToEdit?: Lesson | null;
  chapterToEdit: Chapter | null;
  setSelectedLesson: (selectedLesson: Lesson | null) => void;
  setContentTypeToDisplay: (contentTypeToDisplay: string) => void;
  language: SupportedLanguages;
};

export const AssignmentLessonForm = ({
  lessonToEdit,
  chapterToEdit,
  setSelectedLesson,
  setContentTypeToDisplay,
  language,
}: AssignmentLessonFormProps) => {
  const { t } = useTranslation();
  const { id: courseId } = useParams();
  const isEditing = Boolean(lessonToEdit);

  const { data: existingAssignment } = useAssignmentForAuthor(
    isEditing ? lessonToEdit?.id : undefined,
  );

  const { mutateAsync: createAssignmentLesson } = useCreateAssignmentLesson();
  const { mutateAsync: updateAssignment } = useUpdateAssignment();
  const { mutateAsync: addTask } = useAddAssignmentTask();
  const { mutateAsync: updateTask } = useUpdateAssignmentTask();
  const { mutateAsync: deleteTask } = useDeleteAssignmentTask();
  const { mutateAsync: deleteLesson } = useDeleteLesson();

  const [title, setTitle] = useState(lessonToEdit?.title ?? "");
  const [description, setDescription] = useState("");
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [allowRetries, setAllowRetries] = useState(true);
  const [tasks, setTasks] = useState<DraftTask[]>([emptyTask()]);
  const [originalTaskIds, setOriginalTaskIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!existingAssignment) return;

    setTitle(Object.values(existingAssignment.title as Record<string, string>)[0] ?? "");
    setDescription(
      existingAssignment.description
        ? (Object.values(existingAssignment.description as Record<string, string>)[0] ?? "")
        : "",
    );
    setShowCorrectAnswers(existingAssignment.showCorrectAnswers);
    setAllowRetries(existingAssignment.allowRetries);
    setTasks(existingAssignment.tasks.map(taskToDraft));
    setOriginalTaskIds(existingAssignment.tasks.map((task) => task.id));
  }, [existingAssignment]);

  const updateTaskDraft = (index: number, patch: Partial<DraftTask>) => {
    setTasks((previous) => previous.map((task, i) => (i === index ? { ...task, ...patch } : task)));
  };

  const addTaskDraft = () => setTasks((previous) => [...previous, emptyTask()]);
  const removeTaskDraft = (index: number) =>
    setTasks((previous) => previous.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!chapterToEdit || !courseId || !title.trim()) return;

    setIsSubmitting(true);
    try {
      const validTasks = tasks.filter((task) => task.title.trim());

      if (!isEditing) {
        await createAssignmentLesson({
          chapterId: chapterToEdit.id,
          title,
          description: description || undefined,
          showCorrectAnswers,
          allowRetries,
          published: true,
          tasks: validTasks.map((task) => ({
            title: { [language]: task.title },
            taskType: task.taskType,
            maxGradeValue: task.maxGradeValue,
            contents: draftToContents(task),
          })),
        });
      } else if (existingAssignment) {
        await updateAssignment({
          id: existingAssignment.id,
          data: {
            title: { [language]: title },
            description: description ? { [language]: description } : null,
            showCorrectAnswers,
            allowRetries,
          },
        });

        const keptTaskIds = new Set(validTasks.map((task) => task.id).filter(Boolean));
        for (const removedId of originalTaskIds.filter((id) => !keptTaskIds.has(id))) {
          await deleteTask(removedId);
        }

        for (const task of validTasks) {
          const body: AddTaskBody | UpdateTaskBody = {
            title: { [language]: task.title },
            taskType: task.taskType,
            maxGradeValue: task.maxGradeValue,
            contents: draftToContents(task),
          };
          if (task.id) {
            await updateTask({ taskId: task.id, data: body });
          } else {
            await addTask({ assignmentId: existingAssignment.id, data: body as AddTaskBody });
          }
        }
      }

      toast({
        title: t(
          isEditing
            ? "adminCourseView.curriculum.other.lessonUpdated"
            : "adminCourseView.curriculum.other.lessonCreated",
        ),
      });
      setContentTypeToDisplay(ContentTypes.EMPTY);
      setSelectedLesson(null);
      await queryClient.invalidateQueries(courseQueryOptions(courseId, language));
    } catch {
      toast({
        title: t("adminCourseView.errors.lesson.assignmentCreateFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!chapterToEdit?.id || !lessonToEdit?.id) return;

    try {
      await deleteLesson({ chapterId: chapterToEdit.id, lessonId: lessonToEdit.id });
      setIsDeleteModalOpen(false);
      setContentTypeToDisplay(ContentTypes.EMPTY);
      setSelectedLesson(null);
    } catch {
      toast({
        title: t("adminCourseView.curriculum.lesson.toast.lessonDeleteError"),
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="px-8 pb-6 pt-8">
        <Breadcrumb
          lessonLabel={t("adminCourseView.curriculum.lesson.other.assignment")}
          setContentTypeToDisplay={setContentTypeToDisplay}
          setSelectedLesson={setSelectedLesson}
        />
        <div className="flex items-center justify-between">
          <div className="h5 text-neutral-950">
            {t(
              isEditing
                ? "adminCourseView.curriculum.other.edit"
                : "adminCourseView.curriculum.other.create",
            )}
          </div>
          {isEditing && lessonToEdit && (
            <Link
              to={`/admin/assignments/${lessonToEdit.id}/grading`}
              className="body-sm text-primary-700 underline"
            >
              {t("adminCourseView.assignmentGrading.title")}
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-y-5 px-8">
        <div className="space-y-2">
          <Label>{t("adminCourseView.curriculum.lesson.field.title")}</Label>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>{t("adminCourseView.curriculum.lesson.field.description")}</Label>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allowRetries}
            onCheckedChange={(checked) => setAllowRetries(checked === true)}
          />
          <Label>{t("adminCourseView.curriculum.lesson.field.allowRetries")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={showCorrectAnswers}
            onCheckedChange={(checked) => setShowCorrectAnswers(checked === true)}
          />
          <Label>{t("adminCourseView.curriculum.lesson.field.showCorrectAnswers")}</Label>
        </div>

        <div className="space-y-4">
          <Label>{t("adminCourseView.curriculum.lesson.other.tasks")}</Label>
          {tasks.map((task, index) => (
            <div
              key={task.id ?? index}
              className="space-y-3 rounded-lg border border-neutral-200 p-4"
            >
              <Select
                value={task.taskType}
                onValueChange={(value) =>
                  updateTaskDraft(index, { taskType: value as AssignmentTaskType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`adminCourseView.curriculum.lesson.assignmentTaskType.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={t("adminCourseView.curriculum.lesson.field.title")}
                value={task.title}
                onChange={(event) => updateTaskDraft(index, { title: event.target.value })}
              />
              {task.taskType === ASSIGNMENT_TASK_TYPE.SHORT_ANSWER && (
                <Textarea
                  placeholder={t("adminCourseView.curriculum.lesson.field.expectedAnswer")}
                  value={task.expectedAnswer ?? ""}
                  onChange={(event) =>
                    updateTaskDraft(index, { expectedAnswer: event.target.value })
                  }
                />
              )}
              {task.taskType === ASSIGNMENT_TASK_TYPE.NUMBER_ANSWER && (
                <Input
                  type="number"
                  placeholder={t("adminCourseView.curriculum.lesson.field.expectedNumber")}
                  value={task.expectedNumber ?? ""}
                  onChange={(event) =>
                    updateTaskDraft(index, { expectedNumber: Number(event.target.value) })
                  }
                />
              )}
              {task.taskType === ASSIGNMENT_TASK_TYPE.CHESS_PGN_ANALYSIS && (
                <Input
                  placeholder={t("adminCourseView.curriculum.lesson.field.chessFen", {
                    defaultValue: "Starting FEN (optional)",
                  })}
                  value={task.fen ?? ""}
                  onChange={(event) => updateTaskDraft(index, { fen: event.target.value })}
                />
              )}
              {task.taskType === ASSIGNMENT_TASK_TYPE.CHESS_POSITION_LINE && (
                <div className="space-y-2">
                  <Input
                    placeholder={t("adminCourseView.curriculum.lesson.field.chessFen", {
                      defaultValue: "Starting FEN (optional)",
                    })}
                    value={task.fen ?? ""}
                    onChange={(event) =>
                      updateTaskDraft(index, { fen: event.target.value, solutionMovesUci: [] })
                    }
                  />
                  <p className="body-sm text-neutral-600">
                    {t("adminCourseView.curriculum.lesson.field.chessSolutionMoves", {
                      defaultValue: "Play the correct solution line on the board:",
                    })}
                  </p>
                  <AssignmentChessMoveInput
                    fen={task.fen?.trim() || DEFAULT_CHESS_START_FEN}
                    moves={task.solutionMovesUci}
                    onChange={(solutionMovesUci) => updateTaskDraft(index, { solutionMovesUci })}
                  />
                </div>
              )}
              {task.taskType === ASSIGNMENT_TASK_TYPE.FILE_SUBMISSION && (
                <div className="space-y-2">
                  <Input
                    placeholder={t("adminCourseView.curriculum.lesson.field.allowedFileTypes", {
                      defaultValue: "Allowed file extensions, comma-separated (e.g. .pdf,.pgn)",
                    })}
                    value={task.allowedFileTypes ?? ""}
                    onChange={(event) =>
                      updateTaskDraft(index, { allowedFileTypes: event.target.value })
                    }
                  />
                  <Input
                    type="number"
                    placeholder={t("adminCourseView.curriculum.lesson.field.maxFileSizeMb", {
                      defaultValue: "Max file size (MB)",
                    })}
                    value={task.maxFileSizeMb ?? ""}
                    onChange={(event) =>
                      updateTaskDraft(index, { maxFileSizeMb: Number(event.target.value) })
                    }
                  />
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                className="border-red-500 text-red-500"
                onClick={() => removeTaskDraft(index)}
              >
                {t("common.button.delete")}
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addTaskDraft}>
            {t("adminCourseView.curriculum.lesson.button.addTask")}
          </Button>
        </div>

        <div className="flex gap-x-3">
          <Button disabled={isSubmitting || !title.trim()} onClick={handleSubmit}>
            {t("common.button.save")}
          </Button>
          {isEditing ? (
            <Button
              type="button"
              variant="outline"
              className="border-red-500 text-red-500"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              {t("common.button.delete")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setContentTypeToDisplay(ContentTypes.EMPTY)}
            >
              {t("common.button.cancel")}
            </Button>
          )}
        </div>
      </CardContent>
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDelete}
        contentType={DeleteContentType.ASSIGNMENT}
      />
    </Card>
  );
};
