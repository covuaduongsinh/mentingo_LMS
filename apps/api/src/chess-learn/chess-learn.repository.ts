import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { chessLearnProgress } from "src/storage/schema";

@Injectable()
export class ChessLearnRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async getCompletedLevelKeys(userId: UUIDType): Promise<Set<string>> {
    const rows = await this.db
      .select({ stageId: chessLearnProgress.stageId, levelId: chessLearnProgress.levelId })
      .from(chessLearnProgress)
      .where(eq(chessLearnProgress.userId, userId));

    return new Set(rows.map((row) => `${row.stageId}:${row.levelId}`));
  }

  async isLevelCompleted(userId: UUIDType, stageId: string, levelId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ total: count() })
      .from(chessLearnProgress)
      .where(
        and(
          eq(chessLearnProgress.userId, userId),
          eq(chessLearnProgress.stageId, stageId),
          eq(chessLearnProgress.levelId, levelId),
        ),
      );
    return (row?.total ?? 0) > 0;
  }

  async markCompleted(userId: UUIDType, stageId: string, levelId: string) {
    await this.db
      .insert(chessLearnProgress)
      .values({ userId, stageId, levelId })
      .onConflictDoNothing({
        target: [chessLearnProgress.userId, chessLearnProgress.stageId, chessLearnProgress.levelId],
      });
  }
}
