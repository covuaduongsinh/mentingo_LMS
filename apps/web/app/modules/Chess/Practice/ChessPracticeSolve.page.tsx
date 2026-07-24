import { Link, useParams } from "@remix-run/react";
import { CHESS_TOPIC_LABELS } from "@repo/shared";
import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSubmitChessExerciseAttempt } from "~/api/mutations/useSubmitChessExerciseAttempt";
import { useChessExercise } from "~/api/queries/useChessExercise";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ChessBoard } from "~/modules/Chess/board";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessPractice");

export default function ChessPracticeSolvePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data: exercise, isLoading } = useChessExercise(id);
  const { mutateAsync: submitAttempt, isPending } = useSubmitChessExerciseAttempt();

  const startFen =
    exercise?.fen?.trim() || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const [currentFen, setCurrentFen] = useState(startFen);
  const [moves, setMoves] = useState<string[]>([]);
  const [result, setResult] = useState<{ isCorrect: boolean; explanation: string | null } | null>(
    null,
  );
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!exercise) return;
    const fen = exercise.fen?.trim() || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    setCurrentFen(fen);
    setMoves([]);
    setResult(null);
  }, [exercise]);

  const orientation = useMemo(() => {
    try {
      return new Chess(startFen).turn() === "b" ? "black" : "white";
    } catch {
      return "white";
    }
  }, [startFen]);

  const maxMoves = exercise?.format === "chess_find_best" ? 1 : 20;
  const isBoardFormat =
    exercise?.format === "chess_find_best" || exercise?.format === "chess_move_line";

  const breadcrumbs = [
    {
      title: t("chess.nav.practice", { defaultValue: "Chess practice" }),
      href: "/chess/practice",
    },
    {
      title: exercise?.title ?? t("chess.practice.solve", { defaultValue: "Solve" }),
      href: id ? `/chess/practice/${id}` : "/chess/practice",
    },
  ];

  const handleMove = (uci: string, fenAfter: string) => {
    if (result || moves.length >= maxMoves) return;
    setMoves((prev) => [...prev, uci]);
    setCurrentFen(fenAfter);
  };

  const handleReset = () => {
    setCurrentFen(startFen);
    setMoves([]);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!id) return;
    const response = await submitAttempt({
      id,
      movesUci: moves,
      timeMs: Date.now() - startedAt,
    });
    setResult(response);
  };

  if (isLoading) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p>{t("common.loading", { defaultValue: "Loading…" })}</p>
      </PageWrapper>
    );
  }

  if (!exercise) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p>{t("chess.practice.notFound", { defaultValue: "Exercise not found." })}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/chess/practice">{t("common.button.back", { defaultValue: "Back" })}</Link>
        </Button>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-3">
          <h1 className="h4 text-neutral-950">{exercise.title}</h1>
          <div className="flex flex-wrap gap-1">
            {exercise.topics.map((topic) => (
              <Badge key={topic} variant="secondary">
                {CHESS_TOPIC_LABELS[topic] ?? topic}
              </Badge>
            ))}
          </div>
          {isBoardFormat ? (
            <>
              <ChessBoard
                fen={currentFen}
                interactive={!result && moves.length < maxMoves}
                orientation={orientation}
                onMove={handleMove}
              />
              <p className="font-mono text-sm text-neutral-700">
                {t("chess.quiz.movesPlayed", { defaultValue: "Moves" })}: {moves.join(" ") || "—"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={handleReset}>
                  {t("chess.quiz.reset", { defaultValue: "Reset board" })}
                </Button>
                <Button
                  type="button"
                  data-testid="chess-practice-submit-button"
                  onClick={handleSubmit}
                  disabled={isPending || moves.length === 0 || Boolean(result)}
                >
                  {t("chess.practice.submit", { defaultValue: "Check answer" })}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-neutral-600">
              {t("chess.practice.nonBoardHint", {
                defaultValue:
                  "This knowledge item is best practiced inside a course quiz. Board formats: find best / move line.",
              })}
            </p>
          )}
          {result ? (
            <div
              data-testid={
                result.isCorrect
                  ? "chess-practice-feedback-correct"
                  : "chess-practice-feedback-incorrect"
              }
              className={
                result.isCorrect
                  ? "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"
                  : "rounded-md border border-red-200 bg-red-50 p-3 text-red-900"
              }
            >
              <p className="font-medium">
                {result.isCorrect
                  ? t("chess.practice.correct", { defaultValue: "Correct!" })
                  : t("chess.practice.incorrect", { defaultValue: "Not quite." })}
              </p>
              {result.explanation ? <p className="mt-1 text-sm">{result.explanation}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </PageWrapper>
  );
}
