import { Link } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateCommunityPost } from "~/api/mutations/useCommunityMutations";
import { useCommunityPosts } from "~/api/queries/useCommunity";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

const LABELS = ["general_discussion", "question", "announcement", "showcase", "feedback"] as const;

export default function CommunityPage() {
  const { t } = useTranslation();
  const [label, setLabel] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<"newest" | "top">("newest");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newPostLabel, setNewPostLabel] = useState<(typeof LABELS)[number]>("general_discussion");

  const { data, isLoading } = useCommunityPosts({
    label: label as never,
    sort,
    page: 1,
    perPage: 20,
  });
  const { mutate: createPost, isPending } = useCreateCommunityPost();

  const handleCreate = () => {
    createPost(
      { title, content, label: newPostLabel },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setTitle("");
          setContent("");
        },
      },
    );
  };

  const breadcrumbs = [{ title: t("communityView.header"), href: "/community" }];

  return (
    <PageWrapper breadcrumbs={breadcrumbs} className="flex flex-col gap-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h4 text-neutral-950">{t("communityView.header")}</h1>
        <Button onClick={() => setIsCreateOpen(true)}>{t("communityView.button.newPost")}</Button>
      </div>

      <div className="flex gap-x-4">
        <Select value={label ?? "all"} onValueChange={(v) => setLabel(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("communityView.filter.allLabels")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("communityView.filter.allLabels")}</SelectItem>
            {LABELS.map((l) => (
              <SelectItem key={l} value={l}>
                {t(`communityView.label.${l}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as "newest" | "top")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("communityView.sort.newest")}</SelectItem>
            <SelectItem value="top">{t("communityView.sort.top")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-y-3">
        {isLoading && <p className="text-neutral-500">{t("common.other.loading")}</p>}
        {!isLoading && data?.data.length === 0 && (
          <p className="text-neutral-500">{t("communityView.empty")}</p>
        )}
        {data?.data.map((post) => (
          <Link
            key={post.id}
            to={`/community/${post.id}`}
            className="flex flex-col gap-y-1 rounded-lg border border-neutral-200 bg-white p-4 hover:border-primary-500"
          >
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
            <h2 className="body-lg-md text-neutral-950">{post.title}</h2>
            <div className="flex gap-x-4 text-sm text-neutral-500">
              <span>{post.authorName ?? t("communityView.deletedAuthor")}</span>
              <span>
                {t("communityView.upvotes", { count: post.upvoteCount })} ·{" "}
                {t("communityView.comments", { count: post.commentCount })}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogOverlay className="bg-primary-400 opacity-65" />
        <DialogContent className="max-w-lg p-8">
          <DialogTitle className="text-xl font-semibold text-neutral-900">
            {t("communityView.button.newPost")}
          </DialogTitle>
          <div className="flex flex-col gap-y-4">
            <div className="flex flex-col gap-y-2">
              <Label>{t("communityView.field.label")}</Label>
              <Select
                value={newPostLabel}
                onValueChange={(v) => setNewPostLabel(v as (typeof LABELS)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {t(`communityView.label.${l}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-y-2">
              <Label>{t("communityView.field.title")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label>{t("communityView.field.content")}</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
            </div>
            <Button
              type="button"
              disabled={!title.trim() || !content.trim() || isPending}
              onClick={handleCreate}
            >
              {t("communityView.button.publish")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
