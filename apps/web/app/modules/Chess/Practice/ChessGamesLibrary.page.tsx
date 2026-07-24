import { Link } from "@remix-run/react";
import { CHESS_TOPIC_LABELS } from "@repo/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useChessGames } from "~/api/queries/useChessGames";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessGamesLibrary");

export default function ChessGamesLibraryPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useChessGames({ page: 1, perPage: 40, publishedOnly: true });
  const games = data?.data ?? [];

  const breadcrumbs = useMemo(
    () => [
      {
        title: t("chess.nav.gameLibrary", { defaultValue: "Game library" }),
        href: "/chess/games",
      },
    ],
    [t],
  );

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h4 text-neutral-950">
              {t("chess.library.title", { defaultValue: "Game library" })}
            </h1>
            <p className="body-base text-neutral-600">
              {t("chess.library.subtitle", {
                defaultValue: "Model games and teaching PGNs for school chess.",
              })}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/chess/practice">
              {t("chess.nav.practice", { defaultValue: "Practice hub" })}
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <p>{t("common.loading", { defaultValue: "Loading…" })}</p>
        ) : games.length === 0 ? (
          <p className="text-neutral-600">
            {t("chess.library.empty", { defaultValue: "No published games yet." })}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => (
              <Link
                key={game.id}
                to={`/chess/games/${game.id}`}
                className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-primary-300"
              >
                <h2 className="h6 mb-2">{game.title}</h2>
                <div className="mb-2 flex flex-wrap gap-1">
                  {game.topics.map((topic) => (
                    <Badge key={topic} variant="secondary">
                      {CHESS_TOPIC_LABELS[topic] ?? topic}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">{game.level}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
