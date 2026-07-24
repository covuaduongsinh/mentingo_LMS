import { Chess } from "chess.js";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useChessEngineAnalyze } from "~/api/mutations/useChessEngineAnalyze";
import { useChessEngineStatus } from "~/api/queries/useChessEngineStatus";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { ChessBoard } from "~/modules/Chess/board";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";
import type { ChessEngineAnalyzeResult } from "~/api/chess-api";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessAnalysis");

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function ChessAnalysisPage() {
  const { t } = useTranslation();
  const { data: engineStatus } = useChessEngineStatus();
  const { mutateAsync: analyze, isPending } = useChessEngineAnalyze();

  const [fenInput, setFenInput] = useState(START_FEN);
  const [fen, setFen] = useState(START_FEN);
  const [moveList, setMoveList] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<ChessEngineAnalyzeResult | null>(null);

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
      setFen(g.fen());
      setMoveList([]);
      setAnalysis(null);
    } catch {
      // keep previous
    }
  };

  const handleMove = (uci: string, fenAfter: string) => {
    setFen(fenAfter);
    setMoveList((prev) => [...prev, uci]);
    setAnalysis(null);
  };

  const runAnalyze = async () => {
    const result = await analyze({
      fen,
      depth: 8,
    });
    setAnalysis(result);
  };

  const reset = () => {
    setFen(START_FEN);
    setFenInput(START_FEN);
    setMoveList([]);
    setAnalysis(null);
  };

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
            <ChessBoard fen={fen} interactive onMove={handleMove} size={400} />
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
            {engineStatus ? (
              <Badge variant="outline">
                {engineStatus.defaultEngine === "arasan" ? "Arasan" : "Builtin"}
              </Badge>
            ) : null}
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
            <Button type="button" variant="outline" size="sm" onClick={loadFen}>
              {t("chess.analysis.loadFen", { defaultValue: "Load FEN" })}
            </Button>
          </div>

          <div className="space-y-1">
            <Label>{t("chess.analysis.moves", { defaultValue: "Moves (UCI)" })}</Label>
            <Input className="font-mono text-xs" readOnly value={moveList.join(" ")} />
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
