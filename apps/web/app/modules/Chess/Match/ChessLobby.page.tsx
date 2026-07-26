import { useNavigate } from "@remix-run/react";
import { CHESS_COLOR_PREFERENCES, CHESS_MATCH_TIME_CONTROL_LIST } from "@repo/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAcceptChessSeek } from "~/api/mutations/useAcceptChessSeek";
import { useCancelChessSeek } from "~/api/mutations/useCancelChessSeek";
import { useCreateChessSeek } from "~/api/mutations/useCreateChessSeek";
import { useChessSeeks } from "~/api/queries/useChessSeeks";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { useCurrentUserStore } from "~/modules/common/store/useCurrentUserStore";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";
import type { ChessColorPreference } from "@repo/shared";
import type { CreateSeekBody } from "~/api/generated-api";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessLobby");

export default function ChessLobbyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((state) => state.currentUser);

  const [timeControlId, setTimeControlId] = useState<string>(
    CHESS_MATCH_TIME_CONTROL_LIST[1]?.id ?? "5+0",
  );
  const [colorPreference, setColorPreference] = useState<ChessColorPreference>(
    CHESS_COLOR_PREFERENCES.RANDOM,
  );
  const [rated, setRated] = useState(true);

  const { data: seeks, isLoading } = useChessSeeks({ refetchInterval: 4000 });
  const { mutateAsync: createSeek, isPending: isCreating } = useCreateChessSeek();
  const { mutateAsync: cancelSeek } = useCancelChessSeek();
  const { mutateAsync: acceptSeek, isPending: isAccepting } = useAcceptChessSeek();

  const breadcrumbs = [
    { title: t("chess.nav.lobby", { defaultValue: "Play online" }), href: "/chess/lobby" },
  ];

  const handleCreateSeek = async () => {
    await createSeek({
      timeControlId: timeControlId as CreateSeekBody["timeControlId"],
      colorPreference,
      rated,
    });
  };

  const handleAcceptSeek = async (seekId: string) => {
    const match = await acceptSeek(seekId);
    navigate(`/chess/matches/${match.id}`);
  };

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="h4 text-neutral-950">
            {t("chess.lobby.title", { defaultValue: "Play online" })}
          </h1>
          <p className="body-base text-neutral-600">
            {t("chess.lobby.subtitle", {
              defaultValue: "Create a seek or accept someone else's to start a real-time match.",
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
          <Select value={timeControlId} onValueChange={setTimeControlId}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHESS_MATCH_TIME_CONTROL_LIST.map((control) => (
                <SelectItem key={control.id} value={control.id}>
                  {control.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={colorPreference}
            onValueChange={(value) => setColorPreference(value as ChessColorPreference)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CHESS_COLOR_PREFERENCES.RANDOM}>
                {t("chess.lobby.colorRandom", { defaultValue: "Random" })}
              </SelectItem>
              <SelectItem value={CHESS_COLOR_PREFERENCES.WHITE}>
                {t("chess.lobby.colorWhite", { defaultValue: "White" })}
              </SelectItem>
              <SelectItem value={CHESS_COLOR_PREFERENCES.BLACK}>
                {t("chess.lobby.colorBlack", { defaultValue: "Black" })}
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch checked={rated} onCheckedChange={setRated} />
            <span className="text-sm">{t("chess.lobby.rated", { defaultValue: "Rated" })}</span>
          </div>
          <Button disabled={isCreating} onClick={() => void handleCreateSeek()}>
            {t("chess.lobby.createSeek", { defaultValue: "Create seek" })}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-neutral-600">{t("common.loading", { defaultValue: "Loading…" })}</p>
        ) : !seeks || seeks.length === 0 ? (
          <p className="text-neutral-600">
            {t("chess.lobby.empty", { defaultValue: "No open seeks right now — create one!" })}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="p-3">{t("chess.lobby.timeControl", { defaultValue: "Time" })}</th>
                  <th className="p-3">{t("chess.lobby.rated", { defaultValue: "Rated" })}</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {seeks.map((seek) => {
                  const isOwn = seek.creatorUserId === currentUser?.id;
                  return (
                    <tr key={seek.id} className="border-t border-neutral-100">
                      <td className="p-3 font-mono">{seek.timeControlId}</td>
                      <td className="p-3">
                        <Badge variant={seek.rated ? "default" : "outline"}>
                          {seek.rated
                            ? t("chess.lobby.rated", { defaultValue: "Rated" })
                            : t("chess.lobby.casual", { defaultValue: "Casual" })}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {isOwn ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void cancelSeek(seek.id)}
                          >
                            {t("chess.lobby.cancel", { defaultValue: "Cancel" })}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isAccepting}
                            onClick={() => void handleAcceptSeek(seek.id)}
                          >
                            {t("chess.lobby.accept", { defaultValue: "Accept" })}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
