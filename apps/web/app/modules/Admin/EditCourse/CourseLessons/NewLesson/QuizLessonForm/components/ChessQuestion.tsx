import { useTranslation } from "react-i18next";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { FenBoard } from "~/modules/Chess/board";

import type { QuizLessonFormValues } from "../validators/quizLessonFormSchema";
import type { UseFormReturn } from "react-hook-form";

type ChessQuestionProps = {
  questionIndex: number;
  form: UseFormReturn<QuizLessonFormValues>;
  isStructureLocked?: boolean;
};

/**
 * Authoring fields for chess board questions.
 * description = FEN; options[0].optionText = solution UCI (space-separated); options[0].isCorrect = true
 */
export function ChessQuestion({
  questionIndex,
  form,
  isStructureLocked = false,
}: ChessQuestionProps) {
  const { t } = useTranslation();
  const fen = form.watch(`questions.${questionIndex}.description`) ?? "";
  const solution = form.watch(`questions.${questionIndex}.options.0.optionText`) ?? "";

  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="space-y-2">
        <Label>{t("chess.author.fen", { defaultValue: "FEN position" })}</Label>
        <Input
          disabled={isStructureLocked}
          value={fen}
          onChange={(event) => {
            form.setValue(`questions.${questionIndex}.description`, event.target.value, {
              shouldDirty: true,
            });
          }}
          placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          className="font-mono text-sm"
        />
      </div>

      {fen.trim() ? (
        <div className="max-w-md">
          <FenBoard fen={fen.trim()} size={280} />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>
          {t("chess.author.solutionUci", {
            defaultValue: "Solution moves (UCI, space-separated)",
          })}
        </Label>
        <Input
          disabled={isStructureLocked}
          value={solution}
          onChange={(event) => {
            const value = event.target.value;
            const options = form.getValues(`questions.${questionIndex}.options`) ?? [];
            if (options.length === 0) {
              form.setValue(
                `questions.${questionIndex}.options`,
                [
                  {
                    sortableId: crypto.randomUUID(),
                    optionText: value,
                    isCorrect: true,
                    displayOrder: 1,
                  },
                ],
                { shouldDirty: true },
              );
            } else {
              form.setValue(`questions.${questionIndex}.options.0.optionText`, value, {
                shouldDirty: true,
              });
              form.setValue(`questions.${questionIndex}.options.0.isCorrect`, true, {
                shouldDirty: true,
              });
            }
          }}
          placeholder="e2e4 e7e5"
          className="font-mono text-sm"
        />
        <p className="text-xs text-neutral-500">
          {t("chess.author.solutionHint", {
            defaultValue: "Example: e2e4 for one best move, or e2e4 e7e5 g1f3 for a full line.",
          })}
        </p>
      </div>
    </div>
  );
}
