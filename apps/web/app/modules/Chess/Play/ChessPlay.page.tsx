import { Chess } from "chess.js";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useChessEngineBestMove } from "~/api/mutations/useChessEngineBestMove";
import { useChessEngineStatus } from "~/api/queries/useChessEngineStatus";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ChessBoard } from "~/modules/Chess/board";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";
import type { ChessEnginePlayLevel } from "~/api/chess-api";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessPlay");

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function applyUci(fen: string, uci: string): string {
  const game = new Chess(fen);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;
  game.move({ from, to, promotion });
  return game.fen();
}

export default function ChessPlayPage() {
  const { t } = useTranslation();
  const { data: engineStatus } = useChessEngineStatus();
  const { mutateAsync: requestBestMove, isPending: isEngineThinking } = useChessEngineBestMove();

  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [level, setLevel] = useState<ChessEnginePlayLevel>("easy");
  const [fen, setFen] = useState(START_FEN);
  const [movesUci, setMovesUci] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("");
  const [lastEngine, setLastEngine] = useState<string>("");

  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const isPlayerTurn = !game.isGameOver() && game.turn() === playerColor;
  const orientation = playerColor === "w" ? "white" : "black";

  const refreshStatus = useCallback(
    (nextFen: string) => {
      try {
        const g = new Chess(nextFen);
        if (g.isCheckmate()) {
          setStatus(
            g.turn() === playerColor
              ? t("chess.play.youLose", { defaultValue: "Checkmate — you lost." })
              : t("chess.play.youWin", { defaultValue: "Checkmate — you win!" }),
          );
        } else if (g.isDraw() || g.isStalemate()) {
          setStatus(t("chess.play.draw", { defaultValue: "Draw." }));
        } else if (g.isCheck()) {
          setStatus(t("chess.play.check", { defaultValue: "Check!" }));
        } else {
          setStatus("");
        }
      } catch {
        setStatus("");
      }
    },
    [playerColor, t],
  );

  const engineMove = useCallback(
    async (positionFen: string, history: string[]) => {
      const result = await requestBestMove({
        fen: START_FEN,
        movesUci: history,
        level,
      });
      // Prefer full history from start so Arasan/builtin stay consistent
      const nextFen = applyUci(positionFen, result.bestMoveUci);
      setFen(nextFen);
      setMovesUci([...history, result.bestMoveUci]);
      setLastEngine(`${result.engine} · depth ${result.depth}`);
      refreshStatus(nextFen);
    },
    [level, requestBestMove, refreshStatus],
  );

  const handlePlayerMove = async (uci: string, fenAfter: string) => {
    if (!isPlayerTurn || isEngineThinking) return;

    const nextHistory = [...movesUci, uci];
    setFen(fenAfter);
    setMovesUci(nextHistory);
    refreshStatus(fenAfter);

    const after = new Chess(fenAfter);
    if (after.isGameOver()) return;

    try {
      await engineMove(fenAfter, nextHistory);
    } catch {
      // toast handled in mutation
    }
  };

  const startNewGame = async (color: "w" | "b" = playerColor) => {
    setPlayerColor(color);
    setFen(START_FEN);
    setMovesUci([]);
    setStatus("");
    setLastEngine("");

    if (color === "b") {
      try {
        await engineMove(START_FEN, []);
      } catch {
        // toast handled
      }
    }
  };

  const breadcrumbs = [
    { title: t("chess.nav.play", { defaultValue: "Play engine" }), href: "/chess/play" },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="space-y-3">
          <div>
            <h1 className="h4 text-neutral-950">
              {t("chess.play.title", { defaultValue: "Play vs engine" })}
            </h1>
            <p className="body-base text-neutral-600">
              {t("chess.play.subtitle", {
                defaultValue: "Play against Arasan (MIT) or the built-in school engine.",
              })}
            </p>
          </div>

          <ChessBoard
            fen={fen}
            interactive={isPlayerTurn && !isEngineThinking}
            orientation={orientation}
            onMove={handlePlayerMove}
            size={400}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {isEngineThinking
                ? t("chess.play.thinking", { defaultValue: "Engine thinking…" })
                : isPlayerTurn
                  ? t("chess.play.yourTurn", { defaultValue: "Your turn" })
                  : t("chess.play.engineTurn", { defaultValue: "Engine turn" })}
            </Badge>
            {lastEngine ? <Badge variant="outline">{lastEngine}</Badge> : null}
            {engineStatus ? (
              <Badge variant="outline">
                {engineStatus.defaultEngine === "arasan" ? "Arasan" : "Builtin"}
              </Badge>
            ) : null}
          </div>
          {status ? <p className="body-base font-medium text-neutral-900">{status}</p> : null}
          <p className="font-mono text-xs text-neutral-600">
            {movesUci.join(" ") || t("chess.play.noMoves", { defaultValue: "No moves yet" })}
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="space-y-2">
            <p className="body-sm-md text-neutral-800">
              {t("chess.play.level", { defaultValue: "Difficulty" })}
            </p>
            <Select
              value={level}
              onValueChange={(value) => setLevel(value as ChessEnginePlayLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">
                  {t("chess.play.levelEasy", { defaultValue: "Easy" })}
                </SelectItem>
                <SelectItem value="medium">
                  {t("chess.play.levelMedium", { defaultValue: "Medium" })}
                </SelectItem>
                <SelectItem value="hard">
                  {t("chess.play.levelHard", { defaultValue: "Hard" })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Button type="button" onClick={() => startNewGame("w")} disabled={isEngineThinking}>
              {t("chess.play.playWhite", { defaultValue: "New game as White" })}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => startNewGame("b")}
              disabled={isEngineThinking}
            >
              {t("chess.play.playBlack", { defaultValue: "New game as Black" })}
            </Button>
          </div>

          <p className="text-xs text-neutral-500">
            {t("chess.play.arasanHint", {
              defaultValue:
                "Set ARASAN_PATH on the API to use the real Arasan UCI binary. Without it, a built-in MIT engine is used.",
            })}
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
