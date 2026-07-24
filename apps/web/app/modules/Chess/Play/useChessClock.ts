import { useCallback, useEffect, useRef, useState } from "react";

export type ChessClockSide = "player" | "engine";

type UseChessClockOptions = {
  /** null disables the clock entirely (no time control selected) */
  baseSeconds: number | null;
  incrementSeconds: number | null;
  onFlag: (side: ChessClockSide) => void;
};

/**
 * Client-side chess clock. Engine think time counts against the engine's own
 * clock (symmetric with the player), started/paused/switched explicitly by the caller.
 */
export function useChessClock({ baseSeconds, incrementSeconds, onFlag }: UseChessClockOptions) {
  const enabled = baseSeconds != null;
  const initialMs = enabled ? baseSeconds * 1000 : 0;

  const [playerMs, setPlayerMs] = useState(initialMs);
  const [engineMs, setEngineMs] = useState(initialMs);
  const [activeSide, setActiveSide] = useState<ChessClockSide | null>(null);

  const playerMsRef = useRef(initialMs);
  const engineMsRef = useRef(initialMs);
  const activeSideRef = useRef<ChessClockSide | null>(null);
  const lastTickRef = useRef(0);
  const flaggedRef = useRef(false);

  const reset = useCallback(() => {
    flaggedRef.current = false;
    activeSideRef.current = null;
    playerMsRef.current = initialMs;
    engineMsRef.current = initialMs;
    setActiveSide(null);
    setPlayerMs(initialMs);
    setEngineMs(initialMs);
  }, [initialMs]);

  const start = useCallback(
    (side: ChessClockSide) => {
      if (!enabled) return;
      flaggedRef.current = false;
      lastTickRef.current = Date.now();
      activeSideRef.current = side;
      setActiveSide(side);
    },
    [enabled],
  );

  const pause = useCallback(() => {
    activeSideRef.current = null;
    setActiveSide(null);
  }, []);

  const switchTurn = useCallback(
    (nextSide: ChessClockSide) => {
      if (!enabled) return;
      if (incrementSeconds) {
        if (activeSideRef.current === "player") {
          playerMsRef.current += incrementSeconds * 1000;
          setPlayerMs(playerMsRef.current);
        } else if (activeSideRef.current === "engine") {
          engineMsRef.current += incrementSeconds * 1000;
          setEngineMs(engineMsRef.current);
        }
      }
      lastTickRef.current = Date.now();
      activeSideRef.current = nextSide;
      setActiveSide(nextSide);
    },
    [enabled, incrementSeconds],
  );

  useEffect(() => {
    if (!enabled || !activeSide) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      if (activeSide === "player") {
        playerMsRef.current = Math.max(0, playerMsRef.current - elapsed);
        setPlayerMs(playerMsRef.current);
        if (playerMsRef.current === 0 && !flaggedRef.current) {
          flaggedRef.current = true;
          onFlag("player");
        }
      } else {
        engineMsRef.current = Math.max(0, engineMsRef.current - elapsed);
        setEngineMs(engineMsRef.current);
        if (engineMsRef.current === 0 && !flaggedRef.current) {
          flaggedRef.current = true;
          onFlag("engine");
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [enabled, activeSide, onFlag]);

  return {
    enabled,
    playerMs: enabled ? playerMs : null,
    engineMs: enabled ? engineMs : null,
    activeSide,
    start,
    pause,
    switchTurn,
    reset,
  };
}

export function formatClockTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
