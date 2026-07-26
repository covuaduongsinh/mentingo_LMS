import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSubmitPracticeAttempt } from "~/api/mutations/useSubmitPracticeAttempt";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ChessBoard } from "~/modules/Chess/board";

import type { GetStudyResponse } from "~/api/generated-api";

type ChapterData = GetStudyResponse["data"]["chapters"][number];

type ChessStudyPracticeAttemptProps = {
  studyId: string;
  chapter: ChapterData;
};

export function ChessStudyPracticeAttempt({ studyId, chapter }: ChessStudyPracticeAttemptProps) {
  const { t } = useTranslation();
  const [fen, setFen] = useState(chapter.rootFen);
  const [movesUci, setMovesUci] = useState<string[]>([]);
  const [result, setResult] = useState<{
    achievedGoal: boolean;
    movesUsed: number;
    bestMovesUsed: number | null;
  } | null>(null);

  const { mutateAsync: submitAttempt, isPending } = useSubmitPracticeAttempt();

  const handleMove = (uci: string, fenAfter: string) => {
    setFen(fenAfter);
    setMovesUci((prev) => [...prev, uci]);
    setResult(null);
  };

  const handleReset = () => {
    setFen(chapter.rootFen);
    setMovesUci([]);
    setResult(null);
  };

  const handleSubmit = () => {
    submitAttempt({ studyId, chapterId: chapter.id, movesUci }).then(setResult);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {chapter.practiceGoal && (
        <p className="body-base-md">
          {t("chess.study.practiceGoalLabel", {
            defaultValue: "Mục tiêu: {{goal}}",
            goal: chapter.practiceGoal,
          })}
        </p>
      )}
      <ChessBoard fen={fen} interactive onMove={handleMove} size={400} />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={movesUci.length === 0}
        >
          {t("chess.study.practiceReset", { defaultValue: "Chơi lại" })}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isPending || movesUci.length === 0}>
          {t("chess.study.practiceSubmit", { defaultValue: "Nộp bài" })}
        </Button>
      </div>

      {result && (
        <div className="flex flex-col items-center gap-1">
          <Badge variant={result.achievedGoal ? "default" : "outline"}>
            {result.achievedGoal
              ? t("chess.study.practiceAchieved", { defaultValue: "Đạt mục tiêu!" })
              : t("chess.study.practiceNotAchieved", { defaultValue: "Chưa đạt mục tiêu" })}
          </Badge>
          <p className="body-sm text-neutral-600">
            {t("chess.study.practiceMovesUsed", {
              defaultValue: "Số nước đã dùng: {{used}}",
              used: result.movesUsed,
            })}
            {result.bestMovesUsed !== null &&
              ` — ${t("chess.study.practiceBest", {
                defaultValue: "Tốt nhất: {{best}}",
                best: result.bestMovesUsed,
              })}`}
          </p>
        </div>
      )}
    </div>
  );
}
