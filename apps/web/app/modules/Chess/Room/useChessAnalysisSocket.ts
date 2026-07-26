import { useEffect, useRef, useState } from "react";

import { acquireSocket, releaseSocket } from "~/api/socket";

type MovePayload = { sessionId: string; uciMove: string; fen: string; moveList: string[] };
type ResetFenPayload = { sessionId: string; fen: string };
type EndPayload = { sessionId: string };

type UseChessAnalysisSocketParams = {
  sessionId: string;
  enabled: boolean;
  onMove: (payload: MovePayload) => void;
  onResetFen: (payload: ResetFenPayload) => void;
  onEnded: (payload: EndPayload) => void;
};

export function useChessAnalysisSocket({
  sessionId,
  enabled,
  onMove,
  onResetFen,
  onEnded,
}: UseChessAnalysisSocketParams) {
  const [role, setRole] = useState<"host" | "viewer" | null>(null);
  const socketRef = useRef<ReturnType<typeof acquireSocket> | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const socket = acquireSocket();
    socketRef.current = socket;

    const joinRoom = () => {
      socket.emit(
        "join:chess-analysis",
        { sessionId },
        (response: { success: boolean; role: "host" | "viewer" }) => {
          if (response?.success) setRole(response.role);
        },
      );
    };

    const handleMove = (payload: MovePayload) => {
      if (payload.sessionId === sessionId) onMove(payload);
    };
    const handleResetFen = (payload: ResetFenPayload) => {
      if (payload.sessionId === sessionId) onResetFen(payload);
    };
    const handleEnd = (payload: EndPayload) => {
      if (payload.sessionId === sessionId) onEnded(payload);
    };

    socket.on("connect", joinRoom);
    socket.on("chess-analysis:move", handleMove);
    socket.on("chess-analysis:reset-fen", handleResetFen);
    socket.on("chess-analysis:end", handleEnd);
    socket.connect();

    if (socket.connected) joinRoom();

    return () => {
      socket.emit("leave:chess-analysis", { sessionId });
      socket.off("connect", joinRoom);
      socket.off("chess-analysis:move", handleMove);
      socket.off("chess-analysis:reset-fen", handleResetFen);
      socket.off("chess-analysis:end", handleEnd);
      releaseSocket();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, enabled]);

  const emitMove = (uciMove: string) => {
    socketRef.current?.emit("chess-analysis:move", { sessionId, uciMove });
  };

  const emitResetFen = (fen: string) => {
    socketRef.current?.emit("chess-analysis:reset-fen", { sessionId, fen });
  };

  const emitEnd = () => {
    socketRef.current?.emit("chess-analysis:end", { sessionId });
  };

  return { role, emitMove, emitResetFen, emitEnd };
}
