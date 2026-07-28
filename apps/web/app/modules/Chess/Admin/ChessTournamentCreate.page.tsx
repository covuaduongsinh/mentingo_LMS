import { useNavigate } from "@remix-run/react";
import { CHESS_MATCH_TIME_CONTROL_LIST, CHESS_TOURNAMENT_FORMATS } from "@repo/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useBulkPairing } from "~/api/mutations/useBulkPairing";
import { useCreateChessTournament } from "~/api/mutations/useCreateChessTournament";
import { useGroupsQuery } from "~/api/queries/admin/useGroups";
import { useTeachingClassrooms } from "~/api/queries/useTeachingClassrooms";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";
import type { ChessTournamentFormat } from "@repo/shared";
import type { CreateTournamentBody } from "~/api/generated-api";

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.chessTournamentCreate");

export default function ChessTournamentCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: groups } = useGroupsQuery();
  const { data: teachingClassrooms } = useTeachingClassrooms();

  const [format, setFormat] = useState<ChessTournamentFormat>(
    CHESS_TOURNAMENT_FORMATS.BULK_PAIRING,
  );
  const [groupId, setGroupId] = useState<string>("");
  const [classroomId, setClassroomId] = useState<string>("");
  const [name, setName] = useState("");
  const [timeControlId, setTimeControlId] = useState<string>(
    CHESS_MATCH_TIME_CONTROL_LIST[1]?.id ?? "5+0",
  );
  const [rated, setRated] = useState(true);
  const [roundCount, setRoundCount] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(60);

  const { mutateAsync: bulkPairing, isPending: isBulkPairing } = useBulkPairing();
  const { mutateAsync: createTournament, isPending: isCreating } = useCreateChessTournament();

  const handleBulkPairing = async () => {
    if (!groupId) return;
    const result = await bulkPairing({
      groupId,
      timeControlId: timeControlId as CreateTournamentBody["timeControlId"],
      rated,
      auto: true,
    });
    navigate(`/chess/tournaments/${result.tournament.id}`);
  };

  const handleCreateTournament = async () => {
    if (!name.trim()) return;
    const body: CreateTournamentBody = {
      name,
      format,
      groupId: groupId || undefined,
      classroomId: classroomId || undefined,
      timeControlId: timeControlId as CreateTournamentBody["timeControlId"],
      rated,
      roundCount: format === CHESS_TOURNAMENT_FORMATS.SWISS ? roundCount : undefined,
      durationMinutes: format === CHESS_TOURNAMENT_FORMATS.ARENA ? durationMinutes : undefined,
    };
    const tournament = await createTournament(body);
    navigate(`/chess/tournaments/${tournament.id}`);
  };

  const breadcrumbs = [
    {
      title: t("chessTournament.nav.title", { defaultValue: "Tournaments" }),
      href: "/admin/chess/tournaments/new",
    },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>
            {t("chessTournament.create.title", { defaultValue: "Create a chess event" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>{t("chessTournament.create.group", { defaultValue: "Group / class" })}</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("chessTournament.create.selectGroup", {
                    defaultValue: "Select a group",
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {(groups ?? []).map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>
              {t("chessTournament.create.classroom", { defaultValue: "Classroom (optional)" })}
            </Label>
            <Select value={classroomId} onValueChange={setClassroomId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("chessTournament.create.selectClassroom", {
                    defaultValue: "Select a classroom",
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {(teachingClassrooms ?? []).map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>
              {t("chessTournament.create.timeControl", { defaultValue: "Time control" })}
            </Label>
            <Select value={timeControlId} onValueChange={setTimeControlId}>
              <SelectTrigger className="w-40">
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
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={rated} onCheckedChange={setRated} />
            <span className="text-sm">
              {t("chessTournament.create.rated", { defaultValue: "Rated" })}
            </span>
          </div>

          <Tabs value={format} onValueChange={(value) => setFormat(value as ChessTournamentFormat)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value={CHESS_TOURNAMENT_FORMATS.BULK_PAIRING}>
                {t("chessTournament.format.bulkPairing", { defaultValue: "Bulk pairing" })}
              </TabsTrigger>
              <TabsTrigger value={CHESS_TOURNAMENT_FORMATS.SWISS}>
                {t("chessTournament.format.swiss", { defaultValue: "Swiss" })}
              </TabsTrigger>
              <TabsTrigger value={CHESS_TOURNAMENT_FORMATS.ARENA}>
                {t("chessTournament.format.arena", { defaultValue: "Arena" })}
              </TabsTrigger>
              <TabsTrigger value={CHESS_TOURNAMENT_FORMATS.SIMUL}>
                {t("chessTournament.format.simul", { defaultValue: "Simul" })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={CHESS_TOURNAMENT_FORMATS.BULK_PAIRING} className="space-y-4 pt-4">
              <p className="body-sm text-neutral-600">
                {t("chessTournament.create.bulkPairingHelp", {
                  defaultValue:
                    "Instantly pairs every member of the group by current rating and starts games right away.",
                })}
              </p>
              <Button disabled={isBulkPairing || !groupId} onClick={() => void handleBulkPairing()}>
                {t("chessTournament.create.pairNow", { defaultValue: "Pair everyone now" })}
              </Button>
            </TabsContent>

            <TabsContent value={CHESS_TOURNAMENT_FORMATS.SWISS} className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="tournament-name">
                  {t("chessTournament.create.name", { defaultValue: "Tournament name" })}
                </Label>
                <Input
                  id="tournament-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="round-count">
                  {t("chessTournament.create.roundCount", { defaultValue: "Number of rounds" })}
                </Label>
                <Input
                  id="round-count"
                  type="number"
                  min={1}
                  max={30}
                  value={roundCount}
                  onChange={(e) => setRoundCount(Number(e.target.value))}
                />
              </div>
              <Button
                disabled={isCreating || !name.trim() || (!groupId && !classroomId)}
                onClick={() => void handleCreateTournament()}
              >
                {t("chessTournament.create.submit", { defaultValue: "Create tournament" })}
              </Button>
            </TabsContent>

            <TabsContent value={CHESS_TOURNAMENT_FORMATS.ARENA} className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="arena-name">
                  {t("chessTournament.create.name", { defaultValue: "Tournament name" })}
                </Label>
                <Input id="arena-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration-minutes">
                  {t("chessTournament.create.durationMinutes", {
                    defaultValue: "Duration (minutes)",
                  })}
                </Label>
                <Input
                  id="duration-minutes"
                  type="number"
                  min={1}
                  max={24 * 60}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
              </div>
              <Button
                disabled={isCreating || !name.trim() || (!groupId && !classroomId)}
                onClick={() => void handleCreateTournament()}
              >
                {t("chessTournament.create.submit", { defaultValue: "Create tournament" })}
              </Button>
            </TabsContent>

            <TabsContent value={CHESS_TOURNAMENT_FORMATS.SIMUL} className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="simul-name">
                  {t("chessTournament.create.name", { defaultValue: "Tournament name" })}
                </Label>
                <Input id="simul-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <p className="body-sm text-neutral-600">
                {t("chessTournament.create.simulHelp", {
                  defaultValue: "You'll play one board against every member of this group at once.",
                })}
              </p>
              <Button
                disabled={isCreating || !name.trim() || (!groupId && !classroomId)}
                onClick={() => void handleCreateTournament()}
              >
                {t("chessTournament.create.submit", { defaultValue: "Create tournament" })}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
