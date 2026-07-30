import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { and, count, eq, isNull, not, sql } from "drizzle-orm";

import { ghostClassroomMembership } from "src/classroom/utils/ghost-classroom-membership";
import { DatabasePg, type UUIDType } from "src/common";
import { userHasPermissionCondition } from "src/common/permissions/permission-sql.utils";
import { UserAnonymizedEvent } from "src/events/user/user-anonymized.event";
import { OutboxPublisher } from "src/outbox/outbox.publisher";
import { DB } from "src/storage/db/db.providers";
import {
  assignmentTaskSubmissions,
  assignmentUserSubmissions,
  certificates,
  communityComments,
  communityPosts,
  communityVotes,
  courseChatMessages,
  createTokens,
  credentials as credentialsTable,
  magicLinkTokens,
  quizAttempts,
  resetTokens,
  studentChapterProgress,
  studentCourses,
  studentLessonProgress,
  studentQuestionAnswers,
  userDetails,
  users,
  userStatistics,
} from "src/storage/schema";

import type { CurrentUserType } from "src/common/types/current-user.type";

@Injectable()
export class GdprService {
  constructor(
    @Inject(DB) private readonly db: DatabasePg,
    private readonly outboxPublisher: OutboxPublisher,
  ) {}

  async exportUserData(userId: UUIDType) {
    const [profile] = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        avatarReference: users.avatarReference,
        publicProfileEnabled: users.publicProfileEnabled,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!profile) throw new NotFoundException("User not found");

    const [details] = await this.db
      .select({
        contactPhoneNumber: userDetails.contactPhoneNumber,
        description: userDetails.description,
        contactEmail: userDetails.contactEmail,
        jobTitle: userDetails.jobTitle,
      })
      .from(userDetails)
      .where(eq(userDetails.userId, userId))
      .limit(1);

    const [
      courses,
      lessonProgress,
      chapterProgress,
      quizzes,
      questionAnswers,
      taskSubmissions,
      assignmentSubmissions,
      earnedCertificates,
      posts,
      comments,
      votes,
      chatMessages,
      statistics,
    ] = await Promise.all([
      this.db.select().from(studentCourses).where(eq(studentCourses.studentId, userId)),
      this.db
        .select()
        .from(studentLessonProgress)
        .where(eq(studentLessonProgress.studentId, userId)),
      this.db
        .select()
        .from(studentChapterProgress)
        .where(eq(studentChapterProgress.studentId, userId)),
      this.db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)),
      this.db
        .select()
        .from(studentQuestionAnswers)
        .where(eq(studentQuestionAnswers.studentId, userId)),
      this.db
        .select()
        .from(assignmentTaskSubmissions)
        .where(eq(assignmentTaskSubmissions.userId, userId)),
      this.db
        .select()
        .from(assignmentUserSubmissions)
        .where(eq(assignmentUserSubmissions.userId, userId)),
      this.db.select().from(certificates).where(eq(certificates.userId, userId)),
      this.db.select().from(communityPosts).where(eq(communityPosts.authorId, userId)),
      this.db.select().from(communityComments).where(eq(communityComments.authorId, userId)),
      this.db.select().from(communityVotes).where(eq(communityVotes.userId, userId)),
      this.db.select().from(courseChatMessages).where(eq(courseChatMessages.userId, userId)),
      this.db.select().from(userStatistics).where(eq(userStatistics.userId, userId)),
    ]);

    return {
      profile,
      details: details ?? null,
      learning: {
        courses,
        lessonProgress,
        chapterProgress,
        quizzes,
        questionAnswers,
        taskSubmissions,
        assignmentSubmissions,
        certificates: earnedCertificates,
      },
      community: {
        posts,
        comments,
        votes,
        chatMessages,
      },
      systemStats: statistics,
    };
  }

  async anonymizeUser(actor: CurrentUserType, userId: UUIDType) {
    const [target] = await this.db
      .select({ id: users.id, tenantId: users.tenantId })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!target) throw new NotFoundException("User not found");

    const [{ remainingAdmins }] = await this.db
      .select({ remainingAdmins: count() })
      .from(users)
      .where(
        and(
          eq(users.tenantId, target.tenantId),
          not(eq(users.id, userId)),
          isNull(users.deletedAt),
          userHasPermissionCondition(this.db, users.id, users.tenantId, PERMISSIONS.USER_MANAGE),
        ),
      );

    const [targetAdminRow] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          userHasPermissionCondition(this.db, users.id, users.tenantId, PERMISSIONS.USER_MANAGE),
        ),
      )
      .limit(1);

    if (targetAdminRow && remainingAdmins === 0) {
      throw new BadRequestException(
        "Cannot anonymize the last remaining admin of this organization",
      );
    }

    await this.db.transaction(async (trx) => {
      const idPart = userId.split("-")[0];

      await trx
        .update(users)
        .set({
          deletedAt: sql`NOW()`,
          email: `deleted_${idPart}@anonymized.local`,
          firstName: "Deleted",
          lastName: "User",
          avatarReference: null,
          username: null,
          publicProfileEnabled: false,
        })
        .where(eq(users.id, userId));

      await trx
        .update(userDetails)
        .set({
          contactPhoneNumber: null,
          description: null,
          contactEmail: null,
          jobTitle: null,
        })
        .where(eq(userDetails.userId, userId));

      await trx.delete(resetTokens).where(eq(resetTokens.userId, userId));
      await trx.delete(createTokens).where(eq(createTokens.userId, userId));
      await trx.delete(magicLinkTokens).where(eq(magicLinkTokens.userId, userId));
      await trx.delete(credentialsTable).where(eq(credentialsTable.userId, userId));
      await ghostClassroomMembership(trx, userId);

      await this.outboxPublisher.publish(new UserAnonymizedEvent({ userId, actor }), trx);
    });

    return { message: "user.gdpr.toast.anonymizeSuccess" };
  }
}
