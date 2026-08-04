import { Link } from "@remix-run/react";
import { CHESS_TOPIC_LABELS, CHESS_TOPIC_LIST, type ChessTopic } from "@repo/shared";
import { Copy, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCloneChessStudy } from "~/api/mutations/useCloneChessStudy";
import { useCreateChessStudy } from "~/api/mutations/useCreateChessStudy";
import { useChessStudies } from "~/api/queries/useChessStudies";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessStudies");

const emptyForm = {
  title: "",
  description: "",
  visibility: "private" as "public" | "private",
  topics: [] as ChessTopic[],
};

export default function ChessStudyListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<ChessTopic | "all">("all");
  const [scope, setScope] = useState<"all" | "mine" | "shared">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useChessStudies({
    page: 1,
    perPage: 50,
    search: search || undefined,
    topic: topic === "all" ? undefined : topic,
    mine: scope === "mine" || undefined,
    // generated-api may not know `shared` until swagger refresh — cast at call site
    ...(scope === "shared" ? ({ shared: true } as { shared?: boolean }) : {}),
  } as Parameters<typeof useChessStudies>[0]);

  const { mutateAsync: createStudy, isPending: isCreating } = useCreateChessStudy();
  const { mutateAsync: cloneStudy } = useCloneChessStudy();

  const studies = data?.data ?? [];

  const breadcrumbs = useMemo(
    () => [{ title: t("chess.nav.studies", { defaultValue: "Studies" }), href: "/chess/studies" }],
    [t],
  );

  const toggleTopic = (value: ChessTopic) => {
    setForm((prev) => ({
      ...prev,
      topics: prev.topics.includes(value)
        ? prev.topics.filter((item) => item !== value)
        : [...prev.topics, value],
    }));
  };

  const handleCreate = async () => {
    const study = await createStudy({
      title: form.title.trim(),
      description: form.description.trim() || null,
      visibility: form.visibility,
      topics: form.topics,
    });
    setForm(emptyForm);
    setOpen(false);
    window.location.assign(`/chess/studies/${study.id}`);
  };

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h4 text-neutral-950">
              {t("chess.study.title", { defaultValue: "Studies" })}
            </h1>
            <p className="body-base text-neutral-600">
              {t("chess.study.subtitle", {
                defaultValue: "Multi-chapter chess lessons you can save, share, and replay.",
              })}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="chess-study-create-button">
                <Plus className="mr-2 size-4" />
                {t("chess.study.create", { defaultValue: "New study" })}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("chess.study.create", { defaultValue: "New study" })}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="space-y-1">
                  <Label>{t("chess.study.fieldTitle", { defaultValue: "Title" })}</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    {t("chess.study.fieldDescription", { defaultValue: "Description" })}
                  </Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("chess.study.visibility", { defaultValue: "Visibility" })}</Label>
                  <Select
                    value={form.visibility}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, visibility: value as "public" | "private" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">
                        {t("chess.study.visibilityPrivate", { defaultValue: "Private" })}
                      </SelectItem>
                      <SelectItem value="public">
                        {t("chess.study.visibilityPublic", { defaultValue: "Public" })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("chess.study.topics", { defaultValue: "Topics" })}</Label>
                  <div className="flex flex-wrap gap-1">
                    {CHESS_TOPIC_LIST.map((topicOption) => (
                      <Badge
                        key={topicOption}
                        variant={form.topics.includes(topicOption) ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleTopic(topicOption)}
                      >
                        {CHESS_TOPIC_LABELS[topicOption]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!form.title.trim() || isCreating}>
                  {t("common.button.save", { defaultValue: "Save" })}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="max-w-xs"
            placeholder={t("chess.study.search", { defaultValue: "Search studies…" })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={topic} onValueChange={(value) => setTopic(value as ChessTopic | "all")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("chess.study.allTopics", { defaultValue: "All topics" })}
              </SelectItem>
              {CHESS_TOPIC_LIST.map((topicOption) => (
                <SelectItem key={topicOption} value={topicOption}>
                  {CHESS_TOPIC_LABELS[topicOption]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Select value={scope} onValueChange={(value) => setScope(value as typeof scope)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("chess.study.scopeAll", { defaultValue: "All visible" })}
                </SelectItem>
                <SelectItem value="mine">
                  {t("chess.study.scopeMine", { defaultValue: "My studies" })}
                </SelectItem>
                <SelectItem value="shared">
                  {t("chess.study.scopeShared", { defaultValue: "Shared with me" })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-neutral-600">{t("common.loading", { defaultValue: "Loading…" })}</p>
        ) : studies.length === 0 ? (
          <p className="text-neutral-600">
            {t("chess.study.empty", { defaultValue: "No studies yet." })}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {studies.map((study) => (
              <div
                key={study.id}
                className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-primary-300"
              >
                <Link to={`/chess/studies/${study.id}`} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="h6">{study.title}</h2>
                    <Badge variant={study.visibility === "public" ? "default" : "outline"}>
                      {study.visibility === "public"
                        ? t("chess.study.visibilityPublic", { defaultValue: "Public" })
                        : t("chess.study.visibilityPrivate", { defaultValue: "Private" })}
                    </Badge>
                  </div>
                  {study.description ? (
                    <p className="line-clamp-2 text-sm text-neutral-600">{study.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-1">
                    {study.topics.map((topicValue) => (
                      <Badge key={topicValue} variant="secondary">
                        {CHESS_TOPIC_LABELS[topicValue] ?? topicValue}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {t("chess.study.chapterCount", {
                      count: study.chapterCount,
                      defaultValue: "{{count}} chapters",
                    })}
                  </p>
                </Link>
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" onClick={() => void cloneStudy(study.id)}>
                    <Copy className="mr-2 size-4" />
                    {t("chess.study.clone", { defaultValue: "Clone" })}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
