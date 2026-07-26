import {
  CHESS_GAME_PHASE_LABELS,
  CHESS_OPENING_LABELS,
  CHESS_PIECE_TYPE_LABELS,
} from "@repo/shared";
import { useTranslation } from "react-i18next";

import { useChessInsightReport } from "~/api/queries/useChessInsightReport";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";
import type { ChessGamePhase, ChessPieceType } from "@repo/shared";

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.chessInsightDashboard");

function StatTable({
  rows,
  labelFor,
}: {
  rows: { key: string; label: string; moveCount: number; avgAccuracy: number }[];
  labelFor: (key: string) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-md border border-neutral-100">
      <table className="w-full text-left text-sm">
        <tbody>
          {rows
            .slice()
            .sort((a, b) => b.moveCount - a.moveCount)
            .map((row) => (
              <tr key={row.key} className="border-t border-neutral-100 first:border-t-0">
                <td className="p-2">{labelFor(row.key)}</td>
                <td className="p-2 text-neutral-500">{row.moveCount}</td>
                <td className="p-2 font-medium">{Math.round(row.avgAccuracy)}%</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ChessInsightDashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useChessInsightReport();

  const breadcrumbs = [
    {
      title: t("chess.insight.title", { defaultValue: "Insight & Tutor" }),
      href: "/chess/insight",
    },
  ];

  if (isLoading || !data) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p>{t("common.loading", { defaultValue: "Loading…" })}</p>
      </PageWrapper>
    );
  }

  if (!data.hasData) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p className="body-base text-neutral-600">
          {t("chess.insight.noData", {
            defaultValue: "Play a few rated online matches — this report fills in automatically.",
          })}
        </p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="h4 text-neutral-950">
            {t("chess.insight.title", { defaultValue: "Insight & Tutor" })}
          </h1>
          <p className="body-base text-neutral-600">
            {t("chess.insight.subtitle", {
              defaultValue: "Move accuracy across your analyzed online matches.",
            })}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-sm text-neutral-500">
              {t("chess.insight.overallAccuracy", { defaultValue: "Your average accuracy" })}
            </p>
            <p className="h3">{Math.round(data.overallAvgAccuracy)}%</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-sm text-neutral-500">
              {t("chess.insight.tenantAverage", { defaultValue: "Tenant average" })}
            </p>
            <p className="h3">{Math.round(data.tenantAverageAccuracy)}%</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="h6 mb-2">
              {t("chess.insight.weakAreas", { defaultValue: "Focus areas" })}
            </h2>
            <div className="flex flex-wrap gap-1">
              {[
                ...data.weakPhases.map((phase: ChessGamePhase) => CHESS_GAME_PHASE_LABELS[phase]),
                ...data.weakPieceTypes.map(
                  (piece: ChessPieceType) => CHESS_PIECE_TYPE_LABELS[piece],
                ),
                ...data.weakOpenings.map((key: string) => CHESS_OPENING_LABELS[key] ?? key),
              ].map((label) => (
                <Badge key={label} variant="destructive">
                  {label}
                </Badge>
              ))}
              {data.weakPhases.length === 0 &&
              data.weakPieceTypes.length === 0 &&
              data.weakOpenings.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  {t("chess.insight.noWeakAreas", { defaultValue: "No clear weak spot yet." })}
                </p>
              ) : null}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="h6 mb-2">
              {t("chess.insight.strongAreas", { defaultValue: "Strengths" })}
            </h2>
            <div className="flex flex-wrap gap-1">
              {[
                ...data.strongPhases.map((phase: ChessGamePhase) => CHESS_GAME_PHASE_LABELS[phase]),
                ...data.strongPieceTypes.map(
                  (piece: ChessPieceType) => CHESS_PIECE_TYPE_LABELS[piece],
                ),
                ...data.strongOpenings.map((key: string) => CHESS_OPENING_LABELS[key] ?? key),
              ].map((label) => (
                <Badge key={label} variant="default">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h2 className="h6 mb-2">{t("chess.insight.byPhase", { defaultValue: "By phase" })}</h2>
            <StatTable
              rows={data.byPhase.map((row) => ({
                key: row.phase,
                label: CHESS_GAME_PHASE_LABELS[row.phase as ChessGamePhase],
                moveCount: row.moveCount,
                avgAccuracy: row.avgAccuracy,
              }))}
              labelFor={(key) => CHESS_GAME_PHASE_LABELS[key as ChessGamePhase] ?? key}
            />
          </div>
          <div>
            <h2 className="h6 mb-2">
              {t("chess.insight.byPieceType", { defaultValue: "By piece" })}
            </h2>
            <StatTable
              rows={data.byPieceType.map((row) => ({
                key: row.pieceType,
                label: CHESS_PIECE_TYPE_LABELS[row.pieceType as ChessPieceType],
                moveCount: row.moveCount,
                avgAccuracy: row.avgAccuracy,
              }))}
              labelFor={(key) => CHESS_PIECE_TYPE_LABELS[key as ChessPieceType] ?? key}
            />
          </div>
          <div>
            <h2 className="h6 mb-2">
              {t("chess.insight.byOpening", { defaultValue: "By opening" })}
            </h2>
            <StatTable
              rows={data.byOpening.map((row) => ({
                key: row.openingKey,
                label: CHESS_OPENING_LABELS[row.openingKey] ?? row.openingKey,
                moveCount: row.gameCount,
                avgAccuracy: row.avgAccuracy,
              }))}
              labelFor={(key) => CHESS_OPENING_LABELS[key] ?? key}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="h6 mb-2">
              {t("chess.insight.timeManagement", { defaultValue: "Time management" })}
            </h2>
            <p className="text-sm text-neutral-600">
              {t("chess.insight.avgThinkTime", {
                defaultValue:
                  "Avg think time — opening {{opening}}s, middlegame {{middlegame}}s, endgame {{endgame}}s",
                opening: Math.round(data.timeManagement.avgThinkTimeMsByPhase.opening / 1000),
                middlegame: Math.round(data.timeManagement.avgThinkTimeMsByPhase.middlegame / 1000),
                endgame: Math.round(data.timeManagement.avgThinkTimeMsByPhase.endgame / 1000),
              })}
            </p>
            {data.timeManagement.needsTimeManagementFocus ? (
              <Badge variant="destructive" className="mt-2">
                {t("chess.insight.timeManagementWarning", {
                  defaultValue: "Loses often on time — work on pacing",
                })}
              </Badge>
            ) : null}
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="h6 mb-2">
              {t("chess.insight.recovery", { defaultValue: "Recovering from bad positions" })}
            </h2>
            <p className="text-sm text-neutral-600">
              {t("chess.insight.recoveryStat", {
                defaultValue: "{{recovered}} / {{behind}} times behind ended in a win or draw",
                recovered: data.recovery.recoveredCount,
                behind: data.recovery.timesBehind,
              })}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="h6 mb-2">
              {t("chess.insight.conversion", { defaultValue: "Converting an advantage" })}
            </h2>
            <p className="text-sm text-neutral-600">
              {t("chess.insight.conversionStat", {
                defaultValue: "{{failed}} / {{ahead}} times ahead slipped into a draw or loss",
                failed: data.conversion.failedToConvertCount,
                ahead: data.conversion.timesAhead,
              })}
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
