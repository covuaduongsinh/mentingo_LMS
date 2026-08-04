import {
  CHESS_PRACTICE_GOAL_TYPES,
  CHESS_STUDY_CHAPTER_MODES,
  CHESS_STUDY_ORIENTATIONS,
  type ChessPracticeGoalType,
  type ChessStudyOrientation,
} from "@repo/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateChessStudyChapter } from "~/api/mutations/useUpdateChessStudyChapter";
import { Button } from "~/components/ui/button";
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
  const [shapes, setShapes] = useState<BoardShape[]>(
    () => (moveTree.currentNode?.shapes as BoardShape[] | undefined) ?? [],
  );
  const [title, setTitle] = useState(chapter.title);
  const [description, setDescription] = useState(
    "description" in chapter && typeof chapter.description === "string" ? chapter.description : "",
  );
  const [orientation, setOrientation] = useState<ChessStudyOrientation>(
    "orientation" in chapter &&
      (chapter.orientation === CHESS_STUDY_ORIENTATIONS.BLACK ||
        chapter.orientation === CHESS_STUDY_ORIENTATIONS.WHITE)
      ? chapter.orientation
      : CHESS_STUDY_ORIENTATIONS.WHITE,
  );
  const [practiceGoal, setPracticeGoal] = useState(chapter.practiceGoal ?? "");
  const [practiceGoalType, setPracticeGoalType] = useState<"none" | ChessPracticeGoalType>(
    chapter.practiceGoalType ?? "none",
  );
  const [practiceGoalTargetValue, setPracticeGoalTargetValue] = useState(
    chapter.practiceGoalTargetValue ?? 0,
  );
  const [concealFromPly, setConcealFromPly] = useState(chapter.concealFromPly ?? 0);
  const [comment, setComment] = useState(moveTree.currentNode?.comment ?? "");
  const [hint, setHint] = useState(moveTree.currentNode?.hint ?? "");
  const [onWrong, setOnWrong] = useState(moveTree.currentNode?.onWrong ?? "");
  const [onCorrect, setOnCorrect] = useState(moveTree.currentNode?.onCorrect ?? "");

  // When navigating, load that node's shapes + coaching fields into local edit state.
  useEffect(() => {
    setComment(moveTree.currentNode?.comment ?? "");
    setShapes((moveTree.currentNode?.shapes as BoardShape[] | undefined) ?? []);
    setHint(moveTree.currentNode?.hint ?? "");
    setOnWrong(moveTree.currentNode?.onWrong ?? "");
    setOnCorrect(moveTree.currentNode?.onCorrect ?? "");
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

  const commitNodeAnnotations = () => {
    if (moveTree.path.length === 0) return;
    moveTree.annotateComment(moveTree.path, comment);
    moveTree.annotateShapes(moveTree.path, shapes);
    moveTree.annotateGamebook(moveTree.path, { hint, onWrong, onCorrect });
  };

  const handleShapesChange = (next: BoardShape[]) => {
    setShapes(next);
    if (moveTree.path.length > 0) {
      moveTree.annotateShapes(moveTree.path, next);
    }
  };

  const handleSave = async () => {
    commitNodeAnnotations();
    await saveChapter({
      studyId,
      chapterId: chapter.id,
      data: {
        title: title.trim() || chapter.title,
        rootFen: moveTree.tree.rootFen,
        moveNodes: flattenMoveTree(moveTree.tree),
        practiceGoal: practiceGoal.trim() || null,
        practiceGoalType: practiceGoalType === "none" ? null : practiceGoalType,
        practiceGoalTargetValue: practiceGoalType === "none" ? null : practiceGoalTargetValue,
        concealFromPly: chapter.mode === CHESS_STUDY_CHAPTER_MODES.CONCEAL ? concealFromPly : null,
        orientation,
        description: description.trim() || null,
      } as Parameters<typeof saveChapter>[0]["data"] & {
        orientation?: ChessStudyOrientation;
        description?: string | null;
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
          onShapesChange={handleShapesChange}
          orientation={orientation}
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
            onBlur={commitNodeAnnotations}
            disabled={moveTree.path.length === 0}
          />
        </div>
        {chapter.mode === CHESS_STUDY_CHAPTER_MODES.GAMEBOOK ? (
          <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs font-semibold text-neutral-700">
              {t("chess.study.gamebookFields", {
                defaultValue: "Gamebook coaching (this move)",
              })}
            </p>
            <div className="space-y-1">
              <Label className="text-xs">{t("chess.study.hint", { defaultValue: "Hint" })}</Label>
              <Textarea
                rows={2}
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                onBlur={commitNodeAnnotations}
                disabled={moveTree.path.length === 0}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                {t("chess.study.onWrong", { defaultValue: "When wrong" })}
              </Label>
              <Textarea
                rows={2}
                value={onWrong}
                onChange={(e) => setOnWrong(e.target.value)}
                onBlur={commitNodeAnnotations}
                disabled={moveTree.path.length === 0}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                {t("chess.study.onCorrect", { defaultValue: "When correct" })}
              </Label>
              <Textarea
                rows={2}
                value={onCorrect}
                onChange={(e) => setOnCorrect(e.target.value)}
                onBlur={commitNodeAnnotations}
                disabled={moveTree.path.length === 0}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="w-full max-w-sm space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="space-y-1">
          <Label>{t("chess.study.fieldTitle", { defaultValue: "Title" })}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t("chess.study.chapterDescription", { defaultValue: "Chapter intro" })}</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("chess.study.chapterDescriptionPlaceholder", {
              defaultValue: "Optional introduction for learners",
            })}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("chess.study.orientation", { defaultValue: "Board orientation" })}</Label>
          <Select
            value={orientation}
            onValueChange={(value) => setOrientation(value as ChessStudyOrientation)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CHESS_STUDY_ORIENTATIONS.WHITE}>
                {t("chess.study.orientationWhite", { defaultValue: "White" })}
              </SelectItem>
              <SelectItem value={CHESS_STUDY_ORIENTATIONS.BLACK}>
                {t("chess.study.orientationBlack", { defaultValue: "Black" })}
              </SelectItem>
            </SelectContent>
          </Select>
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
        <div className="space-y-1">
          <Label>
            {t("chess.study.practiceGoalType", { defaultValue: "Auto-grade this goal as" })}
          </Label>
          <Select
            value={practiceGoalType}
            onValueChange={(value) => setPracticeGoalType(value as "none" | ChessPracticeGoalType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {t("chess.study.practiceGoalTypeNone", { defaultValue: "Not graded" })}
              </SelectItem>
              <SelectItem value={CHESS_PRACTICE_GOAL_TYPES.CHECKMATE_IN_N}>
                {t("chess.study.practiceGoalTypeCheckmate", {
                  defaultValue: "Checkmate within N moves",
                })}
              </SelectItem>
              <SelectItem value={CHESS_PRACTICE_GOAL_TYPES.DRAW}>
                {t("chess.study.practiceGoalTypeDraw", { defaultValue: "Reach a draw" })}
              </SelectItem>
              <SelectItem value={CHESS_PRACTICE_GOAL_TYPES.REACH_MATERIAL_ADVANTAGE}>
                {t("chess.study.practiceGoalTypeMaterial", {
                  defaultValue: "Reach a material advantage",
                })}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {practiceGoalType === CHESS_PRACTICE_GOAL_TYPES.CHECKMATE_IN_N ||
        practiceGoalType === CHESS_PRACTICE_GOAL_TYPES.REACH_MATERIAL_ADVANTAGE ? (
          <div className="space-y-1">
            <Label>
              {practiceGoalType === CHESS_PRACTICE_GOAL_TYPES.CHECKMATE_IN_N
                ? t("chess.study.practiceGoalMaxMoves", { defaultValue: "Maximum moves" })
                : t("chess.study.practiceGoalMaterialThreshold", {
                    defaultValue: "Material advantage threshold",
                  })}
            </Label>
            <Input
              type="number"
              min={practiceGoalType === CHESS_PRACTICE_GOAL_TYPES.CHECKMATE_IN_N ? 1 : undefined}
              value={practiceGoalTargetValue}
              onChange={(e) => setPracticeGoalTargetValue(Number(e.target.value))}
            />
          </div>
        ) : null}
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
