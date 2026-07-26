import { useParams } from "@remix-run/react";
import { useTranslation } from "react-i18next";

import { usePublicProfile } from "~/api/queries/usePublicProfile";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

export default function PublicProfilePage() {
  const { username } = useParams();
  const { t } = useTranslation();
  const { data: profile, isLoading, isError } = usePublicProfile(username);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-neutral-500">{t("common.other.loading")}</p>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-y-2">
        <p className="h4 text-neutral-950">{t("publicProfileView.errors.profileNotFound")}</p>
      </div>
    );
  }

  const initials = `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-y-4 px-4 py-16">
      <Avatar className="size-24">
        <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.username} />
        <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-center gap-y-1">
        <h1 className="h4 text-neutral-950">
          {profile.firstName} {profile.lastName}
        </h1>
        <p className="text-neutral-500">@{profile.username}</p>
      </div>
      {profile.bio && (
        <p className="whitespace-pre-wrap text-center text-neutral-800">{profile.bio}</p>
      )}
    </div>
  );
}
