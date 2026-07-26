import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useGenerateQuizQuestions } from "~/api/mutations/admin/useGenerateQuizQuestions";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import type { SupportedLanguages } from "@repo/shared";
import type { GenerateQuizQuestionsResponse } from "~/api/generated-api";

type AiGeneratedQuizQuestion = GenerateQuizQuestionsResponse["data"][number];

type SourceLessonOption = {
  id: string;
  title: string;
};

type AiQuizGenerationDialogProps = {
  open: boolean;
  onClose: () => void;
  sourceLessonOptions: SourceLessonOption[];
  language: SupportedLanguages;
  onGenerated: (questions: AiGeneratedQuizQuestion[]) => void;
};

const MIN_QUESTION_COUNT = 1;
const MAX_QUESTION_COUNT = 10;
const DEFAULT_QUESTION_COUNT = 5;

export function AiQuizGenerationDialog({
  open,
  onClose,
  sourceLessonOptions,
  language,
  onGenerated,
}: AiQuizGenerationDialogProps) {
  const { t } = useTranslation();
  const [sourceLessonId, setSourceLessonId] = useState<string | undefined>(undefined);
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);
  const { mutate: generateQuestions, isPending } = useGenerateQuizQuestions();

  const handleGenerate = () => {
    if (!sourceLessonId) return;

    generateQuestions(
      { data: { sourceLessonId, language, questionCount } },
      {
        onSuccess: (questions) => {
          onGenerated(questions ?? []);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogOverlay className="bg-primary-400 opacity-65" />
      <DialogContent className="max-w-md p-8">
        <DialogTitle className="text-xl font-semibold text-neutral-900">
          {t("aiQuizGeneration.dialog.title")}
        </DialogTitle>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("aiQuizGeneration.dialog.sourceLesson")}</Label>
            <Select value={sourceLessonId} onValueChange={setSourceLessonId}>
              <SelectTrigger>
                <SelectValue placeholder={t("aiQuizGeneration.dialog.sourceLessonPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {sourceLessonOptions.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("aiQuizGeneration.dialog.questionCount")}</Label>
            <Input
              type="number"
              min={MIN_QUESTION_COUNT}
              max={MAX_QUESTION_COUNT}
              value={questionCount}
              onChange={(event) =>
                setQuestionCount(
                  Math.min(
                    MAX_QUESTION_COUNT,
                    Math.max(MIN_QUESTION_COUNT, Number(event.target.value) || 1),
                  ),
                )
              }
            />
          </div>

          <Button type="button" disabled={!sourceLessonId || isPending} onClick={handleGenerate}>
            {isPending
              ? t("aiQuizGeneration.dialog.generating")
              : t("aiQuizGeneration.dialog.generate")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
