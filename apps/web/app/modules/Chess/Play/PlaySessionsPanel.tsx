import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import { useChessPlaySessions } from "~/api/queries/useChessPlaySessions";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

import type { ListPlaySessionsResponse } from "~/api/generated-api";

export type ChessPlaySession = ListPlaySessionsResponse["data"][number];

type PlaySessionsPanelProps = {
  onReview: (session: ChessPlaySession) => void;
};

function outcomeBadgeVariant(
  outcome: ChessPlaySession["outcome"],
): "success" | "destructive" | "secondary" {
  if (outcome === "win") return "success";
  if (outcome === "loss") return "destructive";
  return "secondary";
}

export function PlaySessionsPanel({ onReview }: PlaySessionsPanelProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useChessPlaySessions({ page: 1, perPage: 10 });

  const sessions = data?.data ?? [];

  return (
    <div
      data-testid="chess-play-sessions-panel"
      className="w-full max-w-sm space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <p className="body-sm-md text-neutral-800">
        {t("chess.play.history.title", { defaultValue: "Your games vs the engine" })}
      </p>

      {isLoading ? (
        <p className="text-xs text-neutral-500">
          {t("chess.play.history.loading", { defaultValue: "Loading…" })}
        </p>
      ) : null}

      {!isLoading && sessions.length === 0 ? (
        <p className="text-xs text-neutral-500">
          {t("chess.play.history.empty", { defaultValue: "No games saved yet." })}
        </p>
      ) : null}

      <ul className="space-y-2">
        {sessions.map((session) => (
          <li
            key={session.id}
            data-testid={`chess-play-session-row-${session.id}`}
            className="flex items-center justify-between gap-2 rounded-md border border-neutral-100 p-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={outcomeBadgeVariant(session.outcome)}>
                  {t(`chess.play.outcome.${session.outcome}`, { defaultValue: session.outcome })}
                </Badge>
                <span className="text-xs text-neutral-500">
                  {session.timeControl ??
                    t("chess.play.history.noClock", { defaultValue: "No clock" })}
                </span>
              </div>
              <p className="truncate text-xs text-neutral-500">
                {format(new Date(session.createdAt), "dd/MM/yyyy HH:mm")} ·{" "}
                {t(`chess.play.levelLabel.${session.level}`, { defaultValue: session.level })} ·{" "}
                {t("chess.play.history.moves", {
                  defaultValue: "{{count}} moves",
                  count: session.moveCount,
                })}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid={`chess-play-session-review-${session.id}`}
              onClick={() => onReview(session)}
            >
              {t("chess.play.history.review", { defaultValue: "Review" })}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
