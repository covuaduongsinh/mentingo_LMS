import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { SYSTEM_ROLE_SLUGS } from "@repo/shared";
import { nanoid } from "nanoid";

import { CHESS_CLASS_LOGIN_CODE_EXPIRATION_TIME } from "src/auth/consts";
import { hashToken } from "src/auth/utils/hash-auth-token";
import { ChessPuzzleService } from "src/chess/chess-puzzle.service";
import { DatabasePg, type UUIDType } from "src/common";
import hashPassword from "src/common/helpers/hashPassword";
import { GroupService } from "src/group/group.service";
import { SettingsService } from "src/settings/settings.service";

import { ChessClassRepository, type NewManagedUserRow } from "./chess-class.repository";
import {
  generateManagedAccountEmail,
  generatePseudonym,
  generateSafeCode,
  generateUsernameCandidate,
} from "./utils/safe-code.utils";

import type { CurrentUserType } from "src/common/types/current-user.type";

const LOGIN_CODE_LENGTH = 5;
const TEMP_PASSWORD_LENGTH = 10;
const USERNAME_GENERATION_MAX_ATTEMPTS = 5;
const CREATE_TOKEN_EXPIRATION_YEARS = 1;

type CreatedStudent = {
  userId: UUIDType;
  username: string;
  temporaryPassword: string;
  realName: string;
};

@Injectable()
export class ChessClassService {
  constructor(
    @Inject("DB") private readonly db: DatabasePg,
    private readonly repository: ChessClassRepository,
    private readonly groupService: GroupService,
    private readonly chessPuzzleService: ChessPuzzleService,
    private readonly settingsService: SettingsService,
  ) {}

  async bulkCreateStudents(
    currentUser: CurrentUserType,
    groupId: UUIDType,
    names: string[],
  ): Promise<CreatedStudent[]> {
    const trimmedNames = names.map((name) => name.trim()).filter(Boolean);
    if (!trimmedNames.length) {
      throw new BadRequestException("chessClass.error.noNamesProvided");
    }

    const roleId = await this.repository.findStudentRoleId(currentUser.tenantId);
    if (!roleId) throw new BadRequestException("chessClass.error.studentRoleUnavailable");

    const usernames = await this.generateUniqueUsernames(trimmedNames.length);
    const plainPasswords = trimmedNames.map(() => generateSafeCode(TEMP_PASSWORD_LENGTH));
    const hashedPasswords = await Promise.all(
      plainPasswords.map((password) => hashPassword(password)),
    );

    const insertRows: NewManagedUserRow[] = trimmedNames.map((realName, index) => {
      const pseudonym = generatePseudonym();
      return {
        email: generateManagedAccountEmail(),
        firstName: pseudonym.firstName,
        lastName: pseudonym.lastName,
        username: usernames[index],
        realName,
        managedByUserId: currentUser.userId,
      };
    });

    const createdUsers = await this.db.transaction(async (trx) => {
      const created = await this.repository.insertManagedUsers(insertRows, trx);

      const userIds = created.map((user) => user.id);

      await this.repository.insertCredentials(
        created.map((user, index) => ({ userId: user.id, hashedPassword: hashedPasswords[index] })),
        trx,
      );
      await this.repository.insertOnboardingRows(userIds, trx);
      await this.repository.insertRoleAssignments(
        userIds.map((userId) => ({ userId, roleId })),
        trx,
      );
      await this.settingsService.createSettingsForUsers(
        userIds.map((userId) => ({ userId, roleSlugs: [SYSTEM_ROLE_SLUGS.STUDENT] })),
        trx,
      );
      await this.groupService.insertUsersGroupAssignmentsBulk(
        userIds.map((userId) => ({ userId, groupIds: [groupId] })),
        trx,
      );

      return created;
    });

    return createdUsers.map((user, index) => ({
      userId: user.id,
      username: usernames[index],
      temporaryPassword: plainPasswords[index],
      realName: trimmedNames[index],
    }));
  }

  async resetStudentPassword(currentUser: CurrentUserType, userId: UUIDType): Promise<string> {
    const student = await this.getManagedStudentOrThrow(currentUser, userId);

    const temporaryPassword = generateSafeCode(TEMP_PASSWORD_LENGTH);
    const hashedPassword = await hashPassword(temporaryPassword);

    await this.repository.updatePassword(student.id, hashedPassword);

    return temporaryPassword;
  }

  async releaseStudentAccount(
    currentUser: CurrentUserType,
    userId: UUIDType,
    email: string,
  ): Promise<string> {
    const student = await this.getManagedStudentOrThrow(currentUser, userId);

    const existing = await this.repository.findUserByEmail(email);
    if (existing) throw new BadRequestException("chessClass.error.emailAlreadyExists");

    await this.repository.releaseAccount(student.id, email);

    const createToken = nanoid(64);
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + CREATE_TOKEN_EXPIRATION_YEARS);

    await this.repository.insertCreateToken(student.id, hashToken(createToken), expiryDate);

    return createToken;
  }

  async generateLoginCodes(currentUser: CurrentUserType, groupId: UUIDType) {
    const members = await this.repository.getGroupMembers(groupId);
    const managedMembers = members.filter((member) => member.isManagedAccount);

    if (!managedMembers.length) {
      throw new BadRequestException("chessClass.error.noManagedStudentsInGroup");
    }

    await this.repository.invalidateActiveLoginCodes(managedMembers.map((member) => member.id));

    const expiresAt = new Date(Date.now() + CHESS_CLASS_LOGIN_CODE_EXPIRATION_TIME);
    const plainCodesByUserId = new Map(
      managedMembers.map((member) => [member.id, generateSafeCode(LOGIN_CODE_LENGTH)]),
    );

    await this.repository.insertLoginCodes(
      managedMembers.map((member) => ({
        userId: member.id,
        groupId,
        codeHash: hashToken(plainCodesByUserId.get(member.id) as string),
        expiresAt,
      })),
    );

    return {
      codes: managedMembers.map((member) => ({
        userId: member.id,
        username: member.username,
        displayName: `${member.firstName} ${member.lastName}`.trim(),
        code: plainCodesByUserId.get(member.id) as string,
      })),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getClassProgress(groupId: UUIDType, days: number) {
    const members = await this.repository.getGroupMembers(groupId);
    const userIds = members.map((member) => member.id);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [ratings, ratingHistory, finishedMatches, puzzleAttempts] = await Promise.all([
      this.repository.getRatingsForUsers(userIds),
      this.repository.getRatingHistoryForUsers(userIds, since),
      this.repository.getFinishedMatchesForUsers(userIds, since),
      this.repository.getPuzzleAttemptsForUsers(userIds, since),
    ]);

    const students = await Promise.all(
      members.map(async (member) => {
        const memberRatings = ratings.filter((rating) => rating.userId === member.id);
        const memberRatingHistory = ratingHistory.filter((row) => row.userId === member.id);

        const memberMatches = finishedMatches.filter(
          (match) => match.whiteUserId === member.id || match.blackUserId === member.id,
        );
        const matchesWon = memberMatches.filter((match) => {
          const isWhite = match.whiteUserId === member.id;
          return (
            (isWhite && match.result === "white_win") || (!isWhite && match.result === "black_win")
          );
        }).length;

        const memberPuzzleAttempts = puzzleAttempts.filter((row) => row.userId === member.id);
        const puzzlesCorrect = memberPuzzleAttempts.filter((row) => row.correct).length;

        const dashboard = await this.chessPuzzleService.getDashboard(member.id);

        return {
          userId: member.id,
          username: member.username,
          displayName: `${member.firstName} ${member.lastName}`.trim(),
          isManagedAccount: member.isManagedAccount,
          ratings: memberRatings.map((rating) => ({
            category: rating.category,
            rating: rating.rating,
            gamesPlayed: rating.gamesPlayed,
          })),
          ratingHistory: memberRatingHistory.map((row) => ({
            category: row.category,
            rating: row.rating,
            recordedAt: row.createdAt,
          })),
          matchesPlayed: memberMatches.length,
          matchesWon,
          winRate: memberMatches.length > 0 ? matchesWon / memberMatches.length : 0,
          puzzlesAttempted: memberPuzzleAttempts.length,
          puzzlesCorrect,
          weakMotifs: dashboard.weakMotifs,
          strongMotifs: dashboard.strongMotifs,
        };
      }),
    );

    const studentsWithMatches = students.filter((student) => student.matchesPlayed > 0);
    const studentsWithPuzzles = students.filter((student) => student.puzzlesAttempted > 0);

    return {
      groupId,
      days,
      students,
      classAverage: {
        winRate:
          studentsWithMatches.length > 0
            ? studentsWithMatches.reduce((sum, student) => sum + student.winRate, 0) /
              studentsWithMatches.length
            : 0,
        puzzleAccuracy:
          studentsWithPuzzles.length > 0
            ? studentsWithPuzzles.reduce(
                (sum, student) => sum + student.puzzlesCorrect / student.puzzlesAttempted,
                0,
              ) / studentsWithPuzzles.length
            : 0,
      },
    };
  }

  private async getManagedStudentOrThrow(currentUser: CurrentUserType, userId: UUIDType) {
    const student = await this.repository.getManagedStudentById(userId);
    if (!student) throw new BadRequestException("chessClass.error.studentNotFound");

    const isAdmin = currentUser.roleSlugs.includes(SYSTEM_ROLE_SLUGS.ADMIN);
    if (!isAdmin && student.managedByUserId !== currentUser.userId) {
      throw new ForbiddenException("chessClass.error.notYourStudent");
    }

    return student;
  }

  private async generateUniqueUsernames(count: number): Promise<string[]> {
    const usernames = new Set<string>();

    for (
      let attempt = 0;
      attempt < USERNAME_GENERATION_MAX_ATTEMPTS && usernames.size < count;
      attempt++
    ) {
      const needed = count - usernames.size;
      const candidates = Array.from({ length: needed }, () => generateUsernameCandidate());
      const existing = await this.repository.findExistingUsernames(candidates);

      for (const candidate of candidates) {
        if (usernames.size >= count) break;
        if (!existing.has(candidate)) usernames.add(candidate);
      }
    }

    if (usernames.size < count) {
      throw new BadRequestException("chessClass.error.usernameGenerationFailed");
    }

    return Array.from(usernames);
  }
}
