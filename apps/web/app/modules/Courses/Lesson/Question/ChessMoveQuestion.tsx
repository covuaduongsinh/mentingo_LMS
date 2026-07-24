import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { ChessBoard } from "~/modules/Chess/board";
import { useQuizContext } from "~/modules/Courses/components/QuizContextProvider";
import { useCourseAccessProvider } from "~/modules/Courses/context/CourseAccessProvider";
import { QuestionCard } from "~/modules/Courses/Lesson/Question/QuestionCard";

import type { QuizQuestion } from "~/modules/Courses/Lesson/Question/types";
import type { QuizForm } from "~/modules/Courses/Lesson/types";

type ChessMoveQuestionProps = {
  question: QuizQuestion;
  isCompleted?: boolean;
  mode: "chess_find_best" | "chess_move_line";
};

function applyUciMoves(startFen: string, moves: string[]): string {
  try {
    const game = new Chess(startFen);
    for (const uci of moves) {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      game.move({ from, to, promotion });
    }
    return game.fen();
  } catch {
    return startFen;
  }
}

/**
 * Learner board question.
 * FEN is stored in question.description; student UCI line is submitted via chessResponses.
 * After submit, shows correct/incorrect feedback (unless quiz feedback is redacted).
 */
export function ChessMoveQuestion({ question, isCompleted = false, mode }: ChessMoveQuestionProps) {
  const { t } = useTranslation();
  const { isPreviewMode } = useCourseAccessProvider();
  const { isQuizFeedbackRedacted } = useQuizContext();
  const { setValue, watch } = useFormContext<QuizForm>();

  const fen = (question.description ?? "").trim() || new Chess().fen();
  const stored = watch(`chessResponses.${question.id}`) ?? "";
  const playedMoves = useMemo(
    () => (stored ? stored.trim().split(/\s+/).filter(Boolean) : []),
    [stored],
  );

  const [currentFen, setCurrentFen] = useState(() => applyUciMoves(fen, playedMoves));

  useEffect(() => {
    setCurrentFen(applyUciMoves(fen, playedMoves));
  }, [fen, playedMoves]);

  const orientation = useMemo(() => {
    try {
      return new Chess(fen).turn() === "b" ? "black" : "white";
    } catch {
      return "white";
    }
  }, [fen]);

  const maxMoves = mode === "chess_find_best" ? 1 : 20;
  const disabled = isCompleted || isPreviewMode || playedMoves.length >= maxMoves;

  const correctMoves = useMemo(() => {
    const fromOptions =
      question.options
        ?.filter((option) => option.isCorrect)
        .map((option) => option.optionText)
        .filter((text): text is string => Boolean(text?.trim()))
        .join(" ") ?? "";
    return fromOptions.trim().split(/\s+/).filter(Boolean);
  }, [question.options]);

  const studentMovesDisplay = playedMoves.join(" ") || "—";
  const correctMovesDisplay = correctMoves.join(" ") || "—";

  // passQuestion comes from API after evaluation
  const passQuestion =
    "passQuestion" in question
      ? (question as QuizQuestion & { passQuestion?: boolean | null }).passQuestion
      : null;

  const solutionExplanation =
    "solutionExplanation" in question
      ? (question as QuizQuestion & { solutionExplanation?: string | null }).solutionExplanation
      : null;

  const showFeedback = isCompleted && !isQuizFeedbackRedacted;
  const isCorrect = passQuestion === true;
  const isWrong = passQuestion === false;

  const handleMove = (uci: string, fenAfter: string) => {
    if (disabled) {
      return;
    }
    const next = [...playedMoves, uci];
    setValue(`chessResponses.${question.id}`, next.join(" "), {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    setCurrentFen(fenAfter);
  };

  const handleReset = () => {
    if (isCompleted || isPreviewMode) {
      return;
    }
    setValue(`chessResponses.${question.id}`, "", {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    setCurrentFen(fen);
  };

  return (
    <QuestionCard
      title={question.title}
      questionType={mode === "chess_find_best" ? "chessFindBest" : "chessMoveLine"}
      questionNumber={question.displayOrder}
    >
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-transparent p-1",
          showFeedback && isCorrect && "border-success-200 bg-success-50/40",
          showFeedback && isWrong && "border-error-200 bg-error-50/40",
          disabled && "pointer-events-none opacity-95",
        )}
      >
        <ChessBoard
          fen={currentFen}
          interactive={!disabled}
          orientation={orientation}
          onMove={handleMove}
        />
        <div className="flex flex-wrap items-center gap-2">
          <p className="body-sm text-neutral-700">
            {t("chess.quiz.movesPlayed", { defaultValue: "Moves" })}:{" "}
            <span className="font-mono">{studentMovesDisplay}</span>
          </p>
          {!isCompleted ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isPreviewMode || playedMoves.length === 0}
            >
              {t("chess.quiz.reset", { defaultValue: "Reset board" })}
            </Button>
          ) : null}
        </div>

        {showFeedback ? (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              isCorrect && "border-success-300 bg-success-50 text-success-900",
              isWrong && "border-error-300 bg-error-50 text-error-900",
              !isCorrect && !isWrong && "border-neutral-200 bg-neutral-50 text-neutral-800",
            )}
            role="status"
          >
            <p className="font-medium">
              {isCorrect
                ? t("chess.practice.correct", { defaultValue: "Correct!" })
                : isWrong
                  ? t("chess.practice.incorrect", { defaultValue: "Not quite." })
                  : t("chess.quiz.reviewed", { defaultValue: "Answer submitted." })}
            </p>
            <p className="mt-1 font-mono text-xs">
              {t("chess.quiz.yourMove", { defaultValue: "Your move" })}: {studentMovesDisplay}
            </p>
            {(isWrong || isCorrect) && correctMoves.length > 0 ? (
              <p className="mt-1 font-mono text-xs">
                {t("chess.quiz.correctMove", { defaultValue: "Correct move" })}:{" "}
                {correctMovesDisplay}
              </p>
            ) : null}
            {solutionExplanation ? (
              <p className="body-sm mt-2 whitespace-pre-wrap text-neutral-800">
                {solutionExplanation}
              </p>
            ) : null}
          </div>
        ) : null}

        {isCompleted && isQuizFeedbackRedacted ? (
          <p className="body-sm text-neutral-600">
            {t("chess.quiz.feedbackHidden", {
              defaultValue: "Detailed answer feedback is hidden for this course.",
            })}
          </p>
        ) : null}
      </div>
    </QuestionCard>
  );
}
