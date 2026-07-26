import { Link, useParams } from "@remix-run/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useChessMatch } from "~/api/queries/useChessMatch";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/use-toast";
import { ChessBoard } from "~/modules/Chess/board";
import { setPageTitle } from "~/utils/setPageTitle";

import { useChessMatchSocket } from "./useChessMatchSocket";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessMatchPlay");

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ChessMatchPlayPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();

  if (!id) {
    throw new Error(t("chess.match.errors.notFound", { defaultValue: "Match not found" }));
  }

  const { data: match, isLoading } = useChessMatch(id);
  const [fen, setFen] = useState<string | null>(null);
  const [whiteMs, setWhiteMs] = useState<number | null>(null);
  const [blackMs, setBlackMs] = useState<number | null>(null);
  const [finished, setFinished] = useState<{ result: string; endReason: string } | null>(null);
  const [drawOfferedBy, setDrawOfferedBy] = useState<string | null>(null);

  const currentFen = fen ?? match?.currentFen ?? "";
  const currentWhiteMs = whiteMs ?? match?.whiteTimeRemainingMs ?? 0;
  const currentBlackMs = blackMs ?? match?.blackTimeRemainingMs ?? 0;

  const { role, emitMove, emitResign, emitOfferDraw, emitAcceptDraw } = useChessMatchSocket({
    matchId: id,
    enabled: Boolean(match),
    onMove: (payload) => {
      setFen(payload.fen);
      setWhiteMs(payload.whiteTimeRemainingMs);
      setBlackMs(payload.blackTimeRemainingMs);
      setDrawOfferedBy(null);
    },
    onEnd: (payload) => {
      setFinished({ result: payload.result, endReason: payload.endReason });
    },
    onDrawOffered: (payload) => {
      setDrawOfferedBy(payload.offeredByUserId);
      toast({
        description: t("chess.match.drawOfferedToast", {
          defaultValue: "Your opponent offered a draw",
        }),
      });
    },
  });

  // Client-side ticking between server syncs, purely for display — the server clock is authoritative.
  useEffect(() => {
    if (finished) return;
    const isWhiteTurn = currentFen.split(" ")[1] === "w";
    const interval = setInterval(() => {
      if (isWhiteTurn) setWhiteMs((prev) => (prev !== null ? Math.max(0, prev - 1000) : prev));
      else setBlackMs((prev) => (prev !== null ? Math.max(0, prev - 1000) : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentFen, finished]);

  const isEnded = Boolean(finished) || match?.status === "finished";
  const isMyTurn =
    role !== "viewer" &&
    role !== null &&
    currentFen.split(" ")[1] === (role === "white" ? "w" : "b");

  const handleMove = (uci: string) => {
    if (isEnded || !isMyTurn) return;
    emitMove(uci);
  };

  if (isLoading) {
    return (
      <PageWrapper breadcrumbs={[]}>
        <p className="body-base text-neutral-600">
          {t("common.loading", { defaultValue: "Loading…" })}
        </p>
      </PageWrapper>
    );
  }

  if (!match) {
    return (
      <PageWrapper breadcrumbs={[]}>
        <p className="body-base text-neutral-600">
          {t("chess.match.errors.notFound", { defaultValue: "Match not found" })}
        </p>
      </PageWrapper>
    );
  }

  const breadcrumbs = [
    { title: t("chess.lobby.title", { defaultValue: "Play online" }), href: "/chess/lobby" },
    { title: t("chess.match.title", { defaultValue: "Match" }), href: `/chess/matches/${id}` },
  ];

  const resultLabel = finished
    ? finished.result === "draw"
      ? t("chess.match.resultDraw", { defaultValue: "Draw" })
      : finished.result === (role === "white" ? "white_win" : "black_win")
        ? t("chess.match.resultWin", { defaultValue: "You won!" })
        : t("chess.match.resultLoss", { defaultValue: "You lost." })
    : null;

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{match.timeControlId}</Badge>
            <Badge variant={match.rated ? "default" : "outline"}>
              {match.rated
                ? t("chess.lobby.rated", { defaultValue: "Rated" })
                : t("chess.lobby.casual", { defaultValue: "Casual" })}
            </Badge>
            {role && role !== "viewer" ? (
              <Badge variant="outline">
                {role === "white"
                  ? t("chess.editor.white", { defaultValue: "White" })
                  : t("chess.editor.black", { defaultValue: "Black" })}
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center justify-between font-mono text-lg">
            <span>{formatClock(currentBlackMs)}</span>
            <span className="text-sm text-neutral-500">
              {t("chess.match.black", { defaultValue: "Black" })}
            </span>
          </div>
          <ChessBoard
            fen={currentFen}
            interactive={!isEnded && isMyTurn}
            onMove={handleMove}
            size={400}
            orientation={role === "black" ? "black" : "white"}
          />
          <div className="flex items-center justify-between font-mono text-lg">
            <span>{formatClock(currentWhiteMs)}</span>
            <span className="text-sm text-neutral-500">
              {t("chess.match.white", { defaultValue: "White" })}
            </span>
          </div>

          {resultLabel ? (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm font-medium">
              {resultLabel}
            </div>
          ) : null}

          {isEnded ? (
            <Button asChild variant="outline">
              <Link to={`/chess/matches/${id}/insight`}>
                {t("chess.match.viewInsight", { defaultValue: "View game analysis" })}
              </Link>
            </Button>
          ) : null}

          {role && role !== "viewer" && !isEnded ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="destructive" onClick={() => emitResign()}>
                {t("chess.match.resign", { defaultValue: "Resign" })}
              </Button>
              {drawOfferedBy ? (
                <Button type="button" variant="outline" onClick={() => emitAcceptDraw()}>
                  {t("chess.match.acceptDraw", { defaultValue: "Accept draw" })}
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => emitOfferDraw()}>
                  {t("chess.match.offerDraw", { defaultValue: "Offer draw" })}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </PageWrapper>
  );
}
