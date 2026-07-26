import { useParams } from "@remix-run/react";
import { CHESS_TOURNAMENT_FORMATS, CHESS_TOURNAMENT_STATUSES, PERMISSIONS } from "@repo/shared";
import { useTranslation } from "react-i18next";

import { useExportTournamentTrf } from "~/api/mutations/useExportTournamentTrf";
import { useGenerateNextRound } from "~/api/mutations/useGenerateNextRound";
import { useJoinChessTournament } from "~/api/mutations/useJoinChessTournament";
import { usePairNextArena } from "~/api/mutations/usePairNextArena";
import { useStartChessTournament } from "~/api/mutations/useStartChessTournament";
import { useChessTournament } from "~/api/queries/useChessTournament";
import { useChessTournamentStandings } from "~/api/queries/useChessTournamentStandings";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
  setPageTitle(matches, "pages.chessTournamentDetail");

export default function ChessTournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((state) => state.currentUser);

  if (!id) {
    throw new Error(t("chessTournament.errors.notFound", { defaultValue: "Tournament not found" }));
  }

  const canManage = currentUser?.permissions.includes(PERMISSIONS.CHESS_TOURNAMENT_MANAGE) ?? false;

  const { data: tournament, isLoading } = useChessTournament(id);
  const { data: standingsData } = useChessTournamentStandings(id, {
    enabled: Boolean(tournament),
    refetchInterval: 8000,
  });

  const { mutateAsync: joinTournament, isPending: isJoining } = useJoinChessTournament(id);
  const { mutateAsync: startTournament, isPending: isStarting } = useStartChessTournament(id);
  const { mutateAsync: generateNextRound, isPending: isGeneratingRound } = useGenerateNextRound(id);
  const { mutateAsync: pairNextArena, isPending: isPairingArena } = usePairNextArena(id);
  const { mutateAsync: exportTrf, isPending: isExporting } = useExportTournamentTrf(id);

  const breadcrumbs = [
    {
      title: t("chessTournament.nav.title", { defaultValue: "Tournaments" }),
      href: "/admin/chess/tournaments/new",
    },
    { title: tournament?.name ?? "", href: `/chess/tournaments/${id}` },
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

  if (!tournament) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p className="body-base text-neutral-600">
          {t("chessTournament.errors.notFound", { defaultValue: "Tournament not found" })}
        </p>
      </PageWrapper>
    );
  }

  const isRegistration = tournament.status === CHESS_TOURNAMENT_STATUSES.REGISTRATION;
  const isActive = tournament.status === CHESS_TOURNAMENT_STATUSES.ACTIVE;
  const isSwiss = tournament.format === CHESS_TOURNAMENT_FORMATS.SWISS;
  const isArena = tournament.format === CHESS_TOURNAMENT_FORMATS.ARENA;

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h4 text-neutral-950">{tournament.name}</h1>
          <Badge variant="outline">{tournament.format}</Badge>
          <Badge variant="outline">{tournament.status}</Badge>
          {isSwiss && (
            <Badge variant="outline">
              {t("chessTournament.detail.round", {
                defaultValue: "Round {{current}} / {{total}}",
                current: tournament.currentRound,
                total: tournament.roundCount,
              })}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {isRegistration && (
            <Button disabled={isJoining} onClick={() => void joinTournament()}>
              {t("chessTournament.detail.join", { defaultValue: "Join" })}
            </Button>
          )}

          {canManage && isRegistration && (
            <Button disabled={isStarting} onClick={() => void startTournament()}>
              {t("chessTournament.detail.start", { defaultValue: "Start" })}
            </Button>
          )}

          {canManage && isActive && isSwiss && (
            <Button disabled={isGeneratingRound} onClick={() => void generateNextRound()}>
              {t("chessTournament.detail.nextRound", { defaultValue: "Next round" })}
            </Button>
          )}

          {canManage && isActive && isArena && (
            <Button disabled={isPairingArena} onClick={() => void pairNextArena()}>
              {t("chessTournament.detail.pairNext", { defaultValue: "Pair next" })}
            </Button>
          )}

          {canManage && (
            <Button variant="outline" disabled={isExporting} onClick={() => void exportTrf()}>
              {t("chessTournament.detail.exportTrf", { defaultValue: "Export TRF" })}
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("chessTournament.table.rank", { defaultValue: "#" })}</TableHead>
              <TableHead>
                {t("chessTournament.table.displayName", { defaultValue: "Player" })}
              </TableHead>
              <TableHead>{t("chessTournament.table.score", { defaultValue: "Score" })}</TableHead>
              <TableHead>
                {t("chessTournament.table.buchholz", { defaultValue: "Buchholz" })}
              </TableHead>
              <TableHead>{t("chessTournament.table.sb", { defaultValue: "SB" })}</TableHead>
              <TableHead>{t("chessTournament.table.games", { defaultValue: "Games" })}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(standingsData?.standings ?? []).map((row, index) => (
              <TableRow key={row.userId}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{row.displayName}</TableCell>
                <TableCell>{row.score}</TableCell>
                <TableCell>{row.buchholz}</TableCell>
                <TableCell>{row.sonnebornBerger.toFixed(1)}</TableCell>
                <TableCell>{row.gamesPlayed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
