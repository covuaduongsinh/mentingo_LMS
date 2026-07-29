import { eq } from "drizzle-orm";

import { classroomInvites, classroomStudents, classroomTeachers } from "src/storage/schema";

import type { DatabasePg, UUIDType } from "src/common";

/**
 * GDPR delete/anonymize (Đợt C7): removes a user's footprint from every classroom instead of
 * leaving it orphaned — `classroom_teachers`/`classroom_students`/`classroom_invites` carry PII
 * (`realName`, `notes`) that isn't covered by the `users`-row scrub the callers already do, and
 * `user_id` has `ON DELETE CASCADE` that never fires because these flows soft-delete (UPDATE,
 * not DELETE) the `users` row. Takes the caller's already-open transaction handle.
 */
export async function ghostClassroomMembership(trx: DatabasePg, userId: UUIDType) {
  await trx.delete(classroomTeachers).where(eq(classroomTeachers.userId, userId));
  await trx.delete(classroomStudents).where(eq(classroomStudents.userId, userId));
  await trx.delete(classroomInvites).where(eq(classroomInvites.userId, userId));
}
