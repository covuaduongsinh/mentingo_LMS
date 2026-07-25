import { Logger } from "@nestjs/common";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import {
  AssignmentDueDateReminderEmail,
  getAssignmentDueDateReminderEmailTranslations,
} from "@repo/email-templates";
import {
  ANNOUNCEMENT_EMAIL_TEMPLATES,
  ANNOUNCEMENT_SOURCE_TYPES,
  ANNOUNCEMENT_STATUSES,
} from "@repo/shared";

import { AnnouncementsRepository } from "src/announcements/announcements.repository";
import { EMAIL_BATCH_SIZE } from "src/common/emails/email.constants";
import { EmailService } from "src/common/emails/emails.service";
import { getEmailSubject } from "src/common/emails/translations";
import { processInBatches } from "src/common/utils/processInBatches";
import { AnnouncementPublishedEvent, AssignmentDueDateReminderEmailEvent } from "src/events";
import { OutboxPublisher } from "src/outbox/outbox.publisher";
import { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";

import type { AssignmentDueDateReminderRecipient } from "../types/assignment-due-date-reminder.types";

@EventsHandler(AssignmentDueDateReminderEmailEvent)
export class AssignmentDueDateReminderEmailHandler
  implements IEventHandler<AssignmentDueDateReminderEmailEvent>
{
  private readonly logger = new Logger(AssignmentDueDateReminderEmailHandler.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly announcementsRepository: AnnouncementsRepository,
    private readonly outboxPublisher: OutboxPublisher,
    private readonly tenantRunner: TenantDbRunnerService,
  ) {}

  async handle(event: AssignmentDueDateReminderEmailEvent) {
    const { recipients } = event.assignmentDueDateReminderEmailData;

    await processInBatches(
      recipients,
      (recipient) => this.sendAssignmentDueDateReminder(recipient),
      {
        batchSize: EMAIL_BATCH_SIZE,
        throwOnError: false,
        onItemError: (error, recipient) => {
          const reason = error instanceof Error ? error.stack : String(error);

          this.logger.error(
            `Assignment due date reminder failed for student ${recipient.studentId} and lesson ${recipient.lessonId}`,
            reason,
          );
        },
      },
    );
  }

  private async sendAssignmentDueDateReminder(recipient: AssignmentDueDateReminderRecipient) {
    await this.sendAssignmentDueDateReminderEmail(recipient);
    await this.createAssignmentDueDateReminderAnnouncement(recipient);
  }

  private async sendAssignmentDueDateReminderEmail(recipient: AssignmentDueDateReminderRecipient) {
    const { text, html } = new AssignmentDueDateReminderEmail({
      assignmentName: recipient.assignmentName,
      assignmentLink: `${recipient.tenantHost.replace(/\/$/, "")}/course/${recipient.courseId}/lesson/${recipient.lessonId}`,
      daysBeforeDueDate: recipient.daysBeforeDueDate,
      ...recipient.defaultEmailSettings,
    });

    await this.emailService.sendEmailWithLogo(
      {
        to: recipient.studentEmail,
        subject: getEmailSubject(
          "assignmentDueDateReminderEmail",
          recipient.defaultEmailSettings.language,
          { assignmentName: recipient.assignmentName },
        ),
        text,
        html,
      },
      { tenantId: recipient.tenantId },
    );
  }

  private async createAssignmentDueDateReminderAnnouncement(
    recipient: AssignmentDueDateReminderRecipient,
  ) {
    const { language } = recipient.defaultEmailSettings;

    const { heading, paragraphs } = getAssignmentDueDateReminderEmailTranslations(
      language,
      recipient.assignmentName,
      recipient.daysBeforeDueDate,
    );

    await this.tenantRunner.runWithTenant(recipient.tenantId, async () => {
      const announcement = await this.announcementsRepository.createAnnouncement({
        groupId: null,
        title: { [language]: heading },
        content: { [language]: paragraphs.join("\n") },
        baseLanguage: language,
        availableLocales: [language],
        authorId: recipient.courseAuthorId,
        status: ANNOUNCEMENT_STATUSES.PUBLISHED,
        scheduledAt: null,
        publishedAt: new Date().toISOString(),
        sendEmail: false,
        emailTemplate: ANNOUNCEMENT_EMAIL_TEMPLATES.DEFAULT,
        sourceType: ANNOUNCEMENT_SOURCE_TYPES.ASSIGNMENT_DUE_DATE_REMINDER,
        sourceId: recipient.lessonId,
      });

      await this.announcementsRepository.createUserAnnouncementRecords(
        [recipient.studentId],
        announcement.id,
      );

      await this.outboxPublisher.publish(
        new AnnouncementPublishedEvent({ announcementId: announcement.id }),
      );
    });
  }
}
