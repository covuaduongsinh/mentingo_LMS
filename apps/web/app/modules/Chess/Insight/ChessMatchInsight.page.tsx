import { useParams } from "@remix-run/react";
import { CHESS_MOVE_QUALITY_LABELS, PERMISSIONS, type ChessMoveQuality } from "@repo/shared";
import { useTranslation } from "react-i18next";

import { useRequestChessMatchInsightAnalysis } from "~/api/mutations/useRequestChessMatchInsightAnalysis";
import { useChessMatchInsightReport } from "~/api/queries/useChessMatchInsightReport";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { usePermissions } from "~/hooks/usePermissions";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessMatchInsight");

function moveQualityVariant(quality: ChessMoveQuality): "default" | "destructive" | "outline" {
  if (quality === "blunder" || quality === "mistake") return "destructive";
  if (quality === "best" || quality === "good") return "default";
  return "outline";
}

export default function ChessMatchInsightPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { hasAccess: canReanalyze } = usePermissions({
    required: PERMISSIONS.CHESS_INSIGHT_READ_ALL,
  });
  const { data, isLoading } = useChessMatchInsightReport(id);
  const reanalyze = useRequestChessMatchInsightAnalysis();

  const breadcrumbs = [
    { title: t("chess.match.title", { defaultValue: "Match" }), href: `/chess/matches/${id}` },
    {
      title: t("chess.insight.matchReportTitle", { defaultValue: "Game analysis" }),
      href: `/chess/matches/${id}/insight`,
    },
  ];

  if (isLoading || !data) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p>{t("common.loading", { defaultValue: "Loading…" })}</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="h4 text-neutral-950">
            {t("chess.insight.matchReportTitle", { defaultValue: "Game analysis" })}
          </h1>
          {canReanalyze ? (
            <Button
              type="button"
              variant="outline"
              disabled={reanalyze.isPending}
              onClick={() => id && reanalyze.mutate(id)}
            >
              {t("chess.insight.reanalyze", { defaultValue: "Re-analyze" })}
            </Button>
          ) : null}
        </div>

        {data.moves.length === 0 ? (
          <p className="body-base text-neutral-600">
            {t("chess.insight.notAnalyzedYet", {
              defaultValue: "This game hasn't been analyzed yet — check back shortly.",
            })}
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <p className="text-sm text-neutral-500">
                  {t("chess.match.white", { defaultValue: "White" })}
                </p>
                <p className="h3">
                  {data.white.avgAccuracy !== null ? `${Math.round(data.white.avgAccuracy)}%` : "—"}
                </p>
                <p className="text-xs text-neutral-500">
                  {t("chess.insight.blundersMistakes", {
                    defaultValue: "{{blunders}} blunders, {{mistakes}} mistakes",
                    blunders: data.white.blunders,
                    mistakes: data.white.mistakes,
                  })}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <p className="text-sm text-neutral-500">
                  {t("chess.match.black", { defaultValue: "Black" })}
                </p>
                <p className="h3">
                  {data.black.avgAccuracy !== null ? `${Math.round(data.black.avgAccuracy)}%` : "—"}
                </p>
                <p className="text-xs text-neutral-500">
                  {t("chess.insight.blundersMistakes", {
                    defaultValue: "{{blunders}} blunders, {{mistakes}} mistakes",
                    blunders: data.black.blunders,
                    mistakes: data.black.mistakes,
                  })}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-neutral-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="p-2">{t("chess.insight.move", { defaultValue: "Move" })}</th>
                    <th className="p-2">{t("chess.insight.side", { defaultValue: "Side" })}</th>
                    <th className="p-2">
                      {t("chess.insight.quality", { defaultValue: "Quality" })}
                    </th>
                    <th className="p-2">
                      {t("chess.insight.centipawnLoss", { defaultValue: "Loss (cp)" })}
                    </th>
                    <th className="p-2">
                      {t("chess.insight.accuracy", { defaultValue: "Accuracy" })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.moves.map((move) => (
                    <tr key={move.id} className="border-t border-neutral-100">
                      <td className="p-2">{Math.floor(move.ply / 2) + 1}</td>
                      <td className="p-2">
                        {move.ply % 2 === 0
                          ? t("chess.match.white", { defaultValue: "White" })
                          : t("chess.match.black", { defaultValue: "Black" })}
                      </td>
                      <td className="p-2">
                        <Badge variant={moveQualityVariant(move.moveQuality)}>
                          {CHESS_MOVE_QUALITY_LABELS[move.moveQuality]}
                        </Badge>
                      </td>
                      <td className="p-2">{move.centipawnLoss}</td>
                      <td className="p-2">{Math.round(move.accuracy)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
