import { Link, useNavigate, useParams } from "@remix-run/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSubmitChessLearnAttempt } from "~/api/mutations/useSubmitChessLearnAttempt";
import { useChessLearnLevel } from "~/api/queries/useChessLearnLevel";
import { useChessLearnStages } from "~/api/queries/useChessLearnStages";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { ChessBoard } from "~/modules/Chess/board";
import { LearnStars } from "~/modules/Chess/Learn/LearnStars";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";
import type { BoardShape } from "~/modules/Chess/board/shapes";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessLearnLevel");

export default function ChessLearnLevelPage() {
  const { stageId, levelId } = useParams<{ stageId: string; levelId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!stageId || !levelId) {
    throw new Error(t("chessLearn.errors.notFound", { defaultValue: "Level not found" }));
  }

  const { data: level, isLoading } = useChessLearnLevel(stageId, levelId);
  const { data: stagesData } = useChessLearnStages();
  const { mutateAsync: submitAttempt, isPending } = useSubmitChessLearnAttempt();

  const [fen, setFen] = useState<string | null>(null);
  const [movesUci, setMovesUci] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [resultStars, setResultStars] = useState(0);
  const [resultScore, setResultScore] = useState(0);

  const stage = stagesData?.stages?.find((candidate) => candidate.id === stageId);
  const levelIndex = stage?.levels.findIndex((candidate) => candidate.id === levelId) ?? -1;
  const nextLevel = stage && levelIndex >= 0 ? stage.levels[levelIndex + 1] : undefined;

  const boardShapes: BoardShape[] = useMemo(() => {
    const fromShapes = (level?.shapes ?? []).map((shape) => {
      if (shape.kind === "arrow") {
        return {
          kind: "arrow" as const,
          from: shape.from as never,
          to: shape.to as never,
          color: shape.color ?? "green",
        };
      }
      return {
        kind: "circle" as const,
        square: shape.square as never,
        color: shape.color ?? "yellow",
      };
    });
    const visited = new Set(
      movesUci.map((uci) => uci.trim().toLowerCase().slice(2, 4)).filter(Boolean),
    );
    const targetShapes = (level?.targets ?? [])
      .filter((square) => !visited.has(square.toLowerCase()))
      .map((square) => ({
        kind: "circle" as const,
        square: square as never,
        color: "yellow" as const,
      }));
    return [...fromShapes, ...targetShapes];
  }, [level?.shapes, level?.targets, movesUci]);

  const resetBoard = () => {
    setFen(level?.fen ?? null);
    setMovesUci([]);
    setFeedback(null);
  };

  const grade = async (nextMoves: string[]) => {
    const result = await submitAttempt({ stageId, levelId, movesUci: nextMoves });
    setFeedback(result.correct ? "correct" : "incorrect");
    if (result.correct) {
      setResultStars(result.stars ?? result.bestStars ?? 0);
      setResultScore(result.score ?? result.bestScore ?? 0);
    } else {
      setFen(level?.fen ?? null);
      setMovesUci([]);
    }
  };

  const handleMove = (uci: string, fenAfter: string) => {
    if (feedback === "correct") return;

    const nextMoves = [...movesUci, uci];
    setMovesUci(nextMoves);
    setFen(fenAfter);

    const mode = level?.mode ?? "exact_line";
    const optimal = level?.optimalMoves ?? 1;

    // Free-play modes: auto-check when optimal move budget is reached or all targets visited.
    if (mode === "collect_targets") {
      const remaining = (level?.targets ?? []).filter((square) => {
        const visited = nextMoves.some(
          (uci) => uci.trim().toLowerCase().slice(2, 4) === square.toLowerCase(),
        );
        return !visited;
      });
      if (
        remaining.length === 0 ||
        nextMoves.length >= Math.max(optimal, (level?.targets ?? []).length + 2)
      ) {
        void grade(nextMoves);
      }
      return;
    }

    if (mode === "clear_side" || mode === "scripted" || mode === "predicate") {
      if (nextMoves.length >= optimal) {
        void grade(nextMoves);
      }
      return;
    }

    if (nextMoves.length >= optimal) {
      void grade(nextMoves);
    }
  };

  const breadcrumbs = [
    { title: t("chessLearn.nav.title", { defaultValue: "Learn chess" }), href: "/chess/learn" },
  ];

  if (isLoading || !level) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p className="body-base text-neutral-600">
          {t("common.loading", { defaultValue: "Loading…" })}
        </p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col items-center gap-4">
        {level.goal && (
          <p className="body-base-md max-w-lg text-center text-neutral-800">{level.goal}</p>
        )}

        {(level.bestStars ?? 0) > 0 && feedback !== "correct" && (
          <div className="flex items-center gap-2 text-neutral-600">
            <span className="body-sm">
              {t("chessLearn.level.best", { defaultValue: "Best so far" })}
            </span>
            <LearnStars stars={level.bestStars ?? 0} size="sm" />
          </div>
        )}

        <ChessBoard
          fen={fen ?? level.fen}
          interactive={feedback !== "correct"}
          onMove={handleMove}
          size={400}
          shapes={boardShapes}
          // Read-only hint shapes: no-op changer so overlay still renders without free drawing.
          onShapesChange={() => undefined}
        />

        {movesUci.length > 0 && feedback !== "correct" && (
          <p className="body-sm text-neutral-500">
            {t("chessLearn.level.movesPlayed", {
              defaultValue: "Moves: {{count}} / {{optimal}}",
              count: movesUci.length,
              optimal: level.optimalMoves ?? 1,
            })}
          </p>
        )}

        {feedback === "correct" ? (
          <div className="rounded-md border border-green-300 bg-green-50 p-3 text-center">
            <p className="body-base-md text-green-800">
              {t("chessLearn.level.correct", { defaultValue: "Chính xác! Làm tốt lắm." })}
            </p>
            <div className="mt-2 flex flex-col items-center gap-1">
              <LearnStars stars={resultStars} />
              <p className="body-sm text-green-800">
                {t("chessLearn.level.score", {
                  defaultValue: "Score: {{score}}",
                  score: resultScore,
                })}
              </p>
            </div>
            {nextLevel ? (
              <Button
                className="mt-2"
                onClick={() => navigate(`/chess/learn/${stageId}/${nextLevel.id}`)}
              >
                {t("chessLearn.level.next", { defaultValue: "Level tiếp theo" })}
              </Button>
            ) : (
              <Button className="mt-2" asChild>
                <Link to="/chess/learn">
                  {t("chessLearn.level.backToStages", { defaultValue: "Quay lại danh sách" })}
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {feedback === "incorrect" && (
              <p className="body-sm text-red-600">
                {t("chessLearn.level.incorrect", { defaultValue: "Chưa đúng, thử lại nhé." })}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="outline" onClick={() => setShowHint(true)}>
                {t("chessLearn.level.showHint", { defaultValue: "Xem gợi ý" })}
              </Button>
              {movesUci.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => void grade(movesUci)}
                  >
                    {t("chessLearn.level.check", { defaultValue: "Kiểm tra" })}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetBoard}>
                    {t("chessLearn.level.reset", { defaultValue: "Làm lại" })}
                  </Button>
                </>
              )}
            </div>
            {showHint && (
              <p className="body-sm max-w-md text-center text-neutral-600">{level.hint}</p>
            )}
          </div>
        )}

        {isPending && (
          <p className="body-sm text-neutral-500">
            {t("common.loading", { defaultValue: "Loading…" })}
          </p>
        )}
      </div>
    </PageWrapper>
  );
}
