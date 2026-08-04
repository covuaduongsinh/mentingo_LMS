import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateChessStudyLesson } from "~/api/mutations/useCreateChessStudyLesson";
import { useChessStudies } from "~/api/queries/useChessStudies";
import { useChessStudy } from "~/api/queries/useChessStudy";
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

import { ContentTypes } from "../../../EditCourse.types";

import type { Chapter } from "../../../EditCourse.types";

type ChessStudyLessonFormProps = {
  chapterToEdit: Chapter | null;
  setContentTypeToDisplay: (contentTypeToDisplay: string) => void;
  language: string;
};

export function ChessStudyLessonForm({
  chapterToEdit,
  setContentTypeToDisplay,
}: ChessStudyLessonFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [studyId, setStudyId] = useState("");
  const [studyChapterId, setStudyChapterId] = useState<string>("all");

  const { data: studiesData } = useChessStudies({ mine: true, perPage: 100 });
  const { data: studyDetail } = useChessStudy(studyId || undefined);
  const { mutateAsync: createLesson, isPending } = useCreateChessStudyLesson();

  const studies = studiesData?.data ?? [];
  const chapters = studyDetail?.chapters ?? [];

  const handleSubmit = async () => {
    if (!chapterToEdit?.id || !title.trim() || !studyId) return;
    await createLesson({
      chapterId: chapterToEdit.id,
      title: title.trim(),
      description: description.trim() || null,
      studyId,
      studyChapterId: studyChapterId === "all" ? null : studyChapterId,
    });
    setContentTypeToDisplay(ContentTypes.EMPTY);
  };

  return (
    <div className="flex flex-col gap-4 bg-white p-8">
      <h3 className="h5 text-neutral-950">
        {t("adminCourseView.curriculum.lesson.other.chessStudy", {
          defaultValue: "Chess study lesson",
        })}
      </h3>
      <div className="space-y-1">
        <Label>
          {t("adminCourseView.curriculum.lesson.fieldTitle", { defaultValue: "Title" })}
        </Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>
          {t("adminCourseView.curriculum.lesson.fieldDescription", {
            defaultValue: "Description",
          })}
        </Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="space-y-1">
        <Label>
          {t("adminCourseView.curriculum.lesson.chessStudySelect", {
            defaultValue: "Study",
          })}
        </Label>
        <Select
          value={studyId}
          onValueChange={(value) => {
            setStudyId(value);
            setStudyChapterId("all");
          }}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t("adminCourseView.curriculum.lesson.chessStudySelectPlaceholder", {
                defaultValue: "Select a study you can access",
              })}
            />
          </SelectTrigger>
          <SelectContent>
            {studies.map((study) => (
              <SelectItem key={study.id} value={study.id}>
                {study.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {studyId ? (
        <div className="space-y-1">
          <Label>
            {t("adminCourseView.curriculum.lesson.chessStudyChapter", {
              defaultValue: "Chapter (optional)",
            })}
          </Label>
          <Select value={studyChapterId} onValueChange={setStudyChapterId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("adminCourseView.curriculum.lesson.chessStudyAllChapters", {
                  defaultValue: "All chapters",
                })}
              </SelectItem>
              {chapters.map((chapter) => (
                <SelectItem key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={isPending || !title.trim() || !studyId || !chapterToEdit?.id}
          onClick={() => void handleSubmit()}
        >
          {t("common.button.save", { defaultValue: "Save" })}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setContentTypeToDisplay(ContentTypes.EMPTY)}
        >
          {t("common.button.cancel", { defaultValue: "Cancel" })}
        </Button>
      </div>
    </div>
  );
}
