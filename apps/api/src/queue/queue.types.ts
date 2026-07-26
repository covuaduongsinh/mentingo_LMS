import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

export const QUEUE_NAMES = {
  DOCUMENT_INGESTION: "document-ingestion",
  LEARNING_TIME: "learning-time",
  MASTER_COURSE_EXPORT: "master-course-export",
  MASTER_COURSE_SYNC: "master-course-sync",
  LEARNING_PATH_EXPORT: "learning-path-export",
  LEARNING_PATH_SYNC: "learning-path-sync",
  AUDIO: "audio",
  SCORM_IMPORT: "scorm-import",
  COURSE_DUPLICATION: "course-duplication",
  LUMA_COURSE_GENERATION_SYNC: "luma-course-generation-sync",
  WEBHOOK_DELIVERY: "webhook-delivery",
  CHESS_PUZZLE_IMPORT: "chess-puzzle-import",
  CHESS_MATCH_TIMEOUT_CHECK: "chess-match-timeout-check",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface LearningTimeJobData {
  userId: string;
  lessonId: string;
  courseId: string;
  tenantId?: string;
  secondsToAdd: number;
  timestamp: number;
}

export interface DocumentIngestionJobData {
  tenantId: UUIDType;
  lessonId: UUIDType;
  file: Express.Multer.File;
}

export interface MasterCourseExportJobData {
  sourceCourseId: string;
  sourceTenantId: string;
  targetTenantId: string;
  actorId: string;
}

export interface MasterCourseSyncJobData {
  exportId: string;
  sourceCourseId: string;
  sourceTenantId: string;
  targetTenantId: string;
  triggerEventType: string;
}

export interface LearningPathExportJobData {
  exportId: string;
  sourceLearningPathId: string;
  sourceTenantId: string;
  targetTenantId: string;
  actorId: string;
}

export interface LearningPathSyncJobData {
  exportId: string;
  sourceLearningPathId: string;
  sourceTenantId: string;
  targetTenantId: string;
  triggerEventType: string;
}

export interface LumaCourseGenerationSyncJobData {
  courseId: UUIDType;
  currentUser: CurrentUserType;
}

export interface CourseDuplicationJobData {
  tenantId: UUIDType;
  sourceCourseId: UUIDType;
  targetCourseId: UUIDType;
  actor: CurrentUserType;
}

export interface WebhookDeliveryJobData {
  tenantId: UUIDType;
  webhookEndpointId: UUIDType;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface ChessPuzzleImportJobData {
  tenantId: UUIDType;
  csv: string;
  minRating?: number;
  maxRating?: number;
  motifs?: string[];
  maxCount?: number;
}

export interface ChessMatchTimeoutCheckJobData {
  tenantId: UUIDType;
  matchId: UUIDType;
  /** The match's lastMoveAt (as epoch ms) at the moment this check was scheduled — if the
   * match's lastMoveAt has since changed, a move happened and this check is stale/no-ops. */
  expectedLastMoveAtMs: number;
  /** Which side was on the clock when this check was scheduled. */
  expiringUserId: UUIDType;
}
