import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { CHESS_BROADCAST_GAME_RESULTS, CHESS_BROADCAST_STATUSES, PERMISSIONS } from "@repo/shared";

import { ChessBroadcastRepository, type NewGameMoveRow } from "./chess-broadcast.repository";
import {
  diffNewMoves,
  parsePgn,
  PgnMismatchError,
  type ParsedBroadcastMove,
} from "./utils/pgn.utils";
import { fetchPgnSafely } from "./utils/safe-pgn-fetch";

import type {
  CreateBroadcastBody,
  CreateGameBody,
  CreateRoundBody,
  CreateTeamBody,
  UpdateBroadcastBody,
  UpdateGameBody,
} from "./schemas/chess-broadcast.schema";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const TEAM_RESULT_POINTS = { WIN: 1, DRAW: 0.5, LOSS: 0 } as const;

@Injectable()
export class ChessBroadcastService {
  private readonly logger = new Logger(ChessBroadcastService.name);

  constructor(private readonly repository: ChessBroadcastRepository) {}

  async createBroadcast(user: CurrentUserType, body: CreateBroadcastBody) {
    return this.repository.createBroadcast({
      ...body,
      createdByUserId: user.userId,
      tenantId: user.tenantId,
    });
  }

  async listBroadcasts() {
    return this.repository.listBroadcasts();
  }

  private async requireBroadcast(id: UUIDType) {
    const broadcast = await this.repository.getBroadcastById(id);
    if (!broadcast) throw new NotFoundException("chess.broadcast.errors.broadcastNotFound");
    return broadcast;
  }

  private async requireRound(id: UUIDType) {
    const round = await this.repository.getRoundById(id);
    if (!round) throw new NotFoundException("chess.broadcast.errors.roundNotFound");
    return round;
  }

  private async requireGame(id: UUIDType) {
    const game = await this.repository.getGameById(id);
    if (!game) throw new NotFoundException("chess.broadcast.errors.gameNotFound");
    return game;
  }

  async getBroadcastDetail(id: UUIDType) {
    const broadcast = await this.requireBroadcast(id);
    const [teams, rounds] = await Promise.all([
      this.repository.listTeamsByBroadcast(id),
      this.repository.listRoundsByBroadcast(id),
    ]);
    const games = await this.repository.listGamesByRoundIds(rounds.map((round) => round.id));

    return {
      broadcast,
      teams,
      rounds: rounds.map((round) => ({
        round,
        games: games.filter((game) => game.roundId === round.id),
      })),
    };
  }

  async updateBroadcast(id: UUIDType, body: UpdateBroadcastBody) {
    await this.requireBroadcast(id);
    return this.repository.updateBroadcast(id, body);
  }

  async createRound(broadcastId: UUIDType, body: CreateRoundBody) {
    const broadcast = await this.requireBroadcast(broadcastId);
    return this.repository.createRound({ ...body, broadcastId, tenantId: broadcast.tenantId });
  }

  async createTeam(broadcastId: UUIDType, body: CreateTeamBody) {
    const broadcast = await this.requireBroadcast(broadcastId);
    return this.repository.createTeam({ ...body, broadcastId, tenantId: broadcast.tenantId });
  }

  async createGame(roundId: UUIDType, body: CreateGameBody) {
    const round = await this.requireRound(roundId);
    return this.repository.createGame({ ...body, roundId, tenantId: round.tenantId });
  }

  async updateGame(gameId: UUIDType, body: UpdateGameBody) {
    await this.requireGame(gameId);
    return this.repository.updateGame(gameId, body);
  }

  /** Re-parses a pasted PGN and appends only the moves not already recorded — see pgn.utils for the diff rule. */
  async pastePgn(gameId: UUIDType, pgn: string) {
    const game = await this.requireGame(gameId);
    const { moves: parsedMoves, result } = parsePgn(pgn);
    const existingMoves = await this.repository.getGameMoves(gameId);

    let freshMoves: ParsedBroadcastMove[];
    try {
      freshMoves = diffNewMoves(
        existingMoves.map((move) => ({ ply: move.ply, uci: move.uci })),
        parsedMoves,
      );
    } catch (error) {
      if (error instanceof PgnMismatchError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const rows: NewGameMoveRow[] = freshMoves.map((move) => ({
      gameId,
      ply: move.ply,
      uci: move.uci,
      san: move.san,
      fenAfter: move.fenAfter,
      tenantId: game.tenantId,
    }));
    await this.repository.insertGameMoves(rows);

    const latestMove = parsedMoves.at(-1);
    const updatedGame = await this.repository.updateGame(gameId, {
      currentFen: latestMove?.fenAfter ?? INITIAL_FEN,
      result: result ?? game.result,
    });

    return { game: updatedGame, insertedMoveCount: rows.length };
  }

  async getGameView(user: CurrentUserType, gameId: UUIDType, live: boolean) {
    const game = await this.requireGame(gameId);
    const round = await this.requireRound(game.roundId);
    const broadcast = await this.requireBroadcast(round.broadcastId);

    if (live && !user.permissions.includes(PERMISSIONS.CHESS_BROADCAST_MANAGE)) {
      throw new ForbiddenException("chess.broadcast.errors.liveViewRequiresManagePermission");
    }

    const allMoves = await this.repository.getGameMoves(gameId);
    const cutoff = new Date(Date.now() - broadcast.delayMinutes * 60_000);
    const visibleMoves = live
      ? allMoves
      : allMoves.filter((move) => new Date(move.ingestedAt) <= cutoff);

    return {
      game,
      broadcastId: broadcast.id,
      moves: visibleMoves,
      fen: visibleMoves.at(-1)?.fenAfter ?? INITIAL_FEN,
      delayed: !live,
    };
  }

  /** Pull-based: recomputed from `result` on every call, never stored incrementally. */
  async getStandings(broadcastId: UUIDType) {
    await this.requireBroadcast(broadcastId);
    const [teams, games] = await Promise.all([
      this.repository.listTeamsByBroadcast(broadcastId),
      this.repository.listGamesForBroadcast(broadcastId),
    ]);

    const scoreByTeam = new Map<UUIDType, { score: number; gamesPlayed: number }>();
    for (const team of teams) {
      scoreByTeam.set(team.id, { score: 0, gamesPlayed: 0 });
    }

    for (const game of games) {
      if (!game.result) continue;

      const addPoints = (teamId: UUIDType | null, points: number) => {
        if (!teamId) return;
        const entry = scoreByTeam.get(teamId);
        if (!entry) return;
        entry.score += points;
        entry.gamesPlayed += 1;
      };

      if (game.result === CHESS_BROADCAST_GAME_RESULTS.WHITE_WIN) {
        addPoints(game.whiteTeamId, TEAM_RESULT_POINTS.WIN);
        addPoints(game.blackTeamId, TEAM_RESULT_POINTS.LOSS);
      } else if (game.result === CHESS_BROADCAST_GAME_RESULTS.BLACK_WIN) {
        addPoints(game.whiteTeamId, TEAM_RESULT_POINTS.LOSS);
        addPoints(game.blackTeamId, TEAM_RESULT_POINTS.WIN);
      } else if (game.result === CHESS_BROADCAST_GAME_RESULTS.DRAW) {
        addPoints(game.whiteTeamId, TEAM_RESULT_POINTS.DRAW);
        addPoints(game.blackTeamId, TEAM_RESULT_POINTS.DRAW);
      }
    }

    const standings = teams
      .map((team) => ({
        teamId: team.id,
        teamName: team.name,
        ...scoreByTeam.get(team.id)!,
      }))
      .sort((a, b) => b.score - a.score);

    return { standings };
  }

  /** Cron entry point: pulls PGN for every live broadcast's games that have a `pgnSourceUrl` configured. */
  async autoPullBroadcastGames() {
    const candidates = await this.repository.listAutoPullGames();
    const liveGames = candidates.filter(
      ({ broadcastStatus }) => broadcastStatus === CHESS_BROADCAST_STATUSES.LIVE,
    );

    for (const { game } of liveGames) {
      if (!game.pgnSourceUrl) continue;

      try {
        const pgn = await fetchPgnSafely(game.pgnSourceUrl);
        await this.pastePgn(game.id, pgn);
        await this.repository.updateGame(game.id, { lastFetchedAt: new Date().toISOString() });
      } catch (error) {
        this.logger.error(
          `Failed auto-pulling PGN for broadcast game ${game.id} from ${game.pgnSourceUrl}: ${error}`,
        );
      }
    }
  }
}
