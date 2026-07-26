import { Link, useNavigate, useParams } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSubmitChessLearnAttempt } from "~/api/mutations/useSubmitChessLearnAttempt";
import { useChessLearnLevel } from "~/api/queries/useChessLearnLevel";
import { useChessLearnStages } from "~/api/queries/useChessLearnStages";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { ChessBoard } from "~/modules/Chess/board";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessLearnLevel");

export default function ChessLearnLevelPage() {
  const { stageId, levelId } = useParams<{ stageId: string; levelId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!stageId || !levelId) {
    throw new Error(t("chessLearn.errors.notFound", { defaultValue: "Level not found" }));
  }

  const { data: level, isLoading } = useChessLearnLevel(stageId, levelId);
  const { data: stages } = useChessLearnStages();
  const { mutateAsync: submitAttempt, isPending } = useSubmitChessLearnAttempt();

  const [fen, setFen] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);

  const stage = stages?.find((candidate) => candidate.id === stageId);
  const levelIndex = stage?.levels.findIndex((candidate) => candidate.id === levelId) ?? -1;
  const nextLevel = stage && levelIndex >= 0 ? stage.levels[levelIndex + 1] : undefined;

  const handleMove = (uci: string) => {
    submitAttempt({ stageId, levelId, movesUci: [uci] }).then((result) => {
      setFeedback(result.correct ? "correct" : "incorrect");
      if (!result.correct) {
        setFen(level?.fen ?? null); // reset the board back to the start on a wrong try
      }
    });
  };

  const breadcrumbs = [
    { title: t("chessLearn.nav.title", { defaultValue: "Learn chess" }), href: "/chess/learn" },
  ];

  if (isLoading || !level) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p className="body-base text-neutral-600">
          {t("common.loading", { defaultValue: "Loading…" })}
        </p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col items-center gap-4">
        <ChessBoard
          fen={fen ?? level.fen}
          interactive={feedback !== "correct"}
          onMove={handleMove}
          size={400}
        />

        {feedback === "correct" ? (
          <div className="rounded-md border border-green-300 bg-green-50 p-3 text-center">
            <p className="body-base-md text-green-800">
              {t("chessLearn.level.correct", { defaultValue: "Chính xác! Làm tốt lắm." })}
            </p>
            {nextLevel ? (
              <Button
                className="mt-2"
                onClick={() => navigate(`/chess/learn/${stageId}/${nextLevel.id}`)}
              >
                {t("chessLearn.level.next", { defaultValue: "Level tiếp theo" })}
              </Button>
            ) : (
              <Button className="mt-2" asChild>
                <Link to="/chess/learn">
                  {t("chessLearn.level.backToStages", { defaultValue: "Quay lại danh sách" })}
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {feedback === "incorrect" && (
              <p className="body-sm text-red-600">
                {t("chessLearn.level.incorrect", { defaultValue: "Chưa đúng, thử lại nhé." })}
              </p>
            )}
            <Button type="button" variant="outline" onClick={() => setShowHint(true)}>
              {t("chessLearn.level.showHint", { defaultValue: "Xem gợi ý" })}
            </Button>
            {showHint && (
              <p className="body-sm max-w-md text-center text-neutral-600">{level.hint}</p>
            )}
          </div>
        )}

        {isPending && (
          <p className="body-sm text-neutral-500">
            {t("common.loading", { defaultValue: "Loading…" })}
          </p>
        )}
      </div>
    </PageWrapper>
  );
}
