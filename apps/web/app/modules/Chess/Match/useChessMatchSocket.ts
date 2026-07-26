import { useEffect, useRef, useState } from "react";

import { acquireSocket, releaseSocket } from "~/api/socket";

type Role = "white" | "black" | "viewer";

type MovePayload = {
  matchId: string;
  fen: string;
  san: string;
  whiteTimeRemainingMs: number;
  blackTimeRemainingMs: number;
  finished: boolean;
  lastMoveAtMs?: number;
};

type EndPayload = {
  matchId: string;
  finished: true;
  result: "white_win" | "black_win" | "draw";
  endReason: string;
};

type DrawOfferedPayload = { matchId: string; offeredByUserId: string };

type UseChessMatchSocketParams = {
  matchId: string;
  enabled: boolean;
  onMove: (payload: MovePayload) => void;
  onEnd: (payload: EndPayload) => void;
  onDrawOffered: (payload: DrawOfferedPayload) => void;
};

export function useChessMatchSocket({
  matchId,
  enabled,
  onMove,
  onEnd,
  onDrawOffered,
}: UseChessMatchSocketParams) {
  const [role, setRole] = useState<Role | null>(null);
  const socketRef = useRef<ReturnType<typeof acquireSocket> | null>(null);

  useEffect(() => {
    if (!enabled || !matchId) return;

    const socket = acquireSocket();
    socketRef.current = socket;

    const joinRoom = () => {
      socket.emit("join:chess-match", { matchId }, (response: { success: boolean; role: Role }) => {
        if (response?.success) setRole(response.role);
      });
    };

    const handleMove = (payload: MovePayload) => {
      if (payload.matchId === matchId) onMove(payload);
    };
    const handleEnd = (payload: EndPayload) => {
      if (payload.matchId === matchId) onEnd(payload);
    };
    const handleDrawOffered = (payload: DrawOfferedPayload) => {
      if (payload.matchId === matchId) onDrawOffered(payload);
    };

    socket.on("connect", joinRoom);
    socket.on("chess-match:move", handleMove);
    socket.on("chess-match:end", handleEnd);
    socket.on("chess-match:draw-offered", handleDrawOffered);
    socket.connect();

    if (socket.connected) joinRoom();

    return () => {
      socket.emit("leave:chess-match", { matchId });
      socket.off("connect", joinRoom);
      socket.off("chess-match:move", handleMove);
      socket.off("chess-match:end", handleEnd);
      socket.off("chess-match:draw-offered", handleDrawOffered);
      releaseSocket();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, enabled]);

  const emitMove = (uciMove: string) => {
    socketRef.current?.emit("chess-match:move", { matchId, uciMove });
  };

  const emitResign = () => {
    socketRef.current?.emit("chess-match:resign", { matchId });
  };

  const emitOfferDraw = () => {
    socketRef.current?.emit("chess-match:offer-draw", { matchId });
  };

  const emitAcceptDraw = () => {
    socketRef.current?.emit("chess-match:accept-draw", { matchId });
  };

  return { role, emitMove, emitResign, emitOfferDraw, emitAcceptDraw };
}
