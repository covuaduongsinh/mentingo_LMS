import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";

import { AssignmentsService } from "./assignments.service";

@Injectable()
export class AssignmentsCron {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly tenantRunner: TenantDbRunnerService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async notifyStudentsAboutAssignmentDueDatesPerDay() {
    await this.tenantRunner.runForEachTenant(async () => {
      await this.assignmentsService.sendAssignmentDueDateReminders();
    });
  }
}
