import { useParams } from "@remix-run/react";
import { CHESS_BROADCAST_GAME_RESULTS, PERMISSIONS } from "@repo/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  usePasteChessBroadcastPgn,
  useUpdateChessBroadcastGame,
} from "~/api/mutations/useChessBroadcastMutations";
import { useChessBroadcastGameView } from "~/api/queries/useChessBroadcastGameView";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { FenBoard } from "~/modules/Chess/board";
import { useCurrentUserStore } from "~/modules/common/store/useCurrentUserStore";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.chessBroadcastGame");

function PastePgnForm({ broadcastId, gameId }: { broadcastId: string; gameId: string }) {
  const { t } = useTranslation();
  const [pgn, setPgn] = useState("");
  const { mutateAsync, isPending, data } = usePasteChessBroadcastPgn(broadcastId, gameId);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void mutateAsync(pgn);
      }}
    >
      <Label htmlFor="broadcast-pgn">
        {t("chessBroadcast.game.pastePgn", { defaultValue: "Paste updated PGN" })}
      </Label>
      <Textarea
        id="broadcast-pgn"
        rows={6}
        value={pgn}
        onChange={(event) => setPgn(event.target.value)}
        placeholder="1. e4 e5 2. Nf3 Nc6 ..."
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending || !pgn}>
          {t("chessBroadcast.game.applyPgn", { defaultValue: "Apply" })}
        </Button>
        {data && (
          <span className="text-sm text-neutral-500">
            {t("chessBroadcast.game.movesAdded", {
              defaultValue: "{{count}} new move(s) added",
              count: data.insertedMoveCount,
            })}
          </span>
        )}
      </div>
    </form>
  );
}

function GameManageSettings({
  broadcastId,
  gameId,
  pgnSourceUrl,
  result,
}: {
  broadcastId: string;
  gameId: string;
  pgnSourceUrl: string | null;
  result: string | null;
}) {
  const { t } = useTranslation();
  const [sourceUrl, setSourceUrl] = useState(pgnSourceUrl ?? "");
  const { mutateAsync, isPending } = useUpdateChessBroadcastGame(broadcastId, gameId);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="pgn-source-url">
          {t("chessBroadcast.game.pgnSourceUrl", { defaultValue: "Auto-pull PGN source URL" })}
        </Label>
        <div className="flex gap-2">
          <Input
            id="pgn-source-url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://…"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => void mutateAsync({ pgnSourceUrl: sourceUrl || null })}
          >
            {t("common.save", { defaultValue: "Save" })}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label>{t("chessBroadcast.game.result", { defaultValue: "Result" })}</Label>
        <Select
          value={result ?? "none"}
          onValueChange={(value) =>
            void mutateAsync({ result: value === "none" ? null : (value as never) })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("common.none", { defaultValue: "None" })}</SelectItem>
            {Object.values(CHESS_BROADCAST_GAME_RESULTS).map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function ChessBroadcastGamePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((state) => state.currentUser);
  const [live, setLive] = useState(false);

  if (!id) {
    throw new Error(t("chessBroadcast.errors.gameNotFound", { defaultValue: "Board not found" }));
  }

  const canManage = currentUser?.permissions.includes(PERMISSIONS.CHESS_BROADCAST_MANAGE) ?? false;
  const { data: view, isLoading } = useChessBroadcastGameView(id, live && canManage, {
    refetchInterval: 10_000,
  });

  const breadcrumbs = [
    {
      title: t("chessBroadcast.nav.title", { defaultValue: "Broadcasts" }),
      href: "/chess/broadcast",
    },
    {
      title: view ? `${view.game.whiteName} – ${view.game.blackName}` : "",
      href: `/chess/broadcast/games/${id}`,
    },
  ];

  if (isLoading) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p className="body-base text-neutral-600">
          {t("common.loading", { defaultValue: "Loading…" })}
        </p>
      </PageWrapper>
    );
  }

  if (!view) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p className="body-base text-neutral-600">
          {t("chessBroadcast.errors.gameNotFound", { defaultValue: "Board not found" })}
        </p>
      </PageWrapper>
    );
  }

  const { game, broadcastId, moves, fen, delayed } = view;

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="h4 text-neutral-950">
              {game.whiteName} – {game.blackName}
            </h1>
            {game.result && <Badge>{game.result}</Badge>}
            {delayed && (
              <Badge variant="outline">
                {t("chessBroadcast.game.delayed", { defaultValue: "Delayed view" })}
              </Badge>
            )}
          </div>
          <FenBoard fen={fen} size={420} />
          {canManage && (
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <Switch checked={live} onCheckedChange={setLive} />
              {t("chessBroadcast.game.liveView", { defaultValue: "Live view (no delay)" })}
            </label>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="body-lg-md mb-2 text-neutral-950">
              {t("chessBroadcast.game.moves", { defaultValue: "Moves" })}
            </h2>
            {moves.length === 0 ? (
              <p className="text-sm text-neutral-500">
                {t("chessBroadcast.game.noMoves", { defaultValue: "No moves visible yet." })}
              </p>
            ) : (
              <ol className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {moves.map((move) => (
                  <li key={move.ply}>
                    {move.ply % 2 === 0
                      ? `${move.ply / 2 + 1}. ${move.san}`
                      : `${(move.ply - 1) / 2 + 1}... ${move.san}`}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {canManage && (
            <>
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <PastePgnForm broadcastId={broadcastId} gameId={id} />
              </div>
              <GameManageSettings
                broadcastId={broadcastId}
                gameId={id}
                pgnSourceUrl={game.pgnSourceUrl}
                result={game.result}
              />
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
