import type { PermissionKey } from "@repo/shared";
import type { Socket } from "socket.io";

export interface HeartbeatPayload {
  lessonId: string;
  courseId: string;
  timestamp: number;
  isActive: boolean;
}

export interface JoinLessonPayload {
  lessonId: string;
  courseId: string;
}

export interface LeaveLessonPayload {
  lessonId: string;
}

export interface JoinLiveTrainingPayload {
  liveTrainingId: string;
}

export interface LeaveLiveTrainingPayload {
  liveTrainingId: string;
}

export interface JoinChessAnalysisPayload {
  sessionId: string;
}

export interface LeaveChessAnalysisPayload {
  sessionId: string;
}

export interface ChessAnalysisMovePayload {
  sessionId: string;
  uciMove: string;
}

export interface ChessAnalysisResetFenPayload {
  sessionId: string;
  fen: string;
}

export interface ChessAnalysisEndPayload {
  sessionId: string;
}

export interface WsUser {
  userId: string;
  email: string;
  roleSlugs: string[];
  permissions: PermissionKey[];
  tenantId: string;
}

export type AuthenticatedSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  { user: WsUser }
>;
