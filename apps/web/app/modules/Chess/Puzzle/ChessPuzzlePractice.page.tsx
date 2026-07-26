import {
  CHESS_MOTIF_LABELS,
  CHESS_MOTIF_LIST,
  type ChessMotif,
  type ChessPuzzleDifficulty,
} from "@repo/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSubmitChessPuzzleAttempt } from "~/api/mutations/useSubmitChessPuzzleAttempt";
import { useChessPuzzleDaily } from "~/api/queries/useChessPuzzleDaily";
import { useChessPuzzleMistakes } from "~/api/queries/useChessPuzzleMistakes";
import { useChessPuzzleNext } from "~/api/queries/useChessPuzzleNext";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ChessBoard } from "~/modules/Chess/board";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.chessPuzzlePractice");

type PuzzleSource = "adaptive" | "daily" | "mistakes";

export default function ChessPuzzlePracticePage() {
  const { t } = useTranslation();
  const [source, setSource] = useState<PuzzleSource>("adaptive");
  const [difficulty, setDifficulty] = useState<ChessPuzzleDifficulty>("NORMAL");
  const [motif, setMotif] = useState<ChessMotif | "all">("all");
  const [mistakeIndex, setMistakeIndex] = useState(0);
  const [moves, setMoves] = useState<string[]>([]);
  const [fen, setFen] = useState<string | undefined>();
  const [result, setResult] = useState<{ correct: boolean; solutionUci: string[] } | null>(null);

  const nextPuzzle = useChessPuzzleNext(
    { difficulty, motif: motif === "all" ? undefined : motif },
    { enabled: source === "adaptive" },
  );
  const dailyPuzzle = useChessPuzzleDaily();
  const mistakes = useChessPuzzleMistakes();
  const { mutateAsync: submitAttempt, isPending: isSubmitting } = useSubmitChessPuzzleAttempt();

  const puzzle =
    source === "daily"
      ? dailyPuzzle.data
      : source === "mistakes"
        ? (mistakes.data?.[mistakeIndex] ?? null)
        : nextPuzzle.data;

  useEffect(() => {
    setFen(puzzle?.fen);
    setMoves([]);
    setResult(null);
  }, [puzzle?.id, puzzle?.fen]);

  const handleMove = (uci: string, fenAfter: string) => {
    if (result) return;
    setMoves((prev) => [...prev, uci]);
    setFen(fenAfter);
  };

  const handleSubmit = async () => {
    if (!puzzle || moves.length === 0) return;
    const response = await submitAttempt({ id: puzzle.id, data: { movesUci: moves } });
    setResult({ correct: response.correct, solutionUci: response.solutionUci });
  };

  const handleNext = () => {
    if (source === "adaptive") void nextPuzzle.refetch();
    else if (source === "daily") void dailyPuzzle.refetch();
    else setMistakeIndex((i) => i + 1);
  };

  const breadcrumbs = [
    { title: t("chess.nav.puzzles", { defaultValue: "Puzzles" }), href: "/chess/puzzles" },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="h4 text-neutral-950">
            {t("chess.puzzle.title", { defaultValue: "Puzzle training" })}
          </h1>
          <p className="body-base text-neutral-600">
            {t("chess.puzzle.subtitle", {
              defaultValue: "Solve puzzles matched to your rating — it adapts as you improve.",
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={source === "adaptive" ? "default" : "outline"}
            onClick={() => setSource("adaptive")}
          >
            {t("chess.puzzle.adaptive", { defaultValue: "Adaptive" })}
          </Button>
          <Button
            size="sm"
            variant={source === "daily" ? "default" : "outline"}
            onClick={() => setSource("daily")}
          >
            {t("chess.puzzle.daily", { defaultValue: "Daily puzzle" })}
          </Button>
          <Button
            size="sm"
            variant={source === "mistakes" ? "default" : "outline"}
            onClick={() => {
              setSource("mistakes");
              setMistakeIndex(0);
            }}
          >
            {t("chess.puzzle.mistakes", { defaultValue: "Replay mistakes" })}
          </Button>

          {source === "adaptive" ? (
            <>
              <Select
                value={difficulty}
                onValueChange={(value) => setDifficulty(value as ChessPuzzleDifficulty)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASIER">
                    {t("chess.puzzle.easier", { defaultValue: "Easier" })}
                  </SelectItem>
                  <SelectItem value="NORMAL">
                    {t("chess.puzzle.normal", { defaultValue: "Normal" })}
                  </SelectItem>
                  <SelectItem value="HARDER">
                    {t("chess.puzzle.harder", { defaultValue: "Harder" })}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={motif}
                onValueChange={(value) => setMotif(value as ChessMotif | "all")}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("chess.puzzle.allMotifs", { defaultValue: "All themes" })}
                  </SelectItem>
                  {CHESS_MOTIF_LIST.map((motifOption) => (
                    <SelectItem key={motifOption} value={motifOption}>
                      {CHESS_MOTIF_LABELS[motifOption]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : null}
        </div>

        {!puzzle ? (
          <p className="text-neutral-600">
            {source === "mistakes" && (mistakes.data?.length ?? 0) === 0
              ? t("chess.puzzle.noMistakes", { defaultValue: "No mistakes to replay — nice work." })
              : t("chess.puzzle.empty", { defaultValue: "No puzzles available yet." })}
          </p>
        ) : (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <ChessBoard
              fen={fen ?? puzzle.fen}
              interactive={!result}
              onMove={handleMove}
              size={400}
            />
            <div className="w-full max-w-sm space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap gap-1">
                {puzzle.motifs.map((motifTag) => (
                  <Badge key={motifTag} variant="secondary">
                    {CHESS_MOTIF_LABELS[motifTag] ?? motifTag}
                  </Badge>
                ))}
                <Badge variant="outline">~{Math.round(puzzle.rating)}</Badge>
              </div>

              {result ? (
                <div
                  className={`rounded-md border p-3 text-sm ${
                    result.correct
                      ? "border-green-300 bg-green-50 text-green-800"
                      : "border-red-300 bg-red-50 text-red-800"
                  }`}
                >
                  <p className="font-medium">
                    {result.correct
                      ? t("chess.puzzle.correct", { defaultValue: "Correct!" })
                      : t("chess.puzzle.incorrect", { defaultValue: "Not quite." })}
                  </p>
                  <p className="mt-1 font-mono text-xs">{result.solutionUci.join(" ")}</p>
                </div>
              ) : null}

              <div className="flex gap-2">
                {!result ? (
                  <Button
                    onClick={() => void handleSubmit()}
                    disabled={moves.length === 0 || isSubmitting}
                  >
                    {t("chess.puzzle.submit", { defaultValue: "Submit" })}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    {t("chess.puzzle.next", { defaultValue: "Next puzzle" })}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
