import { CHESS_STUDY_CHAPTER_MODES } from "@repo/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateChessStudyChapter } from "~/api/mutations/useUpdateChessStudyChapter";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { ChessBoard, MoveTreeView } from "~/modules/Chess/board";
import {
  flattenMoveTree,
  movetextFromTree,
  unflattenMoveTree,
} from "~/modules/Chess/board/moveTree";
import { useMoveTree } from "~/modules/Chess/board/useMoveTree";

import type { GetStudyResponse } from "~/api/generated-api";
import type { BoardShape } from "~/modules/Chess/board";

type ChapterData = GetStudyResponse["data"]["chapters"][number];

type ChessStudyChapterEditorProps = {
  studyId: string;
  chapter: ChapterData;
};

export function ChessStudyChapterEditor({ studyId, chapter }: ChessStudyChapterEditorProps) {
  const { t } = useTranslation();
  const { mutateAsync: saveChapter, isPending } = useUpdateChessStudyChapter();

  const initialTree = useMemo(
    () => unflattenMoveTree(chapter.rootFen, chapter.moveNodes),
    [chapter],
  );
  const moveTree = useMoveTree(chapter.rootFen, initialTree);
  const [shapes, setShapes] = useState<BoardShape[]>([]);
  const [title, setTitle] = useState(chapter.title);
  const [practiceGoal, setPracticeGoal] = useState(chapter.practiceGoal ?? "");
  const [concealFromPly, setConcealFromPly] = useState(chapter.concealFromPly ?? 0);
  const [comment, setComment] = useState(moveTree.currentNode?.comment ?? "");

  useEffect(() => {
    setComment(moveTree.currentNode?.comment ?? "");
  }, [moveTree.currentNode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveTree.goToPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveTree.goToNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveTree]);

  const handleMove = (uci: string, fenAfter: string, san: string) => {
    moveTree.playMove({ uci, san, fenAfter });
  };

  const commitComment = () => {
    if (moveTree.path.length > 0) {
      moveTree.annotateComment(moveTree.path, comment);
    }
  };

  const handleSave = async () => {
    commitComment();
    await saveChapter({
      studyId,
      chapterId: chapter.id,
      data: {
        title: title.trim() || chapter.title,
        rootFen: moveTree.tree.rootFen,
        moveNodes: flattenMoveTree(moveTree.tree),
        practiceGoal: practiceGoal.trim() || null,
        concealFromPly: chapter.mode === CHESS_STUDY_CHAPTER_MODES.CONCEAL ? concealFromPly : null,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="space-y-3">
        <ChessBoard
          fen={moveTree.fen}
          interactive
          onMove={handleMove}
          size={400}
          shapes={shapes}
          onShapesChange={setShapes}
        />
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <MoveTreeView
            tree={moveTree.tree}
            currentPath={moveTree.path}
            onNavigate={moveTree.goToPath}
            onPromote={moveTree.promote}
            onDelete={moveTree.remove}
            onSetGlyph={moveTree.annotateGlyph}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {t("chess.study.commentForMove", { defaultValue: "Comment for current move" })}
          </Label>
          <Textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={commitComment}
            disabled={moveTree.path.length === 0}
          />
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="space-y-1">
          <Label>{t("chess.study.fieldTitle", { defaultValue: "Title" })}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t("chess.study.practiceGoal", { defaultValue: "Practice goal" })}</Label>
          <Input
            value={practiceGoal}
            onChange={(e) => setPracticeGoal(e.target.value)}
            placeholder={t("chess.study.practiceGoalPlaceholder", {
              defaultValue: "e.g. Mate in 3",
            })}
          />
        </div>
        {chapter.mode === CHESS_STUDY_CHAPTER_MODES.CONCEAL ? (
          <div className="space-y-1">
            <Label>{t("chess.study.concealFromPly", { defaultValue: "Conceal from ply" })}</Label>
            <Input
              type="number"
              min={0}
              value={concealFromPly}
              onChange={(e) => setConcealFromPly(Number(e.target.value))}
            />
          </div>
        ) : null}
        <Button type="button" onClick={() => void handleSave()} disabled={isPending}>
          {t("common.button.save", { defaultValue: "Save" })}
        </Button>
        <p className="break-all text-xs text-neutral-500">{movetextFromTree(moveTree.tree)}</p>
      </div>
    </div>
  );
}
