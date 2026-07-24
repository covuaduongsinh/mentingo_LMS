import { Link } from "@remix-run/react";
import { CHESS_TOPIC_LABELS, CHESS_TOPIC_LIST, type ChessTopic } from "@repo/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useChessExercises } from "~/api/queries/useChessExercises";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessPractice");

export default function ChessPracticePage() {
  const { t } = useTranslation();
  const [topic, setTopic] = useState<string>("all");

  const { data, isLoading } = useChessExercises({
    page: 1,
    perPage: 40,
    publishedOnly: true,
    topic: topic === "all" ? undefined : (topic as ChessTopic),
  });

  const exercises = data?.data ?? [];

  const breadcrumbs = useMemo(
    () => [
      {
        title: t("chess.nav.practice", { defaultValue: "Chess practice" }),
        href: "/chess/practice",
      },
    ],
    [t],
  );

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h4 text-neutral-950">
              {t("chess.practice.title", { defaultValue: "Practice hub" })}
            </h1>
            <p className="body-base text-neutral-600">
              {t("chess.practice.subtitle", {
                defaultValue:
                  "Train by topic: tactics, endgames, rules, strategy, and teacher-track knowledge.",
              })}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/chess/games">
              {t("chess.nav.gameLibrary", { defaultValue: "Game library" })}
            </Link>
          </Button>
        </div>

        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("chess.admin.allTopics", { defaultValue: "All topics" })}
            </SelectItem>
            {CHESS_TOPIC_LIST.map((item) => (
              <SelectItem key={item} value={item}>
                {CHESS_TOPIC_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading ? (
          <p>{t("common.loading", { defaultValue: "Loading…" })}</p>
        ) : exercises.length === 0 ? (
          <p className="text-neutral-600">
            {t("chess.practice.empty", {
              defaultValue: "No published exercises yet. Ask your teacher to publish some.",
            })}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {exercises.map((exercise) => (
              <Link
                key={exercise.id}
                to={`/chess/practice/${exercise.id}`}
                className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-primary-300"
              >
                <h2 className="h6 mb-2 text-neutral-950">{exercise.title}</h2>
                <div className="mb-2 flex flex-wrap gap-1">
                  {exercise.topics.map((item) => (
                    <Badge key={item} variant="secondary">
                      {CHESS_TOPIC_LABELS[item] ?? item}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">
                  {t("chess.admin.difficulty", { defaultValue: "Difficulty" })}:{" "}
                  {exercise.difficulty}/10 · {exercise.format}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
