import { useNavigate, useParams } from "@remix-run/react";
import { PERMISSIONS } from "@repo/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCommunityVote,
  useCreateCommunityComment,
  useDeleteCommunityComment,
  useDeleteCommunityPost,
  useSetCommunityPostLocked,
  useSetCommunityPostPinned,
} from "~/api/mutations/useCommunityMutations";
import { useCommunityComments, useCommunityPost } from "~/api/queries/useCommunity";
import { hasPermission } from "~/common/permissions/permission.utils";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { usePermissions } from "~/hooks/usePermissions";

export default function CommunityPostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { permissions } = usePermissions();
  const [comment, setComment] = useState("");

  const { data: post, isLoading } = useCommunityPost(postId);
  const { data: comments } = useCommunityComments(postId);
  const { mutate: vote } = useCommunityVote();
  const { mutate: createComment, isPending: isCommenting } = useCreateCommunityComment();
  const { mutate: deleteComment } = useDeleteCommunityComment();
  const { mutate: deletePost } = useDeleteCommunityPost();
  const { mutate: setPinned } = useSetCommunityPostPinned();
  const { mutate: setLocked } = useSetCommunityPostLocked();

  const canModerate = hasPermission(permissions, PERMISSIONS.COMMUNITY_MODERATE);

  if (isLoading || !post) {
    return (
      <PageWrapper>
        <p className="text-neutral-500">{t("common.other.loading")}</p>
      </PageWrapper>
    );
  }

  const breadcrumbs = [
    { title: t("communityView.header"), href: "/community" },
    { title: post.title, href: `/community/${post.id}` },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs} className="flex flex-col gap-y-6">
      <div className="flex flex-col gap-y-2 rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-x-2">
          {post.pinned && (
            <span className="details-sm rounded bg-primary-100 px-2 py-0.5 text-primary-700">
              {t("communityView.pinned")}
            </span>
          )}
          {post.locked && (
            <span className="details-sm rounded bg-neutral-100 px-2 py-0.5 text-neutral-700">
              {t("communityView.locked")}
            </span>
          )}
          <span className="details-sm rounded bg-neutral-100 px-2 py-0.5 text-neutral-700">
            {t(`communityView.label.${post.label}`)}
          </span>
        </div>
        <h1 className="h4 text-neutral-950">{post.title}</h1>
        <p className="text-sm text-neutral-500">
          {post.authorName ?? t("communityView.deletedAuthor")}
        </p>
        <p className="whitespace-pre-wrap text-neutral-800">{post.content}</p>
        <div className="mt-2 flex items-center gap-x-3">
          <Button
            type="button"
            variant={post.hasVoted ? "default" : "outline"}
            onClick={() => vote({ targetType: "post", targetId: post.id, postId: post.id })}
          >
            {t("communityView.upvotes", { count: post.upvoteCount })}
          </Button>
          {canModerate && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPinned({ id: post.id, pinned: !post.pinned })}
              >
                {post.pinned ? t("communityView.button.unpin") : t("communityView.button.pin")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocked({ id: post.id, locked: !post.locked })}
              >
                {post.locked ? t("communityView.button.unlock") : t("communityView.button.lock")}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            className="ml-auto text-error-600"
            onClick={() => {
              if (!window.confirm(t("communityView.confirm.deletePost"))) return;
              deletePost(post.id, { onSuccess: () => navigate("/community") });
            }}
          >
            {t("common.button.delete")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-y-4">
        <h2 className="body-lg-md text-neutral-950">
          {t("communityView.comments", { count: post.commentCount })}
        </h2>
        {comments?.map((c) => (
          <div
            key={c.id}
            className="flex flex-col gap-y-1 rounded-lg border border-neutral-200 p-4"
          >
            <p className="text-sm text-neutral-500">
              {c.authorName ?? t("communityView.deletedAuthor")}
            </p>
            <p className="whitespace-pre-wrap text-neutral-800">{c.content}</p>
            <div className="flex items-center gap-x-3">
              <Button
                type="button"
                variant={c.hasVoted ? "default" : "outline"}
                onClick={() => vote({ targetType: "comment", targetId: c.id, postId: post.id })}
              >
                {t("communityView.upvotes", { count: c.upvoteCount })}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-error-600"
                onClick={() => {
                  if (!window.confirm(t("communityView.confirm.deleteComment"))) return;
                  deleteComment({ id: c.id, postId: post.id });
                }}
              >
                {t("common.button.delete")}
              </Button>
            </div>
          </div>
        ))}

        {!post.locked ? (
          <div className="flex flex-col gap-y-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("communityView.field.commentPlaceholder")}
              rows={3}
            />
            <Button
              type="button"
              className="w-fit"
              disabled={!comment.trim() || isCommenting}
              onClick={() =>
                createComment(
                  { postId: post.id, content: comment },
                  { onSuccess: () => setComment("") },
                )
              }
            >
              {t("communityView.button.comment")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">{t("communityView.postLockedNotice")}</p>
        )}
      </div>
    </PageWrapper>
  );
}
