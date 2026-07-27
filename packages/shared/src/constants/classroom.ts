/**
 * Classroom domain constants — a standalone classroom entity independent of
 * `groups` (the HR/L&D cohort concept). Designed after a clean-room teardown of
 * lila's `clas` module; see docs/research/lila/06-clas-teardown.md and
 * docs/specs/classroom-business-spec.md.
 */

/** Hard caps mirrored from the reference system's design (configurable defaults, not hardcoded limits). */
export const CLASSROOM_DEFAULTS = {
  MAX_STUDENTS: 100,
  MAX_TEACHERS: 10,
} as const;

/** Login code lifetime, in milliseconds — a fresh batch invalidates any still-active batch. */
export const CLASSROOM_LOGIN_CODE_EXPIRATION_MS = 15 * 60 * 1000;

export const CLASSROOM_LOGIN_CODE_LENGTH = 5;

export const CLASSROOM_INVITE_STATUSES = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
} as const;

export type ClassroomInviteStatus =
  (typeof CLASSROOM_INVITE_STATUSES)[keyof typeof CLASSROOM_INVITE_STATUSES];

export const CLASSROOM_BULK_ACTIONS = {
  ARCHIVE: "archive",
  RESTORE: "restore",
  REMOVE: "remove",
  MOVE: "move",
} as const;

export type ClassroomBulkAction =
  (typeof CLASSROOM_BULK_ACTIONS)[keyof typeof CLASSROOM_BULK_ACTIONS];
