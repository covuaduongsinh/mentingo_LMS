import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ChessBoard } from "~/modules/Chess/board";
import { getFenAtPath, getNodeAtPath } from "~/modules/Chess/board/moveTree";

import type { BoardShape } from "~/modules/Chess/board";
import type { MoveTree } from "~/modules/Chess/board/moveTree";

type ChessStudyGuidedChapterProps = {
  tree: MoveTree;
  /** "gamebook" reveals nothing up front (concealFrom = 0); "conceal" pre-reveals the mainline up to a ply. */
  concealFromPly: number;
  orientation?: "white" | "black";
};

type MainlineNode = {
  id: string;
  uci: string;
  san: string;
  comment?: string;
  glyph?: string;
  shapes?: BoardShape[];
  hint?: string;
  onWrong?: string;
  onCorrect?: string;
};

/**
 * Mainline-only guided player for gamebook/conceal chapters with per-node coaching text (S2).
 */
export function ChessStudyGuidedChapter({
  tree,
  concealFromPly,
  orientation = "white",
}: ChessStudyGuidedChapterProps) {
  const { t } = useTranslation();

  const mainline = useMemo(() => {
    const nodes: MainlineNode[] = [];
    let children = tree.children;
    while (children.length > 0) {
      nodes.push(children[0]);
      children = children[0].children;
    }
    return nodes;
  }, [tree]);

  const preRevealedCount = Math.min(Math.max(concealFromPly, 0), mainline.length);
  const [revealedCount, setRevealedCount] = useState(preRevealedCount);
  const [feedback, setFeedback] = useState<"idle" | "wrong" | "correct">("idle");
  const [showHint, setShowHint] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const path = mainline.slice(0, revealedCount).map((node) => node.id);
  const fen = getFenAtPath(tree, path);
  const isDone = revealedCount >= mainline.length;
  const currentNode = getNodeAtPath(tree, path);
  const expected = mainline[revealedCount];
  const shapes = (currentNode?.shapes ?? []) as BoardShape[];

  const handleMove = (uci: string) => {
    if (!expected) return;
    if (expected.uci === uci) {
      setRevealedCount((count) => count + 1);
      setFeedback("correct");
      setShowHint(false);
      setLastMessage(
        expected.onCorrect?.trim() ||
          expected.comment ||
          t("chess.study.guidedCorrectDefault", { defaultValue: "Correct!" }),
      );
    } else {
      setFeedback("wrong");
      setLastMessage(
        expected.onWrong?.trim() ||
          t("chess.study.guidedWrong", { defaultValue: "Not quite — try again." }),
      );
    }
  };

  const reveal = () => {
    if (!isDone) {
      setRevealedCount((count) => count + 1);
      setFeedback("idle");
      setShowHint(false);
      setLastMessage(null);
    }
  };

  const restart = () => {
    setRevealedCount(preRevealedCount);
    setFeedback("idle");
    setShowHint(false);
    setLastMessage(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <ChessBoard
        fen={fen}
        interactive={!isDone}
        onMove={handleMove}
        size={400}
        shapes={shapes}
        orientation={orientation}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isDone ? "default" : "outline"}>
          {isDone
            ? t("chess.study.guidedDone", { defaultValue: "Chapter complete" })
            : t("chess.study.guidedPrompt", { defaultValue: "Find the next move" })}
        </Badge>
        {feedback === "wrong" ? <span className="text-sm text-red-600">{lastMessage}</span> : null}
        {feedback === "correct" && lastMessage ? (
          <span className="text-sm text-green-700">{lastMessage}</span>
        ) : null}
      </div>
      {showHint && expected?.hint ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
          {expected.hint}
        </p>
      ) : null}
      {currentNode?.comment && feedback !== "wrong" ? (
        <p className="text-sm text-neutral-700">{currentNode.comment}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowHint(true)}
          disabled={isDone || !expected?.hint}
        >
          {t("chess.study.guidedHint", { defaultValue: "Hint" })}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={reveal} disabled={isDone}>
          {t("chess.study.guidedReveal", { defaultValue: "Reveal move" })}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={restart}>
          {t("chess.study.guidedRestart", { defaultValue: "Restart" })}
        </Button>
      </div>
    </div>
  );
}
