import { useParams } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useChessAnalysisSession } from "~/api/queries/useChessAnalysisSession";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { useToast } from "~/components/ui/use-toast";
import { ChessBoard } from "~/modules/Chess/board";
import { setPageTitle } from "~/utils/setPageTitle";

import { useChessAnalysisSocket } from "./useChessAnalysisSocket";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessAnalysisRoom");

export default function ChessAnalysisRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();

  if (!id) {
    throw new Error(t("chess.analysisRoom.error.notFound", { defaultValue: "Room not found" }));
  }

  const { data: session, isLoading } = useChessAnalysisSession(id);
  const [fen, setFen] = useState<string | null>(null);
  const [moveList, setMoveList] = useState<string[] | null>(null);
  const [status, setStatus] = useState<"active" | "ended" | null>(null);
  const [resetFenInput, setResetFenInput] = useState("");

  const currentFen = fen ?? session?.currentFen ?? "";
  const currentStatus = status ?? session?.status ?? "active";
  const currentMoveList = moveList ?? session?.moveList ?? [];

  const { role, emitMove, emitResetFen, emitEnd } = useChessAnalysisSocket({
    sessionId: id,
    enabled: Boolean(session),
    onMove: (payload) => {
      setFen(payload.fen);
      setMoveList(payload.moveList);
    },
    onResetFen: (payload) => {
      setFen(payload.fen);
      setMoveList([]);
    },
    onEnded: () => {
      setStatus("ended");
      toast({
        description: t("chess.analysisRoom.toast.ended", {
          defaultValue: "The host ended this room.",
        }),
      });
    },
  });

  const currentRole = role ?? session?.role ?? "viewer";
  const isHost = currentRole === "host";
  const isEnded = currentStatus === "ended";

  const handleMove = (uci: string) => {
    if (isEnded) return;
    emitMove(uci);
  };

  const handleResetFen = () => {
    if (!resetFenInput.trim()) return;
    emitResetFen(resetFenInput.trim());
    setResetFenInput("");
  };

  if (isLoading) {
    return (
      <PageWrapper breadcrumbs={[]}>
        <p className="body-base text-neutral-600">
          {t("chess.analysisRoom.loading", { defaultValue: "Loading room…" })}
        </p>
      </PageWrapper>
    );
  }

  if (!session) {
    return (
      <PageWrapper breadcrumbs={[]}>
        <p className="body-base text-neutral-600">
          {t("chess.analysisRoom.error.notFound", { defaultValue: "Room not found" })}
        </p>
      </PageWrapper>
    );
  }

  const roomTitle =
    session.name ?? t("chess.analysisRoom.title", { defaultValue: "Analysis room" });
  const breadcrumbs = [
    { title: t("chess.nav.analysis", { defaultValue: "Analysis" }), href: "/chess/analysis" },
    { title: roomTitle, href: `/chess/analysis-room/${id}` },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="h4">{roomTitle}</h1>
            <Badge variant={isEnded ? "outline" : "success"}>
              {isEnded
                ? t("chess.analysisRoom.status.ended", { defaultValue: "Ended" })
                : t("chess.analysisRoom.status.active", { defaultValue: "Active" })}
            </Badge>
            <Badge variant="outline">
              {isHost
                ? t("chess.analysisRoom.role.host", { defaultValue: "Host" })
                : t("chess.analysisRoom.role.viewer", { defaultValue: "Viewer" })}
            </Badge>
          </div>

          <ChessBoard fen={currentFen} interactive={!isEnded} onMove={handleMove} size={400} />

          {isHost && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={isEnded}
                onClick={() => emitEnd()}
              >
                {t("chess.analysisRoom.endButton", { defaultValue: "End room" })}
              </Button>
            </div>
          )}
        </div>

        <div className="w-full max-w-md space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="space-y-1">
            <Label>{t("chess.analysis.moves", { defaultValue: "Moves (UCI)" })}</Label>
            <Input className="font-mono text-xs" readOnly value={currentMoveList.join(" ")} />
          </div>

          {isHost && !isEnded && (
            <div className="space-y-2">
              <Label>
                {t("chess.analysisRoom.resetFenLabel", { defaultValue: "Reset position (FEN)" })}
              </Label>
              <Textarea
                className="font-mono text-xs"
                value={resetFenInput}
                onChange={(event) => setResetFenInput(event.target.value)}
                rows={2}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleResetFen}>
                {t("chess.analysisRoom.resetFenButton", { defaultValue: "Reset position" })}
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
