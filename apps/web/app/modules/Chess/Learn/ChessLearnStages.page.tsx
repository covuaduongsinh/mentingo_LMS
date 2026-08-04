import { Link } from "@remix-run/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiClient } from "~/api/api-client";
import {
  CHESS_LEARN_STAGES_QUERY_KEY,
  useChessLearnStages,
} from "~/api/queries/useChessLearnStages";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { LearnStars } from "~/modules/Chess/Learn/LearnStars";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessLearnStages");

export default function ChessLearnStagesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useChessLearnStages();
  const categories = data?.categories ?? [];
  const stages = data?.stages ?? [];
  const sequentialLock = data?.sequentialLock ?? false;

  const resetProgress = useMutation({
    mutationFn: async () => {
      await ApiClient.api.chessLearnControllerResetLearnProgress();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHESS_LEARN_STAGES_QUERY_KEY });
    },
  });

  const breadcrumbs = [
    { title: t("chessLearn.nav.title", { defaultValue: "Learn chess" }), href: "/chess/learn" },
  ];

  const renderStageCard = (stage: (typeof stages)[number]) => {
    const firstIncomplete = stage.levels.find((level) => !level.completed) ?? stage.levels[0];
    const stageStars =
      stage.levels.length === 0
        ? 0
        : Math.round(
            stage.levels.reduce((sum, level) => sum + (level.bestStars ?? 0), 0) /
              stage.levels.length,
          );

    const content = (
      <Card
        className={`h-full transition ${stage.locked ? "opacity-60" : "hover:border-primary-400"}`}
        data-testid={`chess-learn-stage-${stage.id}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="min-w-0 truncate">{stage.label}</span>
            <Badge variant={stage.completedLevels === stage.totalLevels ? "default" : "outline"}>
              {stage.completedLevels}/{stage.totalLevels}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="body-sm text-neutral-600">{stage.description}</p>
          {stage.locked ? (
            <p className="body-sm text-amber-700">
              {t("chessLearn.stages.locked", {
                defaultValue: "Hoàn thành stage trước để mở khóa",
              })}
            </p>
          ) : (
            <LearnStars stars={stageStars} size="sm" />
          )}
        </CardContent>
      </Card>
    );

    if (stage.locked) {
      return (
        <div key={stage.id} aria-disabled>
          {content}
        </div>
      );
    }

    return (
      <Link key={stage.id} to={`/chess/learn/${stage.id}/${firstIncomplete?.id ?? ""}`}>
        {content}
      </Link>
    );
  };

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <h1 className="h4 text-neutral-950" data-testid="chess-learn-title">
            {t("chessLearn.stages.title", { defaultValue: "Learn chess" })}
          </h1>
          <p className="body-base text-neutral-600">
            {t("chessLearn.stages.subtitle", {
              defaultValue: "Work through each stage, one small step at a time.",
            })}
          </p>
          {sequentialLock && (
            <p className="body-sm mt-1 text-neutral-500">
              {t("chessLearn.stages.sequentialHint", {
                defaultValue: "Các stage mở lần lượt theo thứ tự.",
              })}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            disabled={resetProgress.isPending}
            onClick={() => {
              if (
                window.confirm(
                  t("chessLearn.stages.resetConfirm", {
                    defaultValue: "Xóa toàn bộ tiến độ Learn của bạn?",
                  }),
                )
              ) {
                resetProgress.mutate();
              }
            }}
          >
            {t("chessLearn.stages.reset", { defaultValue: "Đặt lại tiến độ" })}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-neutral-600">{t("common.loading", { defaultValue: "Loading…" })}</p>
        ) : categories.length > 0 ? (
          categories.map((category) => (
            <section key={category.id} className="space-y-3">
              <div>
                <h2 className="h5 text-neutral-900">{category.label}</h2>
                <p className="body-sm text-neutral-600">{category.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {category.stages.map(renderStageCard)}
              </div>
            </section>
          ))
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stages.map(renderStageCard)}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
