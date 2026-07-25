import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import { ChessBoard } from "~/modules/Chess/board";

import { applyUciMoves } from "./chessAssignmentUtils";

type AssignmentChessMoveInputProps = {
  fen: string;
  moves: string[];
  onChange: (moves: string[]) => void;
  disabled?: boolean;
};

/**
 * Interactive click-to-move board for a `chess_position_line` task — plays
 * from `fen`, appends each move to `moves`. Same controlled pattern as
 * ChessMoveQuestion.tsx (quiz chess questions), reused here for assignments.
 */
export function AssignmentChessMoveInput({
  fen,
  moves,
  onChange,
  disabled = false,
}: AssignmentChessMoveInputProps) {
  const { t } = useTranslation();
  const [currentFen, setCurrentFen] = useState(() => applyUciMoves(fen, moves));

  useEffect(() => {
    setCurrentFen(applyUciMoves(fen, moves));
  }, [fen, moves]);

  const orientation = useMemo(() => {
    try {
      return new Chess(fen).turn() === "b" ? "black" : "white";
    } catch {
      return "white";
    }
  }, [fen]);

  const handleMove = (uci: string, fenAfter: string) => {
    if (disabled) return;
    onChange([...moves, uci]);
    setCurrentFen(fenAfter);
  };

  const handleReset = () => {
    if (disabled) return;
    onChange([]);
    setCurrentFen(fen);
  };

  return (
    <div className="flex flex-col gap-2">
      <ChessBoard
        fen={currentFen}
        interactive={!disabled}
        orientation={orientation}
        onMove={handleMove}
      />
      <div className="flex flex-wrap items-center gap-2">
        <p className="body-sm text-neutral-700">
          {t("chess.quiz.movesPlayed", { defaultValue: "Moves" })}:{" "}
          <span className="font-mono">{moves.join(" ") || "—"}</span>
        </p>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={moves.length === 0}
          >
            {t("chess.quiz.reset", { defaultValue: "Reset board" })}
          </Button>
        )}
      </div>
    </div>
  );
}
