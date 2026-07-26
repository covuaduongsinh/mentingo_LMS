import { Inject, Injectable } from "@nestjs/common";
import { and, eq, ne } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { userDetails, users } from "src/storage/schema";

@Injectable()
export class PublicProfileRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async getPublicProfileByUsername(username: string) {
    const [profile] = await this.db
      .select({
        userId: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarReference: users.avatarReference,
        publicProfileEnabled: users.publicProfileEnabled,
        bio: userDetails.description,
      })
      .from(users)
      .leftJoin(userDetails, eq(userDetails.userId, users.id))
      .where(and(eq(users.username, username), eq(users.publicProfileEnabled, true)));

    return profile;
  }

  async getOwnSettings(userId: UUIDType) {
    const [row] = await this.db
      .select({
        username: users.username,
        publicProfileEnabled: users.publicProfileEnabled,
        bio: userDetails.description,
      })
      .from(users)
      .leftJoin(userDetails, eq(userDetails.userId, users.id))
      .where(eq(users.id, userId));

    return row;
  }

  async isUsernameTaken(username: string, excludingUserId: UUIDType) {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, username), ne(users.id, excludingUserId)));

    return Boolean(row);
  }

  async updateUsernameAndVisibility(
    userId: UUIDType,
    data: { username: string | null; publicProfileEnabled: boolean },
  ) {
    await this.db.update(users).set(data).where(eq(users.id, userId));
  }

  async upsertBio(userId: UUIDType, tenantId: UUIDType, bio: string | null) {
    const [existing] = await this.db
      .select({ id: userDetails.id })
      .from(userDetails)
      .where(eq(userDetails.userId, userId));

    if (existing) {
      await this.db
        .update(userDetails)
        .set({ description: bio })
        .where(eq(userDetails.userId, userId));
      return;
    }

    await this.db.insert(userDetails).values({ userId, description: bio, tenantId });
  }
}
