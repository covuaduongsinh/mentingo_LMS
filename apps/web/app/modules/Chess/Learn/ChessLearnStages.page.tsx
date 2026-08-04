import { Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";

import { useChessLearnStages } from "~/api/queries/useChessLearnStages";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { LearnStars } from "~/modules/Chess/Learn/LearnStars";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessLearnStages");

export default function ChessLearnStagesPage() {
  const { t } = useTranslation();
  const { data: stages, isLoading } = useChessLearnStages();

  const breadcrumbs = [
    { title: t("chessLearn.nav.title", { defaultValue: "Learn chess" }), href: "/chess/learn" },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="space-y-4">
        <div>
          <h1 className="h4 text-neutral-950">
            {t("chessLearn.stages.title", { defaultValue: "Learn chess" })}
          </h1>
          <p className="body-base text-neutral-600">
            {t("chessLearn.stages.subtitle", {
              defaultValue: "Work through each stage, one small step at a time.",
            })}
          </p>
        </div>

        {isLoading ? (
          <p className="text-neutral-600">{t("common.loading", { defaultValue: "Loading…" })}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(stages ?? []).map((stage) => {
              const firstIncomplete =
                stage.levels.find((level) => !level.completed) ?? stage.levels[0];
              const stageStars =
                stage.levels.length === 0
                  ? 0
                  : Math.round(
                      stage.levels.reduce((sum, level) => sum + (level.bestStars ?? 0), 0) /
                        stage.levels.length,
                    );
              return (
                <Link key={stage.id} to={`/chess/learn/${stage.id}/${firstIncomplete?.id ?? ""}`}>
                  <Card className="h-full transition hover:border-primary-400">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2 text-base">
                        <span className="min-w-0 truncate">{stage.label}</span>
                        <Badge
                          variant={
                            stage.completedLevels === stage.totalLevels ? "default" : "outline"
                          }
                        >
                          {stage.completedLevels}/{stage.totalLevels}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="body-sm text-neutral-600">{stage.description}</p>
                      <LearnStars stars={stageStars} size="sm" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
