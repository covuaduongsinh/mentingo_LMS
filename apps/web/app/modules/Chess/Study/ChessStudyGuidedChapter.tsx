import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ChessBoard } from "~/modules/Chess/board";
import { getFenAtPath, getNodeAtPath } from "~/modules/Chess/board/moveTree";

import type { MoveTree } from "~/modules/Chess/board/moveTree";

type ChessStudyGuidedChapterProps = {
  tree: MoveTree;
  /** "gamebook" reveals nothing up front (concealFrom = 0); "conceal" pre-reveals the mainline up to a ply. */
  concealFromPly: number;
};

/**
 * Mainline-only guided player for gamebook/conceal chapters: the learner must play the correct
 * next mainline move to advance past `concealFromPly`; a wrong attempt is silently rejected
 * (the board stays put, since ChessBoard is a controlled component bound to `fen`) with an
 * inline retry hint. Variations are not exposed in this mode — only the mainline is guided.
 */
export function ChessStudyGuidedChapter({ tree, concealFromPly }: ChessStudyGuidedChapterProps) {
  const { t } = useTranslation();

  const mainline = useMemo(() => {
    const nodes: { id: string; uci: string; san: string; comment?: string; glyph?: string }[] = [];
    let children = tree.children;
    while (children.length > 0) {
      nodes.push(children[0]);
      children = children[0].children;
    }
    return nodes;
  }, [tree]);

  const preRevealedCount = Math.min(Math.max(concealFromPly, 0), mainline.length);
  const [revealedCount, setRevealedCount] = useState(preRevealedCount);
  const [feedback, setFeedback] = useState<"idle" | "wrong">("idle");

  const path = mainline.slice(0, revealedCount).map((node) => node.id);
  const fen = getFenAtPath(tree, path);
  const isDone = revealedCount >= mainline.length;
  const currentNode = getNodeAtPath(tree, path);

  const handleMove = (uci: string) => {
    const expected = mainline[revealedCount];
    if (expected && expected.uci === uci) {
      setRevealedCount((count) => count + 1);
      setFeedback("idle");
    } else {
      setFeedback("wrong");
    }
  };

  const reveal = () => {
    if (!isDone) setRevealedCount((count) => count + 1);
    setFeedback("idle");
  };

  const restart = () => {
    setRevealedCount(preRevealedCount);
    setFeedback("idle");
  };

  return (
    <div className="flex flex-col gap-3">
      <ChessBoard fen={fen} interactive={!isDone} onMove={handleMove} size={400} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isDone ? "default" : "outline"}>
          {isDone
            ? t("chess.study.guidedDone", { defaultValue: "Chapter complete" })
            : t("chess.study.guidedPrompt", { defaultValue: "Find the next move" })}
        </Badge>
        {feedback === "wrong" ? (
          <span className="text-sm text-red-600">
            {t("chess.study.guidedWrong", { defaultValue: "Not quite — try again." })}
          </span>
        ) : null}
      </div>
      {currentNode?.comment ? (
        <p className="text-sm text-neutral-700">{currentNode.comment}</p>
      ) : null}
      <div className="flex gap-2">
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
