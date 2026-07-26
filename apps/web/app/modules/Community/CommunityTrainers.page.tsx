import { Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";

import { useCommunityTrainers } from "~/api/queries/useCommunityTrainers";
import { PageWrapper } from "~/components/PageWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.communityTrainers");

function initialsOf(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export default function CommunityTrainersPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useCommunityTrainers();

  const breadcrumbs = [
    {
      title: t("communityView.trainers.title", { defaultValue: "Trainer directory" }),
      href: "/community/trainers",
    },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="h4 text-neutral-950">
            {t("communityView.trainers.title", { defaultValue: "Trainer directory" })}
          </h1>
          <p className="body-base text-neutral-600">
            {t("communityView.trainers.subtitle", {
              defaultValue: "Coaches with a public profile in your school/club.",
            })}
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-neutral-500">
            {t("common.loading", { defaultValue: "Loading…" })}
          </p>
        ) : data?.data.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {t("communityView.trainers.empty", { defaultValue: "No public trainer profiles yet." })}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.data.map((trainer) => (
              <Link
                key={trainer.userId}
                to={trainer.username ? `/u/${trainer.username}` : "#"}
                className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-white p-4 text-center hover:border-primary-500"
              >
                <Avatar className="size-16">
                  <AvatarImage src={trainer.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-lg">
                    {initialsOf(trainer.firstName, trainer.lastName)}
                  </AvatarFallback>
                </Avatar>
                <p className="body-lg-md text-neutral-950">
                  {trainer.firstName} {trainer.lastName}
                </p>
                {trainer.bio && (
                  <p className="line-clamp-2 text-sm text-neutral-600">{trainer.bio}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
