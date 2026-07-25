import { useParams } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { assignmentsApi } from "~/api/assignments-api";
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
import Breadcrumb from "~/modules/Admin/EditCourse/CourseLessons/NewLesson/components/Breadcrumb";
import { ContentTypes } from "~/modules/Admin/EditCourse/EditCourse.types";

import type { SupportedLanguages } from "@repo/shared";
import type { AssignmentTaskType } from "~/api/assignments-api";
import type { Chapter, Lesson } from "~/modules/Admin/EditCourse/EditCourse.types";

type DraftTask = {
  taskType: AssignmentTaskType;
  title: string;
  expectedAnswer?: string;
  expectedNumber?: number;
  solutionMovesUci?: string;
  maxGradeValue: number;
};

const TASK_TYPES: AssignmentTaskType[] = [
  "short_answer",
  "number_answer",
  "chess_position_line",
  "chess_pgn_analysis",
  "file_submission",
];

const emptyTask = (): DraftTask => ({
  taskType: "short_answer",
  title: "",
  maxGradeValue: 100,
});

type AssignmentLessonFormProps = {
  lessonToEdit?: Lesson | null;
  chapterToEdit: Chapter | null;
  setSelectedLesson: (selectedLesson: Lesson | null) => void;
  setContentTypeToDisplay: (contentTypeToDisplay: string) => void;
  language: SupportedLanguages;
};

/**
 * Create-only authoring form for assignment lessons — editing an existing
 * assignment (loading its tasks back for edit, diffing on save like
 * EmbedLessonForm does for resources) is a follow-up; see the business
 * spec. Creating is fully wired to POST /assignments/lessons.
 */
export const AssignmentLessonForm = ({
  chapterToEdit,
  setContentTypeToDisplay,
  language,
}: AssignmentLessonFormProps) => {
  const { t } = useTranslation();
  const { id: courseId } = useParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [allowRetries, setAllowRetries] = useState(true);
  const [tasks, setTasks] = useState<DraftTask[]>([emptyTask()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateTask = (index: number, patch: Partial<DraftTask>) => {
    setTasks((previous) => previous.map((task, i) => (i === index ? { ...task, ...patch } : task)));
  };

  const addTask = () => setTasks((previous) => [...previous, emptyTask()]);
  const removeTask = (index: number) =>
    setTasks((previous) => previous.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!chapterToEdit || !courseId || !title.trim()) return;

    setIsSubmitting(true);
    try {
      await assignmentsApi.createAssignmentLesson({
        chapterId: chapterToEdit.id,
        title,
        description: description || undefined,
        showCorrectAnswers,
        allowRetries,
        published: true,
        tasks: tasks
          .filter((task) => task.title.trim())
          .map((task) => ({
            title: { [language]: task.title },
            taskType: task.taskType,
            maxGradeValue: task.maxGradeValue,
            contents: {
              expectedAnswer: task.expectedAnswer,
              expectedNumber: task.expectedNumber,
              solutionMovesUci: task.solutionMovesUci
                ? task.solutionMovesUci.trim().split(/\s+/)
                : undefined,
            },
          })),
      });

      toast({ title: t("adminCourseView.curriculum.other.lessonCreated") });
      setContentTypeToDisplay(ContentTypes.EMPTY);
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

  return (
    <Card>
      <CardHeader className="px-8 pb-6 pt-8">
        <Breadcrumb
          lessonLabel={t("adminCourseView.curriculum.lesson.other.assignment")}
          setContentTypeToDisplay={setContentTypeToDisplay}
          setSelectedLesson={() => {}}
        />
        <div className="h5 text-neutral-950">{t("adminCourseView.curriculum.other.create")}</div>
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
            <div key={index} className="space-y-3 rounded-lg border border-neutral-200 p-4">
              <Select
                value={task.taskType}
                onValueChange={(value) =>
                  updateTask(index, { taskType: value as AssignmentTaskType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={t("adminCourseView.curriculum.lesson.field.title")}
                value={task.title}
                onChange={(event) => updateTask(index, { title: event.target.value })}
              />
              {task.taskType === "short_answer" && (
                <Textarea
                  placeholder={t("adminCourseView.curriculum.lesson.field.expectedAnswer")}
                  value={task.expectedAnswer ?? ""}
                  onChange={(event) => updateTask(index, { expectedAnswer: event.target.value })}
                />
              )}
              {task.taskType === "number_answer" && (
                <Input
                  type="number"
                  placeholder={t("adminCourseView.curriculum.lesson.field.expectedNumber")}
                  value={task.expectedNumber ?? ""}
                  onChange={(event) =>
                    updateTask(index, { expectedNumber: Number(event.target.value) })
                  }
                />
              )}
              {task.taskType === "chess_position_line" && (
                <Input
                  placeholder="e2e4 e7e5 g1f3"
                  value={task.solutionMovesUci ?? ""}
                  onChange={(event) => updateTask(index, { solutionMovesUci: event.target.value })}
                />
              )}
              <Button
                type="button"
                variant="outline"
                className="border-red-500 text-red-500"
                onClick={() => removeTask(index)}
              >
                {t("common.button.delete")}
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addTask}>
            {t("adminCourseView.curriculum.lesson.button.addTask")}
          </Button>
        </div>

        <div className="flex gap-x-3">
          <Button disabled={isSubmitting || !title.trim()} onClick={handleSubmit}>
            {t("common.button.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setContentTypeToDisplay(ContentTypes.EMPTY)}
          >
            {t("common.button.cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
