import { Inject, Injectable } from "@nestjs/common";
import { SYSTEM_ROLE_SLUGS } from "@repo/shared";
import { and, eq, gte, inArray, isNull, or } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import {
  chessClassLoginCodes,
  chessMatches,
  chessPuzzleAttempts,
  chessRatingHistory,
  chessRatings,
  createTokens,
  credentials,
  groupUsers,
  permissionRoles,
  permissionUserRoles,
  userOnboarding,
  users,
} from "src/storage/schema";

export type NewManagedUserRow = {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  realName: string;
  managedByUserId: UUIDType;
};

@Injectable()
export class ChessClassRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async findExistingUsernames(candidates: string[]): Promise<Set<string>> {
    if (!candidates.length) return new Set();

    const rows = await this.db
      .select({ username: users.username })
      .from(users)
      .where(inArray(users.username, candidates));

    return new Set(
      rows.map((row) => row.username).filter((username): username is string => !!username),
    );
  }

  async findStudentRoleId(tenantId: UUIDType): Promise<UUIDType | null> {
    const [role] = await this.db
      .select({ id: permissionRoles.id })
      .from(permissionRoles)
      .where(
        and(
          eq(permissionRoles.tenantId, tenantId),
          eq(permissionRoles.slug, SYSTEM_ROLE_SLUGS.STUDENT),
        ),
      );

    return role?.id ?? null;
  }

  async insertManagedUsers(rows: NewManagedUserRow[], trx: DatabasePg) {
    if (!rows.length) return [];

    return trx
      .insert(users)
      .values(rows.map((row) => ({ ...row, isManagedAccount: true })))
      .returning();
  }

  async insertCredentials(
    rows: Array<{ userId: UUIDType; hashedPassword: string }>,
    trx: DatabasePg,
  ) {
    if (!rows.length) return;

    await trx
      .insert(credentials)
      .values(rows.map(({ userId, hashedPassword }) => ({ userId, password: hashedPassword })));
  }

  async insertOnboardingRows(userIds: UUIDType[], trx: DatabasePg) {
    if (!userIds.length) return;

    await trx.insert(userOnboarding).values(userIds.map((userId) => ({ userId })));
  }

  async insertRoleAssignments(
    rows: Array<{ userId: UUIDType; roleId: UUIDType }>,
    trx: DatabasePg,
  ) {
    if (!rows.length) return;

    await trx.insert(permissionUserRoles).values(rows);
  }

  async getGroupMembers(groupId: UUIDType) {
    return this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        realName: users.realName,
        isManagedAccount: users.isManagedAccount,
        managedByUserId: users.managedByUserId,
      })
      .from(groupUsers)
      .innerJoin(users, eq(groupUsers.userId, users.id))
      .where(eq(groupUsers.groupId, groupId));
  }

  async getManagedStudentById(userId: UUIDType) {
    const [student] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isManagedAccount, true)));

    return student ?? null;
  }

  async updatePassword(userId: UUIDType, hashedPassword: string) {
    await this.db
      .update(credentials)
      .set({ password: hashedPassword })
      .where(eq(credentials.userId, userId));
  }

  async findUserByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async releaseAccount(userId: UUIDType, email: string) {
    await this.db
      .update(users)
      .set({ email, isManagedAccount: false, managedByUserId: null })
      .where(eq(users.id, userId));
  }

  async insertCreateToken(userId: UUIDType, tokenHash: string, expiryDate: Date) {
    await this.db.insert(createTokens).values({ userId, tokenHash, expiryDate });
  }

  async invalidateActiveLoginCodes(userIds: UUIDType[]) {
    if (!userIds.length) return;

    await this.db
      .update(chessClassLoginCodes)
      .set({ consumedAt: new Date() })
      .where(
        and(inArray(chessClassLoginCodes.userId, userIds), isNull(chessClassLoginCodes.consumedAt)),
      );
  }

  async insertLoginCodes(
    rows: Array<{ userId: UUIDType; groupId: UUIDType; codeHash: string; expiresAt: Date }>,
  ) {
    if (!rows.length) return [];

    return this.db.insert(chessClassLoginCodes).values(rows).returning();
  }

  async getRatingsForUsers(userIds: UUIDType[]) {
    if (!userIds.length) return [];

    return this.db.select().from(chessRatings).where(inArray(chessRatings.userId, userIds));
  }

  async getRatingHistoryForUsers(userIds: UUIDType[], since: Date) {
    if (!userIds.length) return [];

    return this.db
      .select()
      .from(chessRatingHistory)
      .where(
        and(
          inArray(chessRatingHistory.userId, userIds),
          gte(chessRatingHistory.createdAt, since.toISOString()),
        ),
      );
  }

  async getFinishedMatchesForUsers(userIds: UUIDType[], since: Date) {
    if (!userIds.length) return [];

    return this.db
      .select({
        whiteUserId: chessMatches.whiteUserId,
        blackUserId: chessMatches.blackUserId,
        result: chessMatches.result,
      })
      .from(chessMatches)
      .where(
        and(
          eq(chessMatches.status, "finished"),
          gte(chessMatches.createdAt, since.toISOString()),
          or(
            inArray(chessMatches.whiteUserId, userIds),
            inArray(chessMatches.blackUserId, userIds),
          ),
        ),
      );
  }

  async getPuzzleAttemptsForUsers(userIds: UUIDType[], since: Date) {
    if (!userIds.length) return [];

    return this.db
      .select({ userId: chessPuzzleAttempts.userId, correct: chessPuzzleAttempts.correct })
      .from(chessPuzzleAttempts)
      .where(
        and(
          inArray(chessPuzzleAttempts.userId, userIds),
          gte(chessPuzzleAttempts.createdAt, since.toISOString()),
        ),
      );
  }
}
