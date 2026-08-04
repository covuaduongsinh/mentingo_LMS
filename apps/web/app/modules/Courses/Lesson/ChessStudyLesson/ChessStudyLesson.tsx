import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { match } from "ts-pattern";

import { useChessStudyLessonForLearner } from "~/api/queries/useChessStudyLessonForLearner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ChessBoard, MoveTreeView } from "~/modules/Chess/board";
import { unflattenMoveTree } from "~/modules/Chess/board/moveTree";
import { useMoveTree } from "~/modules/Chess/board/useMoveTree";
import { ChessStudyGuidedChapter } from "~/modules/Chess/Study/ChessStudyGuidedChapter";
import Loader from "~/modules/common/Loader/Loader";

import type { FlatMoveNode } from "~/modules/Chess/board/moveTree";

type ChessStudyLessonProps = {
  lessonId: string;
};

function ChapterViewer({
  chapter,
}: {
  chapter: NonNullable<
    NonNullable<ReturnType<typeof useChessStudyLessonForLearner>["data"]>["study"]
  >["chapters"][number];
}) {
  const tree = useMemo(
    () => unflattenMoveTree(chapter.rootFen, chapter.moveNodes as FlatMoveNode[]),
    [chapter],
  );
  const orientation =
    chapter.orientation === "black" || chapter.orientation === "white"
      ? chapter.orientation
      : "white";

  return match(chapter.mode)
    .with("gamebook", () => (
      <ChessStudyGuidedChapter tree={tree} concealFromPly={0} orientation={orientation} />
    ))
    .with("conceal", () => (
      <ChessStudyGuidedChapter
        tree={tree}
        concealFromPly={chapter.concealFromPly ?? 0}
        orientation={orientation}
      />
    ))
    .otherwise(() => <ReadOnlyChapter tree={tree} orientation={orientation} />);
}

function ReadOnlyChapter({
  tree,
  orientation,
}: {
  tree: ReturnType<typeof unflattenMoveTree>;
  orientation: "white" | "black";
}) {
  const moveTree = useMoveTree(tree.rootFen, tree);
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
      <ChessBoard
        fen={moveTree.fen}
        size={400}
        orientation={orientation}
        shapes={(moveTree.currentNode?.shapes as never) ?? []}
      />
      <MoveTreeView
        tree={moveTree.tree}
        currentPath={moveTree.path}
        onNavigate={moveTree.goToPath}
        onPromote={moveTree.promote}
        onDelete={moveTree.remove}
        onSetGlyph={moveTree.annotateGlyph}
      />
    </div>
  );
}

/** Student view: loads study embedded in a curriculum lesson (S4). */
export function ChessStudyLesson({ lessonId }: ChessStudyLessonProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useChessStudyLessonForLearner(lessonId);
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>();

  if (isLoading) return <Loader />;
  if (!data) return null;

  if (data.studyMissing || !data.study) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {t("chess.study.lessonStudyMissing", {
          defaultValue: "This chess study is no longer available.",
        })}
      </div>
    );
  }

  const chapters = data.study.chapters;
  const activeId = selectedChapterId ?? data.studyChapterId ?? chapters[0]?.id;
  const activeChapter = chapters.find((chapter) => chapter.id === activeId) ?? chapters[0];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="h5 text-neutral-950">{data.study.title}</h2>
        {data.study.description ? (
          <p className="body-base text-neutral-600">{data.study.description}</p>
        ) : null}
      </div>
      {chapters.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {chapters.map((chapter) => (
            <Button
              key={chapter.id}
              type="button"
              size="sm"
              variant={chapter.id === activeChapter?.id ? "default" : "outline"}
              onClick={() => setSelectedChapterId(chapter.id)}
            >
              {chapter.title}
              {chapter.mode !== "normal" ? (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {chapter.mode}
                </Badge>
              ) : null}
            </Button>
          ))}
        </div>
      ) : null}
      {activeChapter ? <ChapterViewer chapter={activeChapter} /> : null}
    </div>
  );
}
