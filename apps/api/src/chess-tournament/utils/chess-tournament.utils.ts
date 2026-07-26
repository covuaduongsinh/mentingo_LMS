import type { ChessMatchResult } from "@repo/shared";

export type TournamentPairingResult = {
  whiteUserId: string;
  blackUserId: string | null; // null = bye
  result: ChessMatchResult | null; // null = not finished yet
};

export type PlayerStanding = {
  userId: string;
  score: number;
  buchholz: number;
  sonnebornBerger: number;
  gamesPlayed: number;
  hadBye: boolean;
  opponentIds: string[];
};

function scoreFor(result: ChessMatchResult, side: "white" | "black"): number {
  if (result === "draw") return 0.5;
  if (side === "white") return result === "white_win" ? 1 : 0;
  return result === "black_win" ? 1 : 0;
}

/** Recomputes every player's score/tiebreaks from scratch from the full pairing history. */
export function computeStandings(
  playerIds: string[],
  pairings: TournamentPairingResult[],
): PlayerStanding[] {
  const score = new Map<string, number>(playerIds.map((id) => [id, 0]));
  const gamesPlayed = new Map<string, number>(playerIds.map((id) => [id, 0]));
  const hadBye = new Map<string, boolean>(playerIds.map((id) => [id, false]));
  const opponentIds = new Map<string, string[]>(playerIds.map((id) => [id, []]));

  const finishedGames: Array<{
    whiteUserId: string;
    blackUserId: string;
    result: ChessMatchResult;
  }> = [];

  for (const pairing of pairings) {
    if (pairing.blackUserId === null) {
      score.set(pairing.whiteUserId, (score.get(pairing.whiteUserId) ?? 0) + 1);
      hadBye.set(pairing.whiteUserId, true);
      continue;
    }
    if (!pairing.result) continue; // in progress — contributes 0 until it finishes

    finishedGames.push({
      whiteUserId: pairing.whiteUserId,
      blackUserId: pairing.blackUserId,
      result: pairing.result,
    });

    gamesPlayed.set(pairing.whiteUserId, (gamesPlayed.get(pairing.whiteUserId) ?? 0) + 1);
    gamesPlayed.set(pairing.blackUserId, (gamesPlayed.get(pairing.blackUserId) ?? 0) + 1);
    opponentIds.get(pairing.whiteUserId)?.push(pairing.blackUserId);
    opponentIds.get(pairing.blackUserId)?.push(pairing.whiteUserId);

    score.set(
      pairing.whiteUserId,
      (score.get(pairing.whiteUserId) ?? 0) + scoreFor(pairing.result, "white"),
    );
    score.set(
      pairing.blackUserId,
      (score.get(pairing.blackUserId) ?? 0) + scoreFor(pairing.result, "black"),
    );
  }

  const standings = playerIds.map((userId): PlayerStanding => {
    const opponents = opponentIds.get(userId) ?? [];
    const buchholz = opponents.reduce((sum, opponentId) => sum + (score.get(opponentId) ?? 0), 0);

    let sonnebornBerger = 0;
    for (const game of finishedGames) {
      if (game.whiteUserId === userId) {
        sonnebornBerger += scoreFor(game.result, "white") * (score.get(game.blackUserId) ?? 0);
      } else if (game.blackUserId === userId) {
        sonnebornBerger += scoreFor(game.result, "black") * (score.get(game.whiteUserId) ?? 0);
      }
    }

    return {
      userId,
      score: score.get(userId) ?? 0,
      buchholz,
      sonnebornBerger,
      gamesPlayed: gamesPlayed.get(userId) ?? 0,
      hadBye: hadBye.get(userId) ?? false,
      opponentIds: opponents,
    };
  });

  return standings.sort(
    (a, b) => b.score - a.score || b.buchholz - a.buchholz || b.sonnebornBerger - a.sonnebornBerger,
  );
}

/**
 * Simplified Swiss pairing: split the (score-sorted) standings in half, pair top[i] vs
 * bottom[i]. Not full FIDE Dutch System — see the business spec's Follow-up Work.
 */
export function generateSwissPairings(
  standingsSortedByScore: PlayerStanding[],
): Array<{ whiteUserId: string; blackUserId: string | null }> {
  const pool = [...standingsSortedByScore];
  let byePlayer: PlayerStanding | null = null;

  if (pool.length % 2 === 1) {
    let byeIndex = -1;
    for (let i = pool.length - 1; i >= 0; i--) {
      if (!pool[i].hadBye) {
        byeIndex = i;
        break;
      }
    }
    if (byeIndex === -1) byeIndex = pool.length - 1;
    byePlayer = pool.splice(byeIndex, 1)[0];
  }

  const half = Math.ceil(pool.length / 2);
  const top = pool.slice(0, half);
  const bottom = pool.slice(half);
  const pairings: Array<{ whiteUserId: string; blackUserId: string | null }> = [];

  for (let i = 0; i < top.length; i++) {
    const white = top[i];
    const blackIndex = i;
    if (bottom[blackIndex] && white.opponentIds.includes(bottom[blackIndex].userId)) {
      const swapIndex = bottom.findIndex(
        (candidate, idx) => idx > blackIndex && !white.opponentIds.includes(candidate.userId),
      );
      if (swapIndex !== -1) {
        [bottom[blackIndex], bottom[swapIndex]] = [bottom[swapIndex], bottom[blackIndex]];
      }
    }
    const black = bottom[blackIndex];
    if (!black) continue;
    pairings.push({ whiteUserId: white.userId, blackUserId: black.userId });
  }

  if (byePlayer) pairings.push({ whiteUserId: byePlayer.userId, blackUserId: null });

  return pairings;
}

/** Pairs a rating-sorted list of available players adjacently (1v2, 3v4, ...); drops a trailing odd one out. */
export function pairAdjacentByRating(
  playersSortedByRatingDesc: Array<{ userId: string }>,
): Array<{ whiteUserId: string; blackUserId: string }> {
  const pairs: Array<{ whiteUserId: string; blackUserId: string }> = [];
  for (let i = 0; i + 1 < playersSortedByRatingDesc.length; i += 2) {
    pairs.push({
      whiteUserId: playersSortedByRatingDesc[i].userId,
      blackUserId: playersSortedByRatingDesc[i + 1].userId,
    });
  }
  return pairs;
}
