import { useNavigate, useSearchParams } from "@remix-run/react";
import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useChessEngineAnalyze } from "~/api/mutations/useChessEngineAnalyze";
import { useCreateChessAnalysisSession } from "~/api/mutations/useCreateChessAnalysisSession";
import { useChessEngineStatus } from "~/api/queries/useChessEngineStatus";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { ChessBoard, MoveTreeView, movetextFromTree, useMoveTree } from "~/modules/Chess/board";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";
import type { AnalyzeResponse } from "~/api/generated-api";
import type { BoardShape } from "~/modules/Chess/board";
import type { BoardOrientation } from "~/modules/Chess/board/squareGeometry";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessAnalysis");

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function ChessAnalysisPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: engineStatus } = useChessEngineStatus();
  const { mutateAsync: analyze, isPending } = useChessEngineAnalyze();
  const { mutateAsync: createRoom, isPending: isCreatingRoom } = useCreateChessAnalysisSession();

  const initialFen = useMemo(() => {
    const fromQuery = searchParams.get("fen");
    if (!fromQuery) return START_FEN;
    try {
      return new Chess(fromQuery).fen();
    } catch {
      return START_FEN;
    }
    // Only read the query param once, on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveTree = useMoveTree(initialFen);
  const [fenInput, setFenInput] = useState(initialFen);
  const [shapes, setShapes] = useState<BoardShape[]>([]);
  const [orientation, setOrientation] = useState<BoardOrientation>("white");
  const [analysis, setAnalysis] = useState<AnalyzeResponse["data"] | null>(null);
  const [isFenCopied, setIsFenCopied] = useState(false);
  const [isPgnCopied, setIsPgnCopied] = useState(false);

  useEffect(() => {
    setFenInput(moveTree.fen);
  }, [moveTree.fen]);

  const evalPercent = useMemo(() => {
    if (!analysis) return 50;
    if (analysis.mate != null) {
      return analysis.mate > 0 ? 95 : 5;
    }
    if (analysis.scoreCp == null) return 50;
    // Map cp roughly to 5–95%
    const clamped = Math.max(-800, Math.min(800, analysis.scoreCp));
    return 50 + (clamped / 800) * 45;
  }, [analysis]);

  const loadFen = () => {
    try {
      const g = new Chess(fenInput.trim());
      moveTree.reset(g.fen());
      setShapes([]);
      setAnalysis(null);
    } catch {
      // keep previous
    }
  };

  const handleMove = (uci: string, fenAfter: string, san: string) => {
    moveTree.playMove({ uci, san, fenAfter });
    setAnalysis(null);
  };

  const runAnalyze = async () => {
    const result = await analyze({
      fen: moveTree.fen,
      depth: 8,
    });
    setAnalysis(result);
  };

  const reset = () => {
    moveTree.reset(START_FEN);
    setFenInput(START_FEN);
    setShapes([]);
    setAnalysis(null);
  };

  const handleCreateRoom = async () => {
    const room = await createRoom({ fen: moveTree.fen });
    navigate(`/chess/analysis-room/${room.id}`);
  };

  const copyToClipboard = async (text: string, onDone: (copied: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      onDone(true);
      setTimeout(() => onDone(false), 2000);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveTree.goToPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveTree.goToNext();
      } else if (event.key === "Home") {
        event.preventDefault();
        moveTree.goToStart();
      } else if (event.key === "End") {
        event.preventDefault();
        moveTree.goToEnd();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveTree]);

  const breadcrumbs = [
    {
      title: t("chess.nav.analysis", { defaultValue: "Analysis" }),
      href: "/chess/analysis",
    },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="space-y-3">
          <div>
            <h1 className="h4">{t("chess.analysis.title", { defaultValue: "Analysis board" })}</h1>
            <p className="body-base text-neutral-600">
              {t("chess.analysis.subtitle", {
                defaultValue: "Analyze positions with Arasan (MIT) or the built-in engine.",
              })}
            </p>
          </div>

          <div className="flex items-stretch gap-3">
            <div className="flex w-6 flex-col justify-between rounded bg-neutral-100">
              <div
                className="w-full rounded-t bg-neutral-800 transition-all"
                style={{ height: `${100 - evalPercent}%` }}
              />
              <div
                className="w-full rounded-b bg-white transition-all"
                style={{ height: `${evalPercent}%` }}
              />
            </div>
            <ChessBoard
              fen={moveTree.fen}
              interactive
              onMove={handleMove}
              size={400}
              orientation={orientation}
              shapes={shapes}
              onShapesChange={setShapes}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runAnalyze} disabled={isPending}>
              {isPending
                ? t("chess.analysis.analyzing", { defaultValue: "Analyzing…" })
                : t("chess.analysis.analyze", { defaultValue: "Analyze" })}
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              {t("chess.analysis.reset", { defaultValue: "Reset" })}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
            >
              {t("chess.analysis.flipBoard", { defaultValue: "Flip board" })}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isCreatingRoom}
              onClick={() => void handleCreateRoom()}
            >
              {t("chess.analysis.createRoom", { defaultValue: "Start collaborative room" })}
            </Button>
            {engineStatus ? (
              <Badge variant="outline">
                {engineStatus.defaultEngine === "arasan" ? "Arasan" : "Builtin"}
              </Badge>
            ) : null}
          </div>

          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <MoveTreeView
              tree={moveTree.tree}
              currentPath={moveTree.path}
              onNavigate={moveTree.goToPath}
              onPromote={moveTree.promote}
              onDelete={moveTree.remove}
              onSetGlyph={moveTree.annotateGlyph}
            />
          </div>
        </div>

        <div className="w-full max-w-md space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="space-y-2">
            <Label>FEN</Label>
            <Textarea
              className="font-mono text-xs"
              value={fenInput}
              onChange={(e) => setFenInput(e.target.value)}
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={loadFen}>
                {t("chess.analysis.loadFen", { defaultValue: "Load FEN" })}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyToClipboard(moveTree.fen, setIsFenCopied)}
              >
                {isFenCopied
                  ? t("chess.editor.copied", { defaultValue: "Copied!" })
                  : t("chess.editor.copyFen", { defaultValue: "Copy FEN" })}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  void copyToClipboard(movetextFromTree(moveTree.tree), setIsPgnCopied)
                }
              >
                {isPgnCopied
                  ? t("chess.editor.copied", { defaultValue: "Copied!" })
                  : t("chess.analysis.copyPgn", { defaultValue: "Copy PGN" })}
              </Button>
            </div>
          </div>

          {analysis ? (
            <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm">
              <p>
                <span className="font-medium">
                  {t("chess.analysis.bestMove", { defaultValue: "Best move" })}:
                </span>{" "}
                <span className="font-mono">{analysis.bestMoveUci ?? "—"}</span>
              </p>
              <p>
                <span className="font-medium">
                  {t("chess.analysis.eval", { defaultValue: "Eval" })}:
                </span>{" "}
                {analysis.mate != null
                  ? `M${analysis.mate}`
                  : analysis.scoreCp != null
                    ? `${(analysis.scoreCp / 100).toFixed(2)}`
                    : "—"}
              </p>
              <p>
                <span className="font-medium">PV:</span>{" "}
                <span className="font-mono text-xs">{analysis.pv.join(" ") || "—"}</span>
              </p>
              <p className="text-xs text-neutral-500">
                {analysis.engine} · depth {analysis.depth}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </PageWrapper>
  );
}
