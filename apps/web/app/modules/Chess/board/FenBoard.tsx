import { ChessBoard } from "./ChessBoard";

type FenBoardProps = {
  fen: string;
  orientation?: "white" | "black";
  size?: number;
  className?: string;
};

/** Static FEN display for content lessons and review. */
export function FenBoard({ fen, orientation, size, className }: FenBoardProps) {
  return (
    <ChessBoard
      fen={fen}
      interactive={false}
      orientation={orientation}
      size={size}
      className={className}
    />
  );
}
