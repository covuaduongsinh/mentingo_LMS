import { Chess, type Square } from "chess.js";
import { useCallback, useMemo, useState } from "react";

import { cn } from "~/lib/utils";

import { ChessPiece, type ChessPieceType } from "./pieces/ChessPiece";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export type ChessBoardProps = {
  fen: string;
  interactive?: boolean;
  orientation?: "white" | "black";
  onMove?: (uci: string, fenAfter: string) => void;
  className?: string;
  size?: number;
};

function squareName(fileIndex: number, rankIndex: number): Square {
  return `${FILES[fileIndex]}${RANKS[rankIndex]}` as Square;
}

/**
 * MIT-friendly React chess board (no Chessground/jQuery).
 * Rules via chess.js (MIT). Pieces: in-repo Staunton SVG set.
 */
export function ChessBoard({
  fen,
  interactive = false,
  orientation = "white",
  onMove,
  className,
  size = 360,
}: ChessBoardProps) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [error, setError] = useState<string | null>(null);

  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const board = game.board();
  const displayRanks = orientation === "white" ? RANKS : [...RANKS].reverse();
  const displayFiles = orientation === "white" ? FILES : [...FILES].reverse();
  const cellSize = size / 8;
  const pieceSize = cellSize * 0.88;

  const legalTargets = useMemo(() => {
    if (!selected || !interactive) {
      return new Set<string>();
    }
    return new Set(game.moves({ square: selected, verbose: true }).map((move) => move.to));
  }, [game, interactive, selected]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!interactive) {
        return;
      }
      setError(null);

      if (!selected) {
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
          setSelected(square);
        }
        return;
      }

      if (selected === square) {
        setSelected(null);
        return;
      }

      const moves = game.moves({ square: selected, verbose: true });
      const candidate = moves.find((move) => move.to === square);
      if (!candidate) {
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
          setSelected(square);
        } else {
          setSelected(null);
        }
        return;
      }

      try {
        const result = game.move({
          from: selected,
          to: square,
          promotion: candidate.promotion ?? "q",
        });
        if (!result) {
          setSelected(null);
          return;
        }
        const uci = `${result.from}${result.to}${result.promotion ?? ""}`;
        onMove?.(uci, game.fen());
        setSelected(null);
      } catch {
        setError("Illegal move");
        setSelected(null);
      }
    },
    [game, interactive, onMove, selected],
  );

  return (
    <div className={cn("inline-flex flex-col gap-2", className)}>
      <div
        className="grid grid-cols-8 overflow-hidden rounded-md border border-neutral-400/60 shadow-md"
        style={{ width: size, height: size }}
        role="grid"
        aria-label="Chess board"
      >
        {displayRanks.map((rank, rankOffset) =>
          displayFiles.map((file, fileOffset) => {
            const fileIndex = FILES.indexOf(file);
            const rankIndex = RANKS.indexOf(rank);
            const square = squareName(fileIndex, rankIndex);
            const piece = board[rankIndex]?.[fileIndex];
            const isDark = (fileIndex + rankIndex) % 2 === 1;
            const isSelected = selected === square;
            const isTarget = legalTargets.has(square);

            return (
              <button
                key={square}
                type="button"
                role="gridcell"
                disabled={!interactive}
                onClick={() => handleSquareClick(square)}
                className={cn(
                  "relative flex items-center justify-center select-none",
                  isDark ? "bg-[#769656]" : "bg-[#eeeed2]",
                  interactive && "cursor-pointer hover:brightness-[0.97]",
                  !interactive && "cursor-default",
                  isSelected && "ring-2 ring-inset ring-sky-400",
                  isTarget && "after:absolute after:size-3 after:rounded-full after:bg-black/25",
                )}
                style={{ width: cellSize, height: cellSize }}
                aria-label={square}
              >
                {piece ? (
                  <ChessPiece
                    color={piece.color}
                    type={piece.type as ChessPieceType}
                    size={pieceSize}
                  />
                ) : null}
                {rankOffset === displayRanks.length - 1 ? (
                  <span
                    className={cn(
                      "absolute bottom-0.5 right-1 text-[10px] font-medium leading-none",
                      isDark ? "text-[#eeeed2]/70" : "text-[#769656]/80",
                    )}
                  >
                    {file}
                  </span>
                ) : null}
                {fileOffset === 0 ? (
                  <span
                    className={cn(
                      "absolute left-0.5 top-0.5 text-[10px] font-medium leading-none",
                      isDark ? "text-[#eeeed2]/70" : "text-[#769656]/80",
                    )}
                  >
                    {rank}
                  </span>
                ) : null}
              </button>
            );
          }),
        )}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
