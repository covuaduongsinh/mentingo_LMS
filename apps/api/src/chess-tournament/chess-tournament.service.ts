import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CHESS_MATCH_TIME_CONTROL_LIST,
  CHESS_TOURNAMENT_FORMATS,
  CHESS_TOURNAMENT_STATUSES,
  chessRatingCategoryForTimeControl,
  SYSTEM_ROLE_SLUGS,
} from "@repo/shared";

import { ChessMatchService } from "src/chess/chess-match.service";
import { ChessPuzzleRepository } from "src/chess/chess-puzzle.repository";

import { ChessTournamentRepository } from "./chess-tournament.repository";
import {
  computeStandings,
  generateSwissPairings,
  pairAdjacentByRating,
} from "./utils/chess-tournament.utils";
import { buildTrfExport, type TrfRoundResult } from "./utils/trf-export.utils";

import type { BulkPairingBody, CreateTournamentBody } from "./schemas/chess-tournament.schema";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

const MAX_SIMUL_PARTICIPANTS = 30;

function timeControlBaseSeconds(timeControlId: string): number {
  const control = CHESS_MATCH_TIME_CONTROL_LIST.find((entry) => entry.id === timeControlId);
  if (!control || control.baseSeconds === null) {
    throw new BadRequestException("chess.match.errors.invalidTimeControl");
  }
  return control.baseSeconds;
}

@Injectable()
export class ChessTournamentService {
  constructor(
    private readonly repository: ChessTournamentRepository,
    private readonly chessMatchService: ChessMatchService,
    private readonly chessPuzzleRepository: ChessPuzzleRepository,
  ) {}

  async bulkPairing(user: CurrentUserType, body: BulkPairingBody) {
    const rated = body.rated ?? true;
    const pairs = body.auto
      ? await this.autoPairByRating(body.groupId, body.timeControlId)
      : (body.pairs ?? []);

    if (!pairs.length) {
      throw new BadRequestException("chess.tournament.errors.noPairsFormed");
    }

    const tournament = await this.repository.createTournament({
      name: "Bulk pairing",
      format: CHESS_TOURNAMENT_FORMATS.BULK_PAIRING,
      groupId: body.groupId,
      timeControlId: body.timeControlId,
      rated,
      roundCount: 1,
      createdByUserId: user.userId,
    });

    await this.repository.updateTournamentStatus(tournament.id, {
      status: CHESS_TOURNAMENT_STATUSES.ACTIVE,
      currentRound: 1,
    });

    const pairings = await this.createMatchesForPairs(
      tournament.id,
      1,
      pairs,
      body.timeControlId,
      rated,
    );

    return { tournament, pairings };
  }

  async getTournament(tournamentId: UUIDType) {
    return this.getTournamentOrThrow(tournamentId);
  }

  async createTournament(user: CurrentUserType, body: CreateTournamentBody) {
    this.assertFormatSpecificFields(body);

    const tournament = await this.repository.createTournament({
      name: body.name,
      format: body.format,
      groupId: body.groupId,
      classroomId: body.classroomId,
      timeControlId: body.timeControlId,
      rated: body.rated ?? true,
      roundCount: body.roundCount,
      durationMinutes: body.durationMinutes,
      hostUserId: body.format === CHESS_TOURNAMENT_FORMATS.SIMUL ? user.userId : undefined,
      minRating: body.minRating,
      maxRating: body.maxRating,
      minGamesPlayed: body.minGamesPlayed,
      createdByUserId: user.userId,
    });

    if (body.format === CHESS_TOURNAMENT_FORMATS.SIMUL) {
      // Explicit invite list wins; otherwise default to every member of the chosen group/classroom.
      let participantUserIds = body.participantUserIds?.length ? body.participantUserIds : [];
      if (!participantUserIds.length && body.groupId) {
        participantUserIds = await this.repository.getGroupMemberIds(body.groupId);
      }
      if (!participantUserIds.length && body.classroomId) {
        participantUserIds = await this.repository.getClassroomStudentIds(body.classroomId);
      }

      if (participantUserIds.length > MAX_SIMUL_PARTICIPANTS) {
        throw new BadRequestException("chess.tournament.errors.tooManySimulParticipants");
      }
      await this.repository.insertPlayers(tournament.id, participantUserIds);
    }

    return tournament;
  }

  async joinTournament(user: CurrentUserType, tournamentId: UUIDType) {
    const tournament = await this.getTournamentOrThrow(tournamentId);

    if (tournament.status === CHESS_TOURNAMENT_STATUSES.FINISHED) {
      throw new BadRequestException("chess.tournament.errors.tournamentFinished");
    }

    if (
      tournament.format === CHESS_TOURNAMENT_FORMATS.SWISS &&
      tournament.status === CHESS_TOURNAMENT_STATUSES.ACTIVE
    ) {
      const lateJoinDeadline = Math.ceil((tournament.roundCount ?? 1) / 2);
      if (tournament.currentRound > lateJoinDeadline) {
        throw new BadRequestException("chess.tournament.errors.lateJoinWindowClosed");
      }
    }

    await this.assertEligible(tournament, user.userId);

    return this.repository.insertPlayer(tournamentId, user.userId);
  }

  async startTournament(user: CurrentUserType, tournamentId: UUIDType) {
    const tournament = await this.getTournamentOrThrow(tournamentId);
    this.assertManager(tournament, user);

    if (tournament.status !== CHESS_TOURNAMENT_STATUSES.REGISTRATION) {
      throw new BadRequestException("chess.tournament.errors.alreadyStarted");
    }

    if (tournament.format === CHESS_TOURNAMENT_FORMATS.SWISS) {
      const players = await this.repository.getPlayersWithNames(tournamentId);
      const ratings = await this.getRatingsByUserId(
        players.map((player) => player.userId),
        tournament.timeControlId,
      );
      const standings = computeStandings(
        players.map((player) => player.userId),
        [],
      ).sort((a, b) => (ratings.get(b.userId) ?? 0) - (ratings.get(a.userId) ?? 0));
      const pairs = generateSwissPairings(standings);

      await this.repository.updateTournamentStatus(tournamentId, {
        status: CHESS_TOURNAMENT_STATUSES.ACTIVE,
        currentRound: 1,
      });
      await this.createMatchesForPairs(
        tournamentId,
        1,
        pairs,
        tournament.timeControlId,
        tournament.rated,
      );
    } else if (tournament.format === CHESS_TOURNAMENT_FORMATS.ARENA) {
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + (tournament.durationMinutes ?? 60) * 60 * 1000);
      await this.repository.updateTournamentStatus(tournamentId, {
        status: CHESS_TOURNAMENT_STATUSES.ACTIVE,
        currentRound: 1,
        startsAt,
        endsAt,
      });
      await this.pairNextArena(user, tournamentId);
    } else if (tournament.format === CHESS_TOURNAMENT_FORMATS.SIMUL) {
      if (!tournament.hostUserId)
        throw new BadRequestException("chess.tournament.errors.noSimulHost");
      const players = await this.repository.getPlayersWithNames(tournamentId);
      const pairs = players.map((player) => ({
        whiteUserId: tournament.hostUserId as UUIDType,
        blackUserId: player.userId,
      }));

      await this.repository.updateTournamentStatus(tournamentId, {
        status: CHESS_TOURNAMENT_STATUSES.ACTIVE,
        currentRound: 1,
      });
      await this.createMatchesForPairs(
        tournamentId,
        1,
        pairs,
        tournament.timeControlId,
        tournament.rated,
      );
    }

    return this.getTournamentOrThrow(tournamentId);
  }

  async generateNextRound(user: CurrentUserType, tournamentId: UUIDType) {
    const tournament = await this.getTournamentOrThrow(tournamentId);
    this.assertManager(tournament, user);

    if (tournament.format !== CHESS_TOURNAMENT_FORMATS.SWISS) {
      throw new BadRequestException("chess.tournament.errors.notSwiss");
    }
    if (tournament.status !== CHESS_TOURNAMENT_STATUSES.ACTIVE) {
      throw new BadRequestException("chess.tournament.errors.notActive");
    }
    if (tournament.currentRound >= (tournament.roundCount ?? 0)) {
      throw new BadRequestException("chess.tournament.errors.noMoreRounds");
    }

    await this.repository.syncPairingResults(tournamentId);

    const players = await this.repository.getPlayersWithNames(tournamentId);
    const pairings = await this.repository.getPairings(tournamentId);
    const standings = computeStandings(
      players.map((player) => player.userId),
      pairings.map((pairing) => ({
        whiteUserId: pairing.whiteUserId,
        blackUserId: pairing.blackUserId,
        result: pairing.result,
      })),
    );

    const nextRound = tournament.currentRound + 1;
    const pairs = generateSwissPairings(standings);

    await this.repository.updateTournamentStatus(tournamentId, { currentRound: nextRound });
    await this.createMatchesForPairs(
      tournamentId,
      nextRound,
      pairs,
      tournament.timeControlId,
      tournament.rated,
    );

    if (nextRound >= (tournament.roundCount ?? 0)) {
      await this.repository.updateTournamentStatus(tournamentId, {
        status: CHESS_TOURNAMENT_STATUSES.FINISHED,
      });
    }

    return this.getTournamentOrThrow(tournamentId);
  }

  async pairNextArena(user: CurrentUserType, tournamentId: UUIDType) {
    const tournament = await this.getTournamentOrThrow(tournamentId);
    this.assertManager(tournament, user);

    if (tournament.format !== CHESS_TOURNAMENT_FORMATS.ARENA) {
      throw new BadRequestException("chess.tournament.errors.notArena");
    }

    await this.repository.syncPairingResults(tournamentId);

    const players = await this.repository.getPlayersWithNames(tournamentId);
    const pairings = await this.repository.getPairings(tournamentId);
    const busyUserIds = new Set(
      pairings
        .filter((pairing) => pairing.matchId && !pairing.result)
        .flatMap(
          (pairing) => [pairing.whiteUserId, pairing.blackUserId].filter(Boolean) as string[],
        ),
    );

    const available = players.filter((player) => !busyUserIds.has(player.userId));
    const ratings = await this.getRatingsByUserId(
      available.map((player) => player.userId),
      tournament.timeControlId,
    );
    const sorted = [...available].sort(
      (a, b) => (ratings.get(b.userId) ?? 0) - (ratings.get(a.userId) ?? 0),
    );
    const pairs = pairAdjacentByRating(sorted.map((player) => ({ userId: player.userId })));

    if (!pairs.length) return { paired: 0 };

    const nextRound = tournament.currentRound + 1;
    await this.repository.updateTournamentStatus(tournamentId, { currentRound: nextRound });
    await this.createMatchesForPairs(
      tournamentId,
      nextRound,
      pairs,
      tournament.timeControlId,
      tournament.rated,
    );

    return { paired: pairs.length };
  }

  async getStandings(tournamentId: UUIDType) {
    const tournament = await this.getTournamentOrThrow(tournamentId);
    await this.repository.syncPairingResults(tournamentId);

    const players = await this.repository.getPlayersWithNames(tournamentId);
    const pairings = await this.repository.getPairings(tournamentId);
    const standings = computeStandings(
      players.map((player) => player.userId),
      pairings.map((pairing) => ({
        whiteUserId: pairing.whiteUserId,
        blackUserId: pairing.blackUserId,
        result: pairing.result,
      })),
    );

    const nameByUserId = new Map(
      players.map((player) => [player.userId, `${player.firstName} ${player.lastName}`.trim()]),
    );

    return {
      round: tournament.currentRound,
      standings: standings.map((standing) => ({
        userId: standing.userId,
        displayName: nameByUserId.get(standing.userId) ?? "",
        score: standing.score,
        buchholz: standing.buchholz,
        sonnebornBerger: standing.sonnebornBerger,
        gamesPlayed: standing.gamesPlayed,
      })),
    };
  }

  async exportTrf(user: CurrentUserType, tournamentId: UUIDType): Promise<string> {
    const tournament = await this.getTournamentOrThrow(tournamentId);
    this.assertManager(tournament, user);
    await this.repository.syncPairingResults(tournamentId);

    const players = await this.repository.getPlayersWithNames(tournamentId);
    const pairings = await this.repository.getPairings(tournamentId);
    const ratings = await this.getRatingsByUserId(
      players.map((player) => player.userId),
      tournament.timeControlId,
    );
    const standings = computeStandings(
      players.map((player) => player.userId),
      pairings.map((pairing) => ({
        whiteUserId: pairing.whiteUserId,
        blackUserId: pairing.blackUserId,
        result: pairing.result,
      })),
    );

    const rankByUserId = new Map(standings.map((standing, index) => [standing.userId, index + 1]));
    const roundResultsByUserId = new Map<string, TrfRoundResult[]>();

    for (const pairing of pairings) {
      const whiteResult: TrfRoundResult = {
        round: pairing.round,
        opponentRank: pairing.blackUserId ? (rankByUserId.get(pairing.blackUserId) ?? null) : null,
        color: pairing.blackUserId ? "w" : null,
        result: !pairing.blackUserId
          ? "-"
          : pairing.result === "white_win"
            ? "1"
            : pairing.result === "black_win"
              ? "0"
              : pairing.result === "draw"
                ? "="
                : "-",
      };
      roundResultsByUserId.set(pairing.whiteUserId, [
        ...(roundResultsByUserId.get(pairing.whiteUserId) ?? []),
        whiteResult,
      ]);

      if (pairing.blackUserId) {
        const blackResult: TrfRoundResult = {
          round: pairing.round,
          opponentRank: rankByUserId.get(pairing.whiteUserId) ?? null,
          color: "b",
          result:
            pairing.result === "black_win"
              ? "1"
              : pairing.result === "white_win"
                ? "0"
                : pairing.result === "draw"
                  ? "="
                  : "-",
        };
        roundResultsByUserId.set(pairing.blackUserId, [
          ...(roundResultsByUserId.get(pairing.blackUserId) ?? []),
          blackResult,
        ]);
      }
    }

    return buildTrfExport(
      tournament.name,
      standings,
      players.map((player) => ({
        userId: player.userId,
        displayName: `${player.firstName} ${player.lastName}`.trim(),
        rating: ratings.get(player.userId) ?? 1500,
      })),
      roundResultsByUserId,
    );
  }

  private async createMatchesForPairs(
    tournamentId: UUIDType,
    round: number,
    pairs: Array<{ whiteUserId: string; blackUserId: string | null }>,
    timeControlId: string,
    rated: boolean,
  ) {
    const rows = [];
    for (const pair of pairs) {
      if (!pair.blackUserId) {
        rows.push({
          tournamentId,
          round,
          whiteUserId: pair.whiteUserId,
          blackUserId: null,
          matchId: null,
          result: "white_win" as const,
        });
        continue;
      }

      const match = await this.chessMatchService.createDirectMatch({
        whiteUserId: pair.whiteUserId,
        blackUserId: pair.blackUserId,
        timeControlId,
        rated,
      });
      rows.push({
        tournamentId,
        round,
        whiteUserId: pair.whiteUserId,
        blackUserId: pair.blackUserId,
        matchId: match.id,
        result: null,
      });
    }
    return this.repository.insertPairings(rows);
  }

  private async autoPairByRating(groupId: UUIDType, timeControlId: string) {
    const memberIds = await this.repository.getGroupMemberIds(groupId);
    const ratings = await this.getRatingsByUserId(memberIds, timeControlId);
    const sorted = memberIds
      .map((userId) => ({ userId, rating: ratings.get(userId) ?? 1500 }))
      .sort((a, b) => b.rating - a.rating);
    return pairAdjacentByRating(sorted);
  }

  private async getRatingsByUserId(userIds: string[], timeControlId: string) {
    const baseSeconds = timeControlBaseSeconds(timeControlId);
    const category = chessRatingCategoryForTimeControl(baseSeconds);
    const entries = await Promise.all(
      userIds.map(async (userId) => {
        const rating = await this.chessPuzzleRepository.getOrCreateRating(userId, category);
        return [userId, rating?.rating ?? 1500] as const;
      }),
    );
    return new Map(entries);
  }

  private assertFormatSpecificFields(body: CreateTournamentBody) {
    if (body.format === CHESS_TOURNAMENT_FORMATS.SWISS && !body.roundCount) {
      throw new BadRequestException("chess.tournament.errors.roundCountRequired");
    }
    if (body.format === CHESS_TOURNAMENT_FORMATS.ARENA && !body.durationMinutes) {
      throw new BadRequestException("chess.tournament.errors.durationRequired");
    }
  }

  private assertManager(tournament: { createdByUserId: UUIDType | null }, user: CurrentUserType) {
    const isAdmin = user.roleSlugs.includes(SYSTEM_ROLE_SLUGS.ADMIN);
    if (!isAdmin && tournament.createdByUserId !== user.userId) {
      throw new ForbiddenException("chess.tournament.errors.notTournamentManager");
    }
  }

  private async assertEligible(
    tournament: {
      groupId: UUIDType | null;
      classroomId: UUIDType | null;
      minRating: number | null;
      maxRating: number | null;
      minGamesPlayed: number | null;
      timeControlId: string;
    },
    userId: UUIDType,
  ) {
    if (tournament.groupId) {
      const memberIds = await this.repository.getGroupMemberIds(tournament.groupId);
      if (!memberIds.includes(userId)) {
        throw new ForbiddenException("chess.tournament.errors.notInGroup");
      }
    }

    if (tournament.classroomId) {
      const studentIds = await this.repository.getClassroomStudentIds(tournament.classroomId);
      if (!studentIds.includes(userId)) {
        throw new ForbiddenException("chess.tournament.errors.notInClassroom");
      }
    }

    if (tournament.minRating || tournament.maxRating || tournament.minGamesPlayed) {
      const baseSeconds = timeControlBaseSeconds(tournament.timeControlId);
      const category = chessRatingCategoryForTimeControl(baseSeconds);
      const rating = await this.chessPuzzleRepository.getOrCreateRating(userId, category);

      if (tournament.minRating && (rating?.rating ?? 0) < tournament.minRating) {
        throw new ForbiddenException("chess.tournament.errors.ratingTooLow");
      }
      if (tournament.maxRating && (rating?.rating ?? 0) > tournament.maxRating) {
        throw new ForbiddenException("chess.tournament.errors.ratingTooHigh");
      }
      if (tournament.minGamesPlayed && (rating?.gamesPlayed ?? 0) < tournament.minGamesPlayed) {
        throw new ForbiddenException("chess.tournament.errors.notEnoughGamesPlayed");
      }
    }
  }

  private async getTournamentOrThrow(tournamentId: UUIDType) {
    const tournament = await this.repository.getTournamentById(tournamentId);
    if (!tournament) throw new NotFoundException("chess.tournament.errors.tournamentNotFound");
    return tournament;
  }
}
