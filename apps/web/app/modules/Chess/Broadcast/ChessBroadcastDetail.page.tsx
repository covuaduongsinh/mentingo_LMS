import { Link, useParams } from "@remix-run/react";
import { CHESS_BROADCAST_STATUSES, PERMISSIONS } from "@repo/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateChessBroadcastGame,
  useCreateChessBroadcastRound,
  useCreateChessBroadcastTeam,
  useUpdateChessBroadcast,
} from "~/api/mutations/useChessBroadcastMutations";
import { useChessBroadcastDetail } from "~/api/queries/useChessBroadcastDetail";
import { useChessBroadcastStandings } from "~/api/queries/useChessBroadcastStandings";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useCurrentUserStore } from "~/modules/common/store/useCurrentUserStore";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.chessBroadcastDetail");

type Team = { id: string; name: string };
type Round = { id: string; name: string; displayOrder: number };
type Game = {
  id: string;
  roundId: string;
  boardNumber: number;
  whiteName: string;
  blackName: string;
  whiteTeamId: string | null;
  blackTeamId: string | null;
  result: string | null;
};

function AddTeamForm({ broadcastId }: { broadcastId: string }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const { mutateAsync, isPending } = useCreateChessBroadcastTeam(broadcastId);

  if (!isOpen) {
    return (
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        {t("chessBroadcast.detail.addTeam", { defaultValue: "Add team" })}
      </Button>
    );
  }

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void mutateAsync({ name }).then(() => {
          setName("");
          setIsOpen(false);
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="team-name">
          {t("chessBroadcast.form.teamName", { defaultValue: "Team name" })}
        </Label>
        <Input id="team-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button type="submit" size="sm" disabled={isPending || !name}>
        {t("common.save", { defaultValue: "Save" })}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setIsOpen(false)}>
        {t("common.cancel", { defaultValue: "Cancel" })}
      </Button>
    </form>
  );
}

function AddRoundForm({ broadcastId }: { broadcastId: string }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const { mutateAsync, isPending } = useCreateChessBroadcastRound(broadcastId);

  if (!isOpen) {
    return (
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        {t("chessBroadcast.detail.addRound", { defaultValue: "Add round" })}
      </Button>
    );
  }

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void mutateAsync({ name }).then(() => {
          setName("");
          setIsOpen(false);
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="round-name">
          {t("chessBroadcast.form.roundName", { defaultValue: "Round name" })}
        </Label>
        <Input id="round-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button type="submit" size="sm" disabled={isPending || !name}>
        {t("common.save", { defaultValue: "Save" })}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setIsOpen(false)}>
        {t("common.cancel", { defaultValue: "Cancel" })}
      </Button>
    </form>
  );
}

function AddGameForm({
  broadcastId,
  round,
  teams,
  nextBoardNumber,
}: {
  broadcastId: string;
  round: Round;
  teams: Team[];
  nextBoardNumber: number;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [whiteName, setWhiteName] = useState("");
  const [blackName, setBlackName] = useState("");
  const [whiteTeamId, setWhiteTeamId] = useState<string>("");
  const [blackTeamId, setBlackTeamId] = useState<string>("");
  const { mutateAsync, isPending } = useCreateChessBroadcastGame(broadcastId, round.id);

  if (!isOpen) {
    return (
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        {t("chessBroadcast.detail.addGame", { defaultValue: "Add board" })}
      </Button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-md border border-neutral-200 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void mutateAsync({
          boardNumber: nextBoardNumber,
          whiteName,
          blackName,
          whiteTeamId: whiteTeamId || undefined,
          blackTeamId: blackTeamId || undefined,
        }).then(() => {
          setWhiteName("");
          setBlackName("");
          setWhiteTeamId("");
          setBlackTeamId("");
          setIsOpen(false);
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <Label>{t("chessBroadcast.form.whiteName", { defaultValue: "White" })}</Label>
        <Input required value={whiteName} onChange={(e) => setWhiteName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label>{t("chessBroadcast.form.blackName", { defaultValue: "Black" })}</Label>
        <Input required value={blackName} onChange={(e) => setBlackName(e.target.value)} />
      </div>
      {teams.length > 0 && (
        <>
          <div className="flex flex-col gap-1">
            <Label>{t("chessBroadcast.form.whiteTeam", { defaultValue: "White team" })}</Label>
            <Select value={whiteTeamId} onValueChange={setWhiteTeamId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("common.none", { defaultValue: "None" })} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>{t("chessBroadcast.form.blackTeam", { defaultValue: "Black team" })}</Label>
            <Select value={blackTeamId} onValueChange={setBlackTeamId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("common.none", { defaultValue: "None" })} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <Button type="submit" size="sm" disabled={isPending || !whiteName || !blackName}>
        {t("common.save", { defaultValue: "Save" })}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setIsOpen(false)}>
        {t("common.cancel", { defaultValue: "Cancel" })}
      </Button>
    </form>
  );
}

function RoundSection({
  broadcastId,
  round,
  games,
  teams,
  canManage,
}: {
  broadcastId: string;
  round: Round;
  games: Game[];
  teams: Team[];
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
  const nextBoardNumber = games.length > 0 ? Math.max(...games.map((g) => g.boardNumber)) + 1 : 1;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="body-lg-md text-neutral-950">{round.name}</h3>
        {canManage && (
          <AddGameForm
            broadcastId={broadcastId}
            round={round}
            teams={teams}
            nextBoardNumber={nextBoardNumber}
          />
        )}
      </div>

      {games.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {t("chessBroadcast.detail.noGames", { defaultValue: "No boards yet." })}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("chessBroadcast.table.board", { defaultValue: "Board" })}</TableHead>
              <TableHead>{t("chessBroadcast.table.white", { defaultValue: "White" })}</TableHead>
              <TableHead>{t("chessBroadcast.table.black", { defaultValue: "Black" })}</TableHead>
              <TableHead>{t("chessBroadcast.table.result", { defaultValue: "Result" })}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {games
              .slice()
              .sort((a, b) => a.boardNumber - b.boardNumber)
              .map((game) => (
                <TableRow key={game.id}>
                  <TableCell>{game.boardNumber}</TableCell>
                  <TableCell>
                    {game.whiteName}
                    {game.whiteTeamId && (
                      <Badge variant="outline" className="ml-2">
                        {teamNameById.get(game.whiteTeamId)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {game.blackName}
                    {game.blackTeamId && (
                      <Badge variant="outline" className="ml-2">
                        {teamNameById.get(game.blackTeamId)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{game.result ?? "–"}</TableCell>
                  <TableCell>
                    <Link
                      to={`/chess/broadcast/games/${game.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      {t("chessBroadcast.detail.watch", { defaultValue: "Watch" })}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function ChessBroadcastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((state) => state.currentUser);

  if (!id) {
    throw new Error(t("chessBroadcast.errors.notFound", { defaultValue: "Broadcast not found" }));
  }

  const canManage = currentUser?.permissions.includes(PERMISSIONS.CHESS_BROADCAST_MANAGE) ?? false;

  const { data: detail, isLoading } = useChessBroadcastDetail(id, { refetchInterval: 10_000 });
  const { data: standingsData } = useChessBroadcastStandings(id, { refetchInterval: 8_000 });
  const { mutateAsync: updateBroadcast } = useUpdateChessBroadcast(id);

  const breadcrumbs = [
    {
      title: t("chessBroadcast.nav.title", { defaultValue: "Broadcasts" }),
      href: "/chess/broadcast",
    },
    { title: detail?.broadcast.name ?? "", href: `/chess/broadcast/${id}` },
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

  if (!detail) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p className="body-base text-neutral-600">
          {t("chessBroadcast.errors.notFound", { defaultValue: "Broadcast not found" })}
        </p>
      </PageWrapper>
    );
  }

  const { broadcast, teams, rounds } = detail;
  const standings = standingsData?.standings ?? [];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h4 text-neutral-950">{broadcast.name}</h1>
          {canManage ? (
            <Select
              value={broadcast.status}
              onValueChange={(status) => void updateBroadcast({ status: status as never })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CHESS_BROADCAST_STATUSES).map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`chessBroadcast.status.${status}`, { defaultValue: status })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline">
              {t(`chessBroadcast.status.${broadcast.status}`, { defaultValue: broadcast.status })}
            </Badge>
          )}
          <Badge variant="outline">
            {t("chessBroadcast.list.delay", {
              defaultValue: "{{minutes}} min delay",
              minutes: broadcast.delayMinutes,
            })}
          </Badge>
        </div>
        {broadcast.description && (
          <p className="body-base text-neutral-600">{broadcast.description}</p>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="body-lg-md text-neutral-950">
              {t("chessBroadcast.detail.teams", { defaultValue: "Teams" })}
            </h2>
            {canManage && <AddTeamForm broadcastId={id} />}
          </div>
          <div className="flex flex-wrap gap-2">
            {teams.length === 0 ? (
              <p className="text-sm text-neutral-500">
                {t("chessBroadcast.detail.noTeams", { defaultValue: "No teams configured." })}
              </p>
            ) : (
              teams.map((team) => <Badge key={team.id}>{team.name}</Badge>)
            )}
          </div>
        </div>

        {standings.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="body-lg-md text-neutral-950">
              {t("chessBroadcast.detail.standings", { defaultValue: "Team standings" })}
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("chessBroadcast.table.team", { defaultValue: "Team" })}</TableHead>
                  <TableHead>
                    {t("chessBroadcast.table.score", { defaultValue: "Score" })}
                  </TableHead>
                  <TableHead>
                    {t("chessBroadcast.table.gamesPlayed", { defaultValue: "Games" })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((row) => (
                  <TableRow key={row.teamId}>
                    <TableCell>{row.teamName}</TableCell>
                    <TableCell>{row.score}</TableCell>
                    <TableCell>{row.gamesPlayed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="body-lg-md text-neutral-950">
              {t("chessBroadcast.detail.rounds", { defaultValue: "Rounds" })}
            </h2>
            {canManage && <AddRoundForm broadcastId={id} />}
          </div>
          {rounds.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {t("chessBroadcast.detail.noRounds", { defaultValue: "No rounds yet." })}
            </p>
          ) : (
            rounds
              .slice()
              .sort((a, b) => a.round.displayOrder - b.round.displayOrder)
              .map(({ round, games }) => (
                <RoundSection
                  key={round.id}
                  broadcastId={id}
                  round={round}
                  games={games}
                  teams={teams}
                  canManage={canManage}
                />
              ))
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
