import { useParams } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useBlockUser,
  useFollowUser,
  useUnblockUser,
  useUnfollowUser,
} from "~/api/mutations/useCommunitySocialMutations";
import { useSendCommunityMessage } from "~/api/mutations/useSendCommunityMessage";
import { useCommunityRelationship } from "~/api/queries/useCommunityRelationship";
import { useCurrentUser } from "~/api/queries/useCurrentUser";
import { usePublicProfile } from "~/api/queries/usePublicProfile";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { useToast } from "~/components/ui/use-toast";

export default function PublicProfilePage() {
  const { username } = useParams();
  const { t } = useTranslation();
  const { data: profile, isLoading, isError } = usePublicProfile(username);
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [isComposingMessage, setIsComposingMessage] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");

  const isOwnProfile = Boolean(currentUser && profile && currentUser.id === profile.userId);
  const { data: relationship } = useCommunityRelationship(
    !isOwnProfile ? profile?.userId : undefined,
  );
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const sendMessage = useSendCommunityMessage();

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

      {currentUser && !isOwnProfile && (
        <div className="flex w-full flex-col items-center gap-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            {relationship?.isBlocking ? (
              <Button
                type="button"
                variant="outline"
                disabled={unblock.isPending}
                onClick={() => unblock.mutate(profile.userId)}
              >
                {t("publicProfileView.actions.unblock", { defaultValue: "Unblock" })}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant={relationship?.isFollowing ? "outline" : "default"}
                  disabled={follow.isPending || unfollow.isPending}
                  onClick={() =>
                    relationship?.isFollowing
                      ? unfollow.mutate(profile.userId)
                      : follow.mutate(profile.userId)
                  }
                >
                  {relationship?.isFollowing
                    ? t("publicProfileView.actions.unfollow", { defaultValue: "Unfollow" })
                    : t("publicProfileView.actions.follow", { defaultValue: "Follow" })}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsComposingMessage((open) => !open)}
                >
                  {t("publicProfileView.actions.message", { defaultValue: "Message" })}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={block.isPending}
                  onClick={() => block.mutate(profile.userId)}
                >
                  {t("publicProfileView.actions.block", { defaultValue: "Block" })}
                </Button>
              </>
            )}
          </div>

          {isComposingMessage && !relationship?.isBlocking && (
            <div className="flex w-full flex-col gap-2">
              <Textarea
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                rows={3}
                placeholder={t("publicProfileView.messagePlaceholder", {
                  defaultValue: "Write a message…",
                })}
              />
              <Button
                type="button"
                disabled={!messageDraft.trim() || sendMessage.isPending}
                onClick={() =>
                  sendMessage.mutate(
                    { recipientUserId: profile.userId, content: messageDraft.trim() },
                    {
                      onSuccess: () => {
                        setMessageDraft("");
                        setIsComposingMessage(false);
                        toast({
                          description: t("publicProfileView.messageSent", {
                            defaultValue: "Message sent",
                          }),
                        });
                      },
                    },
                  )
                }
              >
                {t("publicProfileView.actions.send", { defaultValue: "Send" })}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
