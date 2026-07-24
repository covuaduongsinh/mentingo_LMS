import {
  CHESS_ENGINE_NAMES,
  CHESS_PLAY_END_REASONS,
  CHESS_PLAY_OUTCOMES,
  CHESS_TIME_CONTROL_LIST,
  CHESS_TIME_CONTROLS,
} from "@repo/shared";
import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useChessEngineBestMove } from "~/api/mutations/useChessEngineBestMove";
import { useCreateChessPlaySession } from "~/api/mutations/useCreateChessPlaySession";
import { useChessEngineStatus } from "~/api/queries/useChessEngineStatus";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ChessBoard } from "~/modules/Chess/board";
import { PlaySessionsPanel } from "~/modules/Chess/Play/PlaySessionsPanel";
import { formatClockTime, useChessClock } from "~/modules/Chess/Play/useChessClock";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";
import type {
  ChessEngineLevelShared,
  ChessEngineName,
  ChessPlayEndReason,
  ChessPlayOutcome,
  ChessTimeControlId,
} from "@repo/shared";
import type { TFunction } from "i18next";
import type { ChessPlaySession } from "~/modules/Chess/Play/PlaySessionsPanel";

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

function fenAtMoveIndex(movesUci: string[], index: number): string {
  const game = new Chess();
  for (let i = 0; i < index && i < movesUci.length; i++) {
    const uci = movesUci[i];
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      game.move({ from, to, promotion });
    } catch {
      break;
    }
  }
  return game.fen();
}

/** Draw/checkmate detection for a position, from the player's perspective. */
function getGameEndInfo(
  g: Chess,
  playerColor: "w" | "b",
): { outcome: ChessPlayOutcome; endReason: ChessPlayEndReason } | null {
  if (g.isCheckmate()) {
    const playerIsCheckmated = g.turn() === playerColor;
    return {
      outcome: playerIsCheckmated ? CHESS_PLAY_OUTCOMES.LOSS : CHESS_PLAY_OUTCOMES.WIN,
      endReason: CHESS_PLAY_END_REASONS.CHECKMATE,
    };
  }
  if (g.isStalemate()) {
    return { outcome: CHESS_PLAY_OUTCOMES.DRAW, endReason: CHESS_PLAY_END_REASONS.STALEMATE };
  }
  if (g.isInsufficientMaterial()) {
    return {
      outcome: CHESS_PLAY_OUTCOMES.DRAW,
      endReason: CHESS_PLAY_END_REASONS.INSUFFICIENT_MATERIAL,
    };
  }
  if (g.isThreefoldRepetition()) {
    return { outcome: CHESS_PLAY_OUTCOMES.DRAW, endReason: CHESS_PLAY_END_REASONS.THREEFOLD };
  }
  if (g.isDrawByFiftyMoves()) {
    return { outcome: CHESS_PLAY_OUTCOMES.DRAW, endReason: CHESS_PLAY_END_REASONS.FIFTY_MOVE };
  }
  return null;
}

function pgnResultTag(outcome: ChessPlayOutcome, playerColor: "w" | "b"): string {
  if (outcome === CHESS_PLAY_OUTCOMES.DRAW) return "1/2-1/2";
  const playerWon = outcome === CHESS_PLAY_OUTCOMES.WIN;
  const whiteWon = playerWon === (playerColor === "w");
  return whiteWon ? "1-0" : "0-1";
}

function buildPgn(movesUci: string[], playerColor: "w" | "b", resultTag: string): string {
  const g = new Chess();
  g.header("White", playerColor === "w" ? "Student" : "Engine");
  g.header("Black", playerColor === "b" ? "Student" : "Engine");
  g.header("Result", resultTag);
  for (const uci of movesUci) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      g.move({ from, to, promotion });
    } catch {
      break;
    }
  }
  return g.pgn();
}

function describeGameEnd(
  t: TFunction,
  outcome: ChessPlayOutcome,
  endReason: ChessPlayEndReason,
): string {
  if (endReason === CHESS_PLAY_END_REASONS.RESIGNATION) {
    return t("chess.play.resultResign", { defaultValue: "You resigned." });
  }
  if (endReason === CHESS_PLAY_END_REASONS.TIMEOUT) {
    if (outcome === CHESS_PLAY_OUTCOMES.WIN) {
      return t("chess.play.resultTimeoutWin", {
        defaultValue: "Engine ran out of time — you win!",
      });
    }
    return t("chess.play.resultTimeoutLoss", { defaultValue: "Time's up — you lost." });
  }
  if (endReason === CHESS_PLAY_END_REASONS.CHECKMATE) {
    return outcome === CHESS_PLAY_OUTCOMES.WIN
      ? t("chess.play.youWin", { defaultValue: "Checkmate — you win!" })
      : t("chess.play.youLose", { defaultValue: "Checkmate — you lost." });
  }
  return t("chess.play.draw", { defaultValue: "Draw." });
}

export default function ChessPlayPage() {
  const { t } = useTranslation();
  const { data: engineStatus } = useChessEngineStatus();
  const { mutateAsync: requestBestMove, isPending: isEngineThinking } = useChessEngineBestMove();
  const { mutateAsync: savePlaySession } = useCreateChessPlaySession();

  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [level, setLevel] = useState<ChessEngineLevelShared>("easy");
  const [timeControlId, setTimeControlId] = useState<ChessTimeControlId>(
    CHESS_TIME_CONTROLS.NONE.id,
  );
  const [fen, setFen] = useState(START_FEN);
  const [movesUci, setMovesUci] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("");
  const [lastEngine, setLastEngine] = useState<string>("");
  const [resignDialogOpen, setResignDialogOpen] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [reviewSession, setReviewSession] = useState<ChessPlaySession | null>(null);
  const [reviewMoveIndex, setReviewMoveIndex] = useState(0);

  const sessionSavedRef = useRef(false);
  const gameStartRef = useRef<number | null>(null);
  const engineNameRef = useRef<ChessEngineName>(CHESS_ENGINE_NAMES.BUILTIN);
  const finishGameRef = useRef<
    ((outcome: ChessPlayOutcome, endReason: ChessPlayEndReason) => void) | null
  >(null);

  const activeTimeControl = useMemo(
    () => CHESS_TIME_CONTROL_LIST.find((tc) => tc.id === timeControlId) ?? CHESS_TIME_CONTROLS.NONE,
    [timeControlId],
  );

  const handleFlag = useCallback((side: "player" | "engine") => {
    if (side === "player") {
      finishGameRef.current?.(CHESS_PLAY_OUTCOMES.LOSS, CHESS_PLAY_END_REASONS.TIMEOUT);
    } else {
      finishGameRef.current?.(CHESS_PLAY_OUTCOMES.WIN, CHESS_PLAY_END_REASONS.TIMEOUT);
    }
  }, []);

  const clock = useChessClock({
    baseSeconds: activeTimeControl.baseSeconds,
    incrementSeconds: activeTimeControl.incrementSeconds,
    onFlag: handleFlag,
  });

  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const isPlayerTurn =
    !reviewSession && !gameEnded && !game.isGameOver() && game.turn() === playerColor;
  const orientation = playerColor === "w" ? "white" : "black";

  const refreshCheckStatus = useCallback((nextFen: string) => {
    try {
      const g = new Chess(nextFen);
      setStatus(g.isCheck() ? "check" : "");
    } catch {
      setStatus("");
    }
  }, []);

  const finishGame = useCallback(
    (outcome: ChessPlayOutcome, endReason: ChessPlayEndReason) => {
      clock.pause();
      setGameEnded(true);
      setStatus(describeGameEnd(t, outcome, endReason));

      if (sessionSavedRef.current || movesUci.length === 0) {
        sessionSavedRef.current = true;
        return;
      }
      sessionSavedRef.current = true;

      const resultTag = pgnResultTag(outcome, playerColor);
      const pgn = buildPgn(movesUci, playerColor, resultTag);
      const durationMs = gameStartRef.current ? Date.now() - gameStartRef.current : undefined;

      void savePlaySession({
        playerColor,
        level,
        engine: engineNameRef.current,
        outcome,
        endReason,
        pgn,
        movesUci,
        timeControl:
          activeTimeControl.id === CHESS_TIME_CONTROLS.NONE.id ? undefined : activeTimeControl.id,
        playerTimeLeftMs: clock.playerMs ?? undefined,
        engineTimeLeftMs: clock.engineMs ?? undefined,
        durationMs,
      });
    },
    [clock, t, movesUci, playerColor, level, activeTimeControl, savePlaySession],
  );

  useEffect(() => {
    finishGameRef.current = finishGame;
  }, [finishGame]);

  const engineMove = useCallback(
    async (positionFen: string, history: string[]) => {
      const result = await requestBestMove({
        fen: START_FEN,
        movesUci: history,
        level,
      });
      engineNameRef.current = result.engine;
      // Prefer full history from start so Arasan/builtin stay consistent
      const nextFen = applyUci(positionFen, result.bestMoveUci);
      const nextHistory = [...history, result.bestMoveUci];
      setFen(nextFen);
      setMovesUci(nextHistory);
      setLastEngine(`${result.engine} · depth ${result.depth}`);

      const g = new Chess(nextFen);
      const endInfo = getGameEndInfo(g, playerColor);
      if (endInfo) {
        finishGame(endInfo.outcome, endInfo.endReason);
      } else {
        clock.switchTurn("player");
        refreshCheckStatus(nextFen);
      }
    },
    [level, requestBestMove, playerColor, finishGame, clock, refreshCheckStatus],
  );

  const handlePlayerMove = async (uci: string, fenAfter: string) => {
    if (!isPlayerTurn || isEngineThinking) return;

    const nextHistory = [...movesUci, uci];
    setFen(fenAfter);
    setMovesUci(nextHistory);

    const after = new Chess(fenAfter);
    const endInfo = getGameEndInfo(after, playerColor);
    if (endInfo) {
      finishGame(endInfo.outcome, endInfo.endReason);
      return;
    }

    clock.switchTurn("engine");
    refreshCheckStatus(fenAfter);

    try {
      await engineMove(fenAfter, nextHistory);
    } catch {
      // toast handled in mutation
    }
  };

  const startNewGame = async (color: "w" | "b" = playerColor) => {
    setReviewSession(null);
    setPlayerColor(color);
    setFen(START_FEN);
    setMovesUci([]);
    setStatus("");
    setLastEngine("");
    setGameEnded(false);
    sessionSavedRef.current = false;
    gameStartRef.current = Date.now();
    engineNameRef.current = engineStatus?.defaultEngine ?? CHESS_ENGINE_NAMES.BUILTIN;
    clock.reset();

    if (color === "b") {
      clock.start("engine");
      try {
        await engineMove(START_FEN, []);
      } catch {
        // toast handled
      }
    } else {
      clock.start("player");
    }
  };

  const handleResign = () => {
    setResignDialogOpen(false);
    finishGame(CHESS_PLAY_OUTCOMES.LOSS, CHESS_PLAY_END_REASONS.RESIGNATION);
  };

  const canResign = !reviewSession && !gameEnded && movesUci.length > 0;

  const openReview = (session: ChessPlaySession) => {
    setReviewSession(session);
    setReviewMoveIndex(session.movesUci.length);
  };

  const closeReview = () => {
    setReviewSession(null);
    setReviewMoveIndex(0);
  };

  const reviewFen = reviewSession ? fenAtMoveIndex(reviewSession.movesUci, reviewMoveIndex) : null;

  const breadcrumbs = [
    { title: t("chess.nav.play", { defaultValue: "Play engine" }), href: "/chess/play" },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="space-y-3" data-testid="chess-play-board-column">
          <div>
            <h1 className="h4 text-neutral-950">
              {reviewSession
                ? t("chess.play.history.reviewTitle", { defaultValue: "Reviewing saved game" })
                : t("chess.play.title", { defaultValue: "Play vs engine" })}
            </h1>
            <p className="body-base text-neutral-600">
              {t("chess.play.subtitle", {
                defaultValue: "Play against Arasan (MIT) or the built-in school engine.",
              })}
            </p>
          </div>

          <ChessBoard
            fen={reviewFen ?? fen}
            interactive={isPlayerTurn && !isEngineThinking}
            orientation={orientation}
            onMove={handlePlayerMove}
            size={400}
          />

          {reviewSession ? (
            <div
              className="flex flex-wrap items-center gap-2"
              data-testid="chess-play-review-controls"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReviewMoveIndex((i) => Math.max(0, i - 1))}
                disabled={reviewMoveIndex === 0}
              >
                {t("chess.play.history.prev", { defaultValue: "Prev" })}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setReviewMoveIndex((i) => Math.min(reviewSession.movesUci.length, i + 1))
                }
                disabled={reviewMoveIndex >= reviewSession.movesUci.length}
              >
                {t("chess.play.history.next", { defaultValue: "Next" })}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={closeReview}>
                {t("chess.play.history.backToPlay", { defaultValue: "Back to play" })}
              </Button>
            </div>
          ) : (
            <>
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

              {clock.enabled ? (
                <div className="flex items-center gap-4" data-testid="chess-play-clock">
                  <Badge variant={clock.activeSide === "player" ? "success" : "outline"}>
                    {t("chess.play.clockYou", { defaultValue: "You" })}:{" "}
                    {formatClockTime(clock.playerMs ?? 0)}
                  </Badge>
                  <Badge variant={clock.activeSide === "engine" ? "success" : "outline"}>
                    {t("chess.play.clockEngine", { defaultValue: "Engine" })}:{" "}
                    {formatClockTime(clock.engineMs ?? 0)}
                  </Badge>
                </div>
              ) : null}

              {status === "check" ? (
                <p className="body-base font-medium text-neutral-900">
                  {t("chess.play.check", { defaultValue: "Check!" })}
                </p>
              ) : status ? (
                <p
                  className="body-base font-medium text-neutral-900"
                  data-testid="chess-play-status"
                >
                  {status}
                </p>
              ) : null}

              <p className="font-mono text-xs text-neutral-600" data-testid="chess-play-moves-list">
                {movesUci.join(" ") || t("chess.play.noMoves", { defaultValue: "No moves yet" })}
              </p>
            </>
          )}
        </div>

        {!reviewSession ? (
          <div className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
            <div className="space-y-2">
              <p className="body-sm-md text-neutral-800">
                {t("chess.play.level", { defaultValue: "Difficulty" })}
              </p>
              <Select
                value={level}
                onValueChange={(value) => setLevel(value as ChessEngineLevelShared)}
              >
                <SelectTrigger data-testid="chess-play-level-select">
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

            <div className="space-y-2">
              <p className="body-sm-md text-neutral-800">
                {t("chess.play.timeControl", { defaultValue: "Time control" })}
              </p>
              <Select
                value={timeControlId}
                onValueChange={(value) => setTimeControlId(value as ChessTimeControlId)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CHESS_TIME_CONTROLS.NONE.id}>
                    {t("chess.play.timeControlNone", { defaultValue: "No clock" })}
                  </SelectItem>
                  <SelectItem value={CHESS_TIME_CONTROLS.BLITZ_5_0.id}>
                    {t("chess.play.timeControl5_0", { defaultValue: "5 min" })}
                  </SelectItem>
                  <SelectItem value={CHESS_TIME_CONTROLS.RAPID_10_0.id}>
                    {t("chess.play.timeControl10_0", { defaultValue: "10 min" })}
                  </SelectItem>
                  <SelectItem value={CHESS_TIME_CONTROLS.RAPID_15_10.id}>
                    {t("chess.play.timeControl15_10", { defaultValue: "15 min + 10s" })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                data-testid="chess-play-new-game-white"
                onClick={() => startNewGame("w")}
                disabled={isEngineThinking}
              >
                {t("chess.play.playWhite", { defaultValue: "New game as White" })}
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="chess-play-new-game-black"
                onClick={() => startNewGame("b")}
                disabled={isEngineThinking}
              >
                {t("chess.play.playBlack", { defaultValue: "New game as Black" })}
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="chess-play-resign-button"
                onClick={() => setResignDialogOpen(true)}
                disabled={!canResign}
              >
                {t("chess.play.resign", { defaultValue: "Resign" })}
              </Button>
            </div>

            <p className="text-xs text-neutral-500">
              {t("chess.play.arasanHint", {
                defaultValue:
                  "Set ARASAN_PATH on the API to use the real Arasan UCI binary. Without it, a built-in MIT engine is used.",
              })}
            </p>
          </div>
        ) : null}

        <PlaySessionsPanel onReview={openReview} />
      </div>

      <Dialog open={resignDialogOpen} onOpenChange={setResignDialogOpen}>
        <DialogContent data-testid="chess-play-resign-dialog">
          <DialogTitle>
            {t("chess.play.resignConfirmTitle", { defaultValue: "Resign?" })}
          </DialogTitle>
          <DialogDescription>
            {t("chess.play.resignConfirmBody", {
              defaultValue: "This will end the game as a loss and save it to your history.",
            })}
          </DialogDescription>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResignDialogOpen(false)}>
              {t("common.button.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              type="button"
              data-testid="chess-play-resign-confirm"
              onClick={handleResign}
              className="bg-error-500 hover:bg-error-600"
            >
              {t("chess.play.resign", { defaultValue: "Resign" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
