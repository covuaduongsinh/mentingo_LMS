import { Link } from "@remix-run/react";
import {
  CHESS_GAME_LEVELS,
  CHESS_TOPIC_LABELS,
  CHESS_TOPIC_LIST,
  type ChessGameLevel,
  type ChessTopic,
} from "@repo/shared";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateChessGame } from "~/api/mutations/useCreateChessGame";
import { useDeleteChessGame } from "~/api/mutations/useDeleteChessGame";
import { useUpdateChessGame } from "~/api/mutations/useUpdateChessGame";
import { useChessGames } from "~/api/queries/useChessGames";
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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessGames");

const SAMPLE_PGN = `[Event "Scholar's Mate illustration"]
[Result "*"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# *`;

const emptyForm = {
  title: "",
  pgn: SAMPLE_PGN,
  topic: "story" as ChessTopic,
  level: CHESS_GAME_LEVELS.BEGINNER as ChessGameLevel,
  teachingNotes: "",
  published: false,
};

export default function ChessGamesAdminPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useChessGames({
    page: 1,
    perPage: 50,
    search: search || undefined,
  });

  const { mutateAsync: createGame, isPending: isCreating } = useCreateChessGame();
  const { mutateAsync: updateGame, isPending: isUpdating } = useUpdateChessGame();
  const { mutateAsync: deleteGame } = useDeleteChessGame();

  const games = data?.data ?? [];

  const breadcrumbs = useMemo(
    () => [
      {
        title: t("chess.nav.adminBanks", { defaultValue: "Chess banks" }),
        href: "/admin/chess/games",
      },
      { title: t("chess.nav.games", { defaultValue: "Game bank" }), href: "/admin/chess/games" },
    ],
    [t],
  );

  const handleCreate = async () => {
    await createGame({
      title: form.title.trim(),
      pgn: form.pgn.trim(),
      topics: [form.topic],
      level: form.level,
      teachingNotes: form.teachingNotes.trim() || null,
      published: form.published,
    });
    setForm(emptyForm);
    setOpen(false);
  };

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h4 text-neutral-950">
              {t("chess.admin.gamesTitle", { defaultValue: "Game bank" })}
            </h1>
            <p className="body-base text-neutral-600">
              {t("chess.admin.gamesSubtitle", {
                defaultValue: "PGN games with teaching notes for lessons and demos.",
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/chess/exercises">
                {t("chess.nav.exercises", { defaultValue: "Exercise bank" })}
              </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="chess-admin-add-game-button">
                  <Plus className="mr-2 size-4" />
                  {t("chess.admin.addGame", { defaultValue: "Add game" })}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {t("chess.admin.addGame", { defaultValue: "Add game" })}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="space-y-1">
                    <Label>{t("chess.admin.fieldTitle", { defaultValue: "Title" })}</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t("chess.admin.topic", { defaultValue: "Topic" })}</Label>
                      <Select
                        value={form.topic}
                        onValueChange={(value) =>
                          setForm((prev) => ({ ...prev, topic: value as ChessTopic }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHESS_TOPIC_LIST.map((topic) => (
                            <SelectItem key={topic} value={topic}>
                              {CHESS_TOPIC_LABELS[topic]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t("chess.admin.level", { defaultValue: "Level" })}</Label>
                      <Select
                        value={form.level}
                        onValueChange={(value) =>
                          setForm((prev) => ({ ...prev, level: value as ChessGameLevel }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(CHESS_GAME_LEVELS).map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>PGN</Label>
                    <Textarea
                      className="min-h-32 font-mono text-xs"
                      value={form.pgn}
                      onChange={(e) => setForm((prev) => ({ ...prev, pgn: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      {t("chess.admin.teachingNotes", { defaultValue: "Teaching notes" })}
                    </Label>
                    <Textarea
                      value={form.teachingNotes}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, teachingNotes: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.published}
                      onCheckedChange={(published) => setForm((prev) => ({ ...prev, published }))}
                    />
                    <Label>{t("chess.admin.published", { defaultValue: "Published" })}</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreate}
                    disabled={!form.title.trim() || !form.pgn.trim() || isCreating}
                  >
                    {t("common.button.save", { defaultValue: "Save" })}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Input
          className="max-w-xs"
          placeholder={t("chess.admin.search", { defaultValue: "Search…" })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isLoading ? (
          <p className="text-neutral-600">{t("common.loading", { defaultValue: "Loading…" })}</p>
        ) : games.length === 0 ? (
          <p className="text-neutral-600">
            {t("chess.admin.emptyGames", { defaultValue: "No games yet." })}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="p-3">{t("chess.admin.fieldTitle", { defaultValue: "Title" })}</th>
                  <th className="p-3">{t("chess.admin.topic", { defaultValue: "Topic" })}</th>
                  <th className="p-3">{t("chess.admin.level", { defaultValue: "Level" })}</th>
                  <th className="p-3">{t("chess.admin.status", { defaultValue: "Status" })}</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id} className="border-t border-neutral-100">
                    <td className="p-3 font-medium">{game.title}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {game.topics.map((topic) => (
                          <Badge key={topic} variant="secondary">
                            {CHESS_TOPIC_LABELS[topic] ?? topic}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">{game.level}</td>
                    <td className="p-3">
                      <Badge variant={game.published ? "default" : "outline"}>
                        {game.published
                          ? t("chess.admin.published", { defaultValue: "Published" })
                          : t("chess.admin.draft", { defaultValue: "Draft" })}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                          onClick={() =>
                            updateGame({
                              id: game.id,
                              data: { published: !game.published },
                            })
                          }
                        >
                          {game.published
                            ? t("chess.admin.unpublish", { defaultValue: "Unpublish" })
                            : t("chess.admin.publish", { defaultValue: "Publish" })}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (
                              window.confirm(
                                t("chess.admin.confirmDelete", {
                                  defaultValue: "Delete this item?",
                                }),
                              )
                            ) {
                              void deleteGame(game.id);
                            }
                          }}
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
