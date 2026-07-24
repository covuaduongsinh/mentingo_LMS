import { Link } from "@remix-run/react";
import {
  CHESS_AUDIENCES,
  CHESS_EXERCISE_FORMATS,
  CHESS_TOPIC_LABELS,
  CHESS_TOPIC_LIST,
  type ChessAudience,
  type ChessExerciseFormat,
  type ChessTopic,
} from "@repo/shared";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateChessExercise } from "~/api/mutations/useCreateChessExercise";
import { useDeleteChessExercise } from "~/api/mutations/useDeleteChessExercise";
import { useUpdateChessExercise } from "~/api/mutations/useUpdateChessExercise";
import { useChessExercises } from "~/api/queries/useChessExercises";
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

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessExercises");

const emptyForm = {
  title: "",
  format: CHESS_EXERCISE_FORMATS.CHESS_FIND_BEST as ChessExerciseFormat,
  audience: CHESS_AUDIENCES.STUDENT as ChessAudience,
  topic: "tactics" as ChessTopic,
  difficulty: 3,
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  solutionMoves: "",
  explanation: "",
  published: false,
};

export default function ChessExercisesAdminPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useChessExercises({
    page: 1,
    perPage: 50,
    search: search || undefined,
    topic: topicFilter === "all" ? undefined : (topicFilter as ChessTopic),
  });

  const { mutateAsync: createExercise, isPending: isCreating } = useCreateChessExercise();
  const { mutateAsync: updateExercise, isPending: isUpdating } = useUpdateChessExercise();
  const { mutateAsync: deleteExercise } = useDeleteChessExercise();

  const exercises = data?.data ?? [];

  const breadcrumbs = useMemo(
    () => [
      {
        title: t("chess.nav.adminBanks", { defaultValue: "Chess banks" }),
        href: "/admin/chess/exercises",
      },
      {
        title: t("chess.nav.exercises", { defaultValue: "Exercise bank" }),
        href: "/admin/chess/exercises",
      },
    ],
    [t],
  );

  const handleCreate = async () => {
    await createExercise({
      title: form.title.trim(),
      format: form.format,
      audience: form.audience,
      topics: [form.topic],
      difficulty: form.difficulty,
      fen: form.fen.trim() || null,
      solution: {
        movesUci: form.solutionMoves.trim().split(/\s+/).filter(Boolean),
      },
      explanation: form.explanation.trim() || null,
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
              {t("chess.admin.exercisesTitle", { defaultValue: "Exercise bank" })}
            </h1>
            <p className="body-base text-neutral-600">
              {t("chess.admin.exercisesSubtitle", {
                defaultValue:
                  "Reusable drills and knowledge checks across tactics, rules, pedagogy, and more.",
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/chess/games">
                {t("chess.nav.games", { defaultValue: "Game bank" })}
              </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" />
                  {t("chess.admin.addExercise", { defaultValue: "Add exercise" })}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {t("chess.admin.addExercise", { defaultValue: "Add exercise" })}
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
                      <Label>{t("chess.admin.format", { defaultValue: "Format" })}</Label>
                      <Select
                        value={form.format}
                        onValueChange={(value) =>
                          setForm((prev) => ({ ...prev, format: value as ChessExerciseFormat }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(CHESS_EXERCISE_FORMATS).map((format) => (
                            <SelectItem key={format} value={format}>
                              {format}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t("chess.admin.audience", { defaultValue: "Audience" })}</Label>
                      <Select
                        value={form.audience}
                        onValueChange={(value) =>
                          setForm((prev) => ({ ...prev, audience: value as ChessAudience }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(CHESS_AUDIENCES).map((audience) => (
                            <SelectItem key={audience} value={audience}>
                              {audience}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                      <Label>{t("chess.admin.difficulty", { defaultValue: "Difficulty" })}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={form.difficulty}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            difficulty: Number(e.target.value) || 1,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("chess.author.fen", { defaultValue: "FEN" })}</Label>
                    <Textarea
                      className="font-mono text-xs"
                      value={form.fen}
                      onChange={(e) => setForm((prev) => ({ ...prev, fen: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("chess.author.solutionUci", { defaultValue: "Solution UCI" })}</Label>
                    <Input
                      className="font-mono"
                      value={form.solutionMoves}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, solutionMoves: e.target.value }))
                      }
                      placeholder="e2e4"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("chess.admin.explanation", { defaultValue: "Explanation" })}</Label>
                    <Textarea
                      value={form.explanation}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, explanation: e.target.value }))
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
                  <Button onClick={handleCreate} disabled={!form.title.trim() || isCreating}>
                    {t("common.button.save", { defaultValue: "Save" })}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            className="max-w-xs"
            placeholder={t("chess.admin.search", { defaultValue: "Search…" })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("chess.admin.allTopics", { defaultValue: "All topics" })}
              </SelectItem>
              {CHESS_TOPIC_LIST.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {CHESS_TOPIC_LABELS[topic]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-neutral-600">{t("common.loading", { defaultValue: "Loading…" })}</p>
        ) : exercises.length === 0 ? (
          <p className="text-neutral-600">
            {t("chess.admin.emptyExercises", { defaultValue: "No exercises yet." })}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="p-3">{t("chess.admin.fieldTitle", { defaultValue: "Title" })}</th>
                  <th className="p-3">{t("chess.admin.topic", { defaultValue: "Topic" })}</th>
                  <th className="p-3">{t("chess.admin.format", { defaultValue: "Format" })}</th>
                  <th className="p-3">{t("chess.admin.status", { defaultValue: "Status" })}</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {exercises.map((exercise) => (
                  <tr key={exercise.id} className="border-t border-neutral-100">
                    <td className="p-3 font-medium text-neutral-900">{exercise.title}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {exercise.topics.map((topic) => (
                          <Badge key={topic} variant="secondary">
                            {CHESS_TOPIC_LABELS[topic] ?? topic}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs">{exercise.format}</td>
                    <td className="p-3">
                      <Badge variant={exercise.published ? "default" : "outline"}>
                        {exercise.published
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
                            updateExercise({
                              id: exercise.id,
                              data: { published: !exercise.published },
                            })
                          }
                        >
                          {exercise.published
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
                              void deleteExercise(exercise.id);
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
