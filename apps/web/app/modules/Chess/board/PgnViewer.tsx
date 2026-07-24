import { Chess } from "chess.js";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";

import { ChessBoard } from "./ChessBoard";

type PgnViewerProps = {
  pgn: string;
  size?: number;
  className?: string;
};

/**
 * Minimal PGN viewer: step through moves with chess.js (MIT).
 */
export function PgnViewer({ pgn, size = 360, className }: PgnViewerProps) {
  const { t } = useTranslation();
  const [ply, setPly] = useState(0);

  const history = useMemo(() => {
    try {
      const game = new Chess();
      game.loadPgn(pgn);
      return game.history({ verbose: true });
    } catch {
      return [];
    }
  }, [pgn]);

  const fen = useMemo(() => {
    const game = new Chess();
    try {
      for (let i = 0; i < ply; i += 1) {
        const move = history[i];
        if (move) {
          game.move(move);
        }
      }
      return game.fen();
    } catch {
      return game.fen();
    }
  }, [history, ply]);

  return (
    <div className={className}>
      <ChessBoard fen={fen} interactive={false} size={size} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setPly(0)}>
          {t("chess.pgn.start", { defaultValue: "Start" })}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPly((value) => Math.max(0, value - 1))}
          disabled={ply === 0}
        >
          {t("chess.pgn.prev", { defaultValue: "Prev" })}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPly((value) => Math.min(history.length, value + 1))}
          disabled={ply >= history.length}
        >
          {t("chess.pgn.next", { defaultValue: "Next" })}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setPly(history.length)}>
          {t("chess.pgn.end", { defaultValue: "End" })}
        </Button>
        <span className="text-sm text-neutral-600">
          {ply}/{history.length}
        </span>
      </div>
    </div>
  );
}
