import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";

import { ClassroomService } from "./classroom.service";

@Injectable()
export class ClassroomCron {
  private readonly logger = new Logger(ClassroomCron.name);

  constructor(
    private readonly classroomService: ClassroomService,
    private readonly tenantRunner: TenantDbRunnerService,
  ) {}

  /** Đợt C4 — archives classrooms no teacher has opened in 30 days. Dry-run by default: always
   * logs the candidate count, only writes when CLASSROOM_AUTO_ARCHIVE_ENABLED=true. */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoArchiveInactiveClassroomsPerTenant() {
    const isEnabled = process.env.CLASSROOM_AUTO_ARCHIVE_ENABLED === "true";

    await this.tenantRunner.runForEachTenant(async (tenantId) => {
      const { candidateCount } = await this.classroomService.autoArchiveInactiveClassrooms();

      if (!candidateCount) return;

      this.logger.log(
        isEnabled
          ? `Auto-archived ${candidateCount} inactive classroom(s) for tenant ${tenantId}`
          : `[dry-run] ${candidateCount} inactive classroom(s) would be auto-archived for tenant ${tenantId}`,
      );
    });
  }
}
