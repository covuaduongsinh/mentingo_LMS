import { cn } from "~/lib/utils";
import { ChessPiece } from "~/modules/Chess/board/pieces/ChessPiece";
import {
  FILES,
  RANKS,
  squareName,
  type BoardOrientation,
} from "~/modules/Chess/board/squareGeometry";

import type { EditorSquares } from "./editorFen";
import type { Square } from "chess.js";

type BoardEditorGridProps = {
  squares: EditorSquares;
  orientation: BoardOrientation;
  size?: number;
  onSquareClick: (square: Square) => void;
  className?: string;
};

/**
 * Free-form placement grid for the board editor: every square is clickable regardless of
 * chess rules (no legal-move checking here — see editorFen.ts for the FEN assembly that
 * validates the *final* position instead of gating every intermediate click).
 */
export function BoardEditorGrid({
  squares,
  orientation,
  size = 360,
  onSquareClick,
  className,
}: BoardEditorGridProps) {
  const displayRanks = orientation === "white" ? RANKS : [...RANKS].reverse();
  const displayFiles = orientation === "white" ? FILES : [...FILES].reverse();
  const cellSize = size / 8;
  const pieceSize = cellSize * 0.88;

  return (
    <div
      className={cn(
        "grid grid-cols-8 overflow-hidden rounded-md border border-neutral-400/60 shadow-md",
        className,
      )}
      style={{ width: size, height: size }}
      role="grid"
      aria-label="Board editor"
    >
      {displayRanks.map((rank) =>
        displayFiles.map((file) => {
          const fileIndex = FILES.indexOf(file);
          const rankIndex = RANKS.indexOf(rank);
          const square = squareName(fileIndex, rankIndex);
          const piece = squares[square];
          const isDark = (fileIndex + rankIndex) % 2 === 1;

          return (
            <button
              key={square}
              type="button"
              onClick={() => onSquareClick(square)}
              data-testid={`chess-editor-square-${square}`}
              className={cn(
                "relative flex cursor-pointer items-center justify-center select-none hover:brightness-[0.97]",
                isDark ? "bg-[#769656]" : "bg-[#eeeed2]",
              )}
              style={{ width: cellSize, height: cellSize }}
              aria-label={square}
            >
              {piece ? <ChessPiece color={piece.color} type={piece.type} size={pieceSize} /> : null}
            </button>
          );
        }),
      )}
    </div>
  );
}
