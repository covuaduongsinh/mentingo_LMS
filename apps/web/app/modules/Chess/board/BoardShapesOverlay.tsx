import { SHAPE_COLOR_HEX, type BoardShape } from "./shapes";
import { squarePixelCenter, type BoardOrientation } from "./squareGeometry";

type BoardShapesOverlayProps = {
  shapes: BoardShape[];
  size: number;
  orientation: BoardOrientation;
};

/**
 * SVG layer drawn on top of the board grid: arrows and highlighted-square circles from
 * `shapes`. Purely presentational — ChessBoard owns the right-click gesture that produces
 * the shape list (see ChessBoard.tsx and shapes.ts).
 */
export function BoardShapesOverlay({ shapes, size, orientation }: BoardShapesOverlayProps) {
  if (shapes.length === 0) return null;

  const cellSize = size / 8;
  const arrowHeadSize = Math.max(cellSize * 0.28, 8);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="pointer-events-none absolute left-0 top-0"
      aria-hidden="true"
    >
      <defs>
        {(["green", "red", "blue", "yellow"] as const).map((color) => (
          <marker
            key={color}
            id={`chess-arrowhead-${color}`}
            markerWidth={arrowHeadSize}
            markerHeight={arrowHeadSize}
            refX={arrowHeadSize * 0.8}
            refY={arrowHeadSize / 2}
            orient="auto-start-reverse"
          >
            <path
              d={`M0,0 L${arrowHeadSize},${arrowHeadSize / 2} L0,${arrowHeadSize} Z`}
              fill={SHAPE_COLOR_HEX[color]}
            />
          </marker>
        ))}
      </defs>
      {shapes.map((shape) => {
        if (shape.kind === "circle") {
          const { x, y } = squarePixelCenter(shape.square, orientation, size);
          return (
            <circle
              key={`circle-${shape.square}-${shape.color}`}
              cx={x}
              cy={y}
              r={cellSize / 2 - 3}
              fill="none"
              stroke={SHAPE_COLOR_HEX[shape.color]}
              strokeWidth={cellSize * 0.08}
              opacity={0.8}
            />
          );
        }

        const from = squarePixelCenter(shape.from, orientation, size);
        const to = squarePixelCenter(shape.to, orientation, size);
        // Shorten the line so the arrowhead doesn't overlap the destination square's piece.
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy) || 1;
        const shorten = cellSize * 0.45;
        const endX = to.x - (dx / length) * shorten;
        const endY = to.y - (dy / length) * shorten;

        return (
          <line
            key={`arrow-${shape.from}-${shape.to}-${shape.color}`}
            x1={from.x}
            y1={from.y}
            x2={endX}
            y2={endY}
            stroke={SHAPE_COLOR_HEX[shape.color]}
            strokeWidth={cellSize * 0.16}
            strokeLinecap="round"
            opacity={0.8}
            markerEnd={`url(#chess-arrowhead-${shape.color})`}
          />
        );
      })}
    </svg>
  );
}
