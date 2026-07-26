import { Link } from "@remix-run/react";
import { CHESS_MOTIF_LABELS, type ChessMotif } from "@repo/shared";
import { useTranslation } from "react-i18next";

import { useChessPuzzleDashboard } from "~/api/queries/useChessPuzzleDashboard";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.chessPuzzleDashboard");

export default function ChessPuzzleDashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useChessPuzzleDashboard();

  const breadcrumbs = [
    { title: t("chess.nav.puzzles", { defaultValue: "Puzzles" }), href: "/chess/puzzles" },
    {
      title: t("chess.puzzle.dashboardTitle", { defaultValue: "Progress" }),
      href: "/chess/puzzles/dashboard",
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
          <div>
            <h1 className="h4 text-neutral-950">
              {t("chess.puzzle.dashboardTitle", { defaultValue: "Progress" })}
            </h1>
            <p className="body-base text-neutral-600">
              {t("chess.puzzle.dashboardSubtitle", {
                defaultValue: "Your puzzle rating and performance by theme.",
              })}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/chess/puzzles">
              {t("chess.puzzle.backToPractice", { defaultValue: "Back to practice" })}
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">
            {t("chess.puzzle.currentRating", { defaultValue: "Current rating" })}
          </p>
          <p className="h3">{Math.round(data.rating.rating)}</p>
          <p className="text-xs text-neutral-500">
            {t("chess.puzzle.gamesPlayed", {
              count: data.rating.gamesPlayed,
              defaultValue: "{{count}} puzzles solved",
            })}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="h6 mb-2">
              {t("chess.puzzle.weakMotifs", { defaultValue: "Focus areas" })}
            </h2>
            {data.weakMotifs.length === 0 ? (
              <p className="text-sm text-neutral-500">
                {t("chess.puzzle.noWeakMotifs", { defaultValue: "No clear weak spot yet." })}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {data.weakMotifs.map((motifTag: ChessMotif) => (
                  <Badge key={motifTag} variant="destructive">
                    {CHESS_MOTIF_LABELS[motifTag] ?? motifTag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="h6 mb-2">
              {t("chess.puzzle.strongMotifs", { defaultValue: "Strengths" })}
            </h2>
            {data.strongMotifs.length === 0 ? (
              <p className="text-sm text-neutral-500">
                {t("chess.puzzle.noStrongMotifs", {
                  defaultValue: "Solve a few more puzzles to see this.",
                })}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {data.strongMotifs.map((motifTag: ChessMotif) => (
                  <Badge key={motifTag} variant="default">
                    {CHESS_MOTIF_LABELS[motifTag] ?? motifTag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="h6 mb-3">{t("chess.puzzle.themeStats", { defaultValue: "By theme" })}</h2>
          {data.themeStats.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {t("chess.puzzle.noThemeStats", { defaultValue: "No puzzles solved yet." })}
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-neutral-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="p-2">{t("chess.puzzle.theme", { defaultValue: "Theme" })}</th>
                    <th className="p-2">
                      {t("chess.puzzle.attempts", { defaultValue: "Attempts" })}
                    </th>
                    <th className="p-2">
                      {t("chess.puzzle.accuracy", { defaultValue: "Accuracy" })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.themeStats
                    .slice()
                    .sort((a, b) => b.attempts - a.attempts)
                    .map((row) => (
                      <tr key={row.motif} className="border-t border-neutral-100">
                        <td className="p-2">{CHESS_MOTIF_LABELS[row.motif] ?? row.motif}</td>
                        <td className="p-2">{row.attempts}</td>
                        <td className="p-2">{Math.round(row.accuracy * 100)}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
