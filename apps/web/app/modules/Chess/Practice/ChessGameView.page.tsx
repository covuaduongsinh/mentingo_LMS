import { Link, useParams } from "@remix-run/react";
import { CHESS_TOPIC_LABELS } from "@repo/shared";
import { useTranslation } from "react-i18next";

import { useChessGame } from "~/api/queries/useChessGame";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { PgnViewer } from "~/modules/Chess/board";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessGamesLibrary");

export default function ChessGameViewPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data: game, isLoading } = useChessGame(id);

  const breadcrumbs = [
    {
      title: t("chess.nav.gameLibrary", { defaultValue: "Game library" }),
      href: "/chess/games",
    },
    {
      title: game?.title ?? t("chess.library.view", { defaultValue: "Game" }),
      href: id ? `/chess/games/${id}` : "/chess/games",
    },
  ];

  if (isLoading) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p>{t("common.loading", { defaultValue: "Loading…" })}</p>
      </PageWrapper>
    );
  }

  if (!game) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p>{t("chess.library.notFound", { defaultValue: "Game not found." })}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/chess/games">{t("common.button.back", { defaultValue: "Back" })}</Link>
        </Button>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="space-y-3">
          <h1 className="h4">{game.title}</h1>
          <div className="flex flex-wrap gap-1">
            {game.topics.map((topic) => (
              <Badge key={topic} variant="secondary">
                {CHESS_TOPIC_LABELS[topic] ?? topic}
              </Badge>
            ))}
            <Badge variant="outline">{game.level}</Badge>
          </div>
          <PgnViewer pgn={game.pgn} size={380} />
        </div>
        {game.teachingNotes ? (
          <div className="max-w-md rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h2 className="h6 mb-2">
              {t("chess.admin.teachingNotes", { defaultValue: "Teaching notes" })}
            </h2>
            <p className="body-base whitespace-pre-wrap text-neutral-800">{game.teachingNotes}</p>
          </div>
        ) : null}
      </div>
    </PageWrapper>
  );
}
