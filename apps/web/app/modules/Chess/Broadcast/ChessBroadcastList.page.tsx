import { Link } from "@remix-run/react";
import { PERMISSIONS } from "@repo/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateChessBroadcast } from "~/api/mutations/useChessBroadcastMutations";
import { useChessBroadcasts } from "~/api/queries/useChessBroadcasts";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { useCurrentUserStore } from "~/modules/common/store/useCurrentUserStore";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessBroadcast");

const STATUS_BADGE_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  upcoming: "outline",
  live: "default",
  finished: "secondary",
};

function CreateBroadcastForm() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [delayMinutes, setDelayMinutes] = useState(15);
  const { mutateAsync: createBroadcast, isPending } = useCreateChessBroadcast();

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        {t("chessBroadcast.list.create", { defaultValue: "New broadcast" })}
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void createBroadcast({
          name,
          description: description || undefined,
          delayMinutes,
        }).then(() => {
          setIsOpen(false);
          setName("");
          setDescription("");
          setDelayMinutes(15);
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="broadcast-name">
          {t("chessBroadcast.form.name", { defaultValue: "Name" })}
        </Label>
        <Input
          id="broadcast-name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="broadcast-description">
          {t("chessBroadcast.form.description", { defaultValue: "Description" })}
        </Label>
        <Textarea
          id="broadcast-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="broadcast-delay">
          {t("chessBroadcast.form.delayMinutes", { defaultValue: "Broadcast delay (minutes)" })}
        </Label>
        <Input
          id="broadcast-delay"
          type="number"
          min={0}
          max={1440}
          value={delayMinutes}
          onChange={(event) => setDelayMinutes(Number(event.target.value))}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !name}>
          {t("common.save", { defaultValue: "Save" })}
        </Button>
        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
          {t("common.cancel", { defaultValue: "Cancel" })}
        </Button>
      </div>
    </form>
  );
}

export default function ChessBroadcastListPage() {
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((state) => state.currentUser);
  const canManage = currentUser?.permissions.includes(PERMISSIONS.CHESS_BROADCAST_MANAGE) ?? false;
  const { data: broadcasts, isLoading } = useChessBroadcasts();

  const breadcrumbs = [
    {
      title: t("chessBroadcast.nav.title", { defaultValue: "Broadcasts" }),
      href: "/chess/broadcast",
    },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="h4 text-neutral-950">
            {t("chessBroadcast.list.title", { defaultValue: "Tournament broadcasts" })}
          </h1>
          <p className="body-base text-neutral-600">
            {t("chessBroadcast.list.subtitle", {
              defaultValue: "Follow live coverage of real-world tournaments.",
            })}
          </p>
        </div>

        {canManage && <CreateBroadcastForm />}

        {isLoading ? (
          <p className="text-sm text-neutral-500">
            {t("common.loading", { defaultValue: "Loading…" })}
          </p>
        ) : broadcasts?.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {t("chessBroadcast.list.empty", { defaultValue: "No broadcasts yet." })}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {broadcasts?.map((broadcast) => (
              <Link
                key={broadcast.id}
                to={`/chess/broadcast/${broadcast.id}`}
                className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 hover:border-primary-500"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="body-lg-md text-neutral-950">{broadcast.name}</p>
                  <Badge variant={STATUS_BADGE_VARIANT[broadcast.status] ?? "outline"}>
                    {t(`chessBroadcast.status.${broadcast.status}`, {
                      defaultValue: broadcast.status,
                    })}
                  </Badge>
                </div>
                {broadcast.description && (
                  <p className="line-clamp-2 text-sm text-neutral-600">{broadcast.description}</p>
                )}
                <p className="text-xs text-neutral-500">
                  {t("chessBroadcast.list.delay", {
                    defaultValue: "{{minutes}} min delay",
                    minutes: broadcast.delayMinutes,
                  })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
