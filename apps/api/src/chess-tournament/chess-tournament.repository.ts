import { Inject, Injectable } from "@nestjs/common";
import {
  CHESS_MATCH_STATUSES,
  type ChessMatchResult,
  type ChessTournamentFormat,
  type ChessTournamentStatus,
} from "@repo/shared";
import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import {
  chessMatches,
  chessTournamentPairings,
  chessTournamentPlayers,
  chessTournaments,
  classroomStudents,
  groupUsers,
  users,
} from "src/storage/schema";

export type NewTournamentRow = {
  name: string;
  format: ChessTournamentFormat;
  groupId?: UUIDType;
  classroomId?: UUIDType;
  timeControlId: string;
  rated: boolean;
  roundCount?: number;
  durationMinutes?: number;
  hostUserId?: UUIDType;
  minRating?: number;
  maxRating?: number;
  minGamesPlayed?: number;
  createdByUserId: UUIDType;
};

@Injectable()
export class ChessTournamentRepository {
  constructor(@Inject("DB") private readonly db: DatabasePg) {}

  async createTournament(data: NewTournamentRow) {
    const [tournament] = await this.db.insert(chessTournaments).values(data).returning();
    return tournament;
  }

  async getTournamentById(id: UUIDType) {
    const [tournament] = await this.db
      .select()
      .from(chessTournaments)
      .where(eq(chessTournaments.id, id));
    return tournament;
  }

  async updateTournamentStatus(
    id: UUIDType,
    fields: Partial<{
      status: ChessTournamentStatus;
      currentRound: number;
      startsAt: Date;
      endsAt: Date;
    }>,
  ) {
    await this.db.update(chessTournaments).set(fields).where(eq(chessTournaments.id, id));
  }

  async findPlayer(tournamentId: UUIDType, userId: UUIDType) {
    const [player] = await this.db
      .select()
      .from(chessTournamentPlayers)
      .where(
        and(
          eq(chessTournamentPlayers.tournamentId, tournamentId),
          eq(chessTournamentPlayers.userId, userId),
        ),
      );
    return player;
  }

  async insertPlayer(tournamentId: UUIDType, userId: UUIDType) {
    const [player] = await this.db
      .insert(chessTournamentPlayers)
      .values({ tournamentId, userId })
      .onConflictDoNothing({
        target: [chessTournamentPlayers.tournamentId, chessTournamentPlayers.userId],
      })
      .returning();
    return player;
  }

  async insertPlayers(tournamentId: UUIDType, userIds: UUIDType[]) {
    if (!userIds.length) return;
    await this.db
      .insert(chessTournamentPlayers)
      .values(userIds.map((userId) => ({ tournamentId, userId })))
      .onConflictDoNothing({
        target: [chessTournamentPlayers.tournamentId, chessTournamentPlayers.userId],
      });
  }

  async getPlayersWithNames(tournamentId: UUIDType) {
    return this.db
      .select({
        userId: chessTournamentPlayers.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        withdrawnAt: chessTournamentPlayers.withdrawnAt,
      })
      .from(chessTournamentPlayers)
      .innerJoin(users, eq(chessTournamentPlayers.userId, users.id))
      .where(
        and(
          eq(chessTournamentPlayers.tournamentId, tournamentId),
          isNull(chessTournamentPlayers.withdrawnAt),
        ),
      );
  }

  async getGroupMemberIds(groupId: UUIDType) {
    const rows = await this.db
      .select({ userId: groupUsers.userId })
      .from(groupUsers)
      .where(eq(groupUsers.groupId, groupId));
    return rows.map((row) => row.userId);
  }

  /** Đợt C5 — classroom analog of getGroupMemberIds, active students only. */
  async getClassroomStudentIds(classroomId: UUIDType) {
    const rows = await this.db
      .select({ userId: classroomStudents.userId })
      .from(classroomStudents)
      .where(
        and(eq(classroomStudents.classroomId, classroomId), isNull(classroomStudents.archivedAt)),
      );
    return rows.map((row) => row.userId);
  }

  async insertPairings(
    rows: Array<{
      tournamentId: UUIDType;
      round: number;
      whiteUserId: UUIDType;
      blackUserId: UUIDType | null;
      matchId: UUIDType | null;
      result: ChessMatchResult | null;
    }>,
  ) {
    if (!rows.length) return [];
    return this.db.insert(chessTournamentPairings).values(rows).returning();
  }

  async getPairings(tournamentId: UUIDType) {
    return this.db
      .select()
      .from(chessTournamentPairings)
      .where(eq(chessTournamentPairings.tournamentId, tournamentId));
  }

  async getPairingsForRound(tournamentId: UUIDType, round: number) {
    return this.db
      .select()
      .from(chessTournamentPairings)
      .where(
        and(
          eq(chessTournamentPairings.tournamentId, tournamentId),
          eq(chessTournamentPairings.round, round),
        ),
      );
  }

  /** Copies the result from `chess_matches` onto any pairing whose match has since finished. */
  async syncPairingResults(tournamentId: UUIDType) {
    const unsynced = await this.db
      .select({
        pairingId: chessTournamentPairings.id,
        matchId: chessTournamentPairings.matchId,
      })
      .from(chessTournamentPairings)
      .where(
        and(
          eq(chessTournamentPairings.tournamentId, tournamentId),
          isNull(chessTournamentPairings.result),
          isNotNull(chessTournamentPairings.matchId),
        ),
      );

    const withMatchId = unsynced.filter(
      (row): row is { pairingId: UUIDType; matchId: UUIDType } => row.matchId !== null,
    );
    if (!withMatchId.length) return;

    for (const { pairingId, matchId } of withMatchId) {
      const [match] = await this.db
        .select({ status: chessMatches.status, result: chessMatches.result })
        .from(chessMatches)
        .where(eq(chessMatches.id, matchId));

      if (match?.status === CHESS_MATCH_STATUSES.FINISHED && match.result) {
        await this.db
          .update(chessTournamentPairings)
          .set({ result: match.result })
          .where(eq(chessTournamentPairings.id, pairingId));
      }
    }
  }
}
