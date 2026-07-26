import type { PlayerStanding } from "./chess-tournament.utils";

export type TrfPlayerInfo = {
  userId: string;
  displayName: string;
  rating: number;
};

export type TrfRoundResult = {
  round: number;
  opponentRank: number | null; // null = bye
  color: "w" | "b" | null;
  result: "1" | "0" | "=" | "-"; // win / loss / draw / bye
};

/**
 * Simplified, FIDE-TRF-inspired plain-text export (not a full TRF16 file) — see the
 * business spec's Follow-up Work. Good enough for manual reference or further scripting,
 * not guaranteed to load into dedicated Swiss pairing software.
 */
export function buildTrfExport(
  tournamentName: string,
  standings: PlayerStanding[],
  players: TrfPlayerInfo[],
  roundResultsByUserId: Map<string, TrfRoundResult[]>,
): string {
  const rankByUserId = new Map(standings.map((standing, index) => [standing.userId, index + 1]));
  const playerByUserId = new Map(players.map((player) => [player.userId, player]));

  const lines: string[] = [`012 ${tournamentName}`];

  standings.forEach((standing) => {
    const player = playerByUserId.get(standing.userId);
    const rank = rankByUserId.get(standing.userId);
    const rounds = roundResultsByUserId.get(standing.userId) ?? [];

    const roundsText = rounds
      .sort((a, b) => a.round - b.round)
      .map((round) => {
        if (round.opponentRank === null) return `bye`;
        return `${round.opponentRank} ${round.color} ${round.result}`;
      })
      .join("  ");

    lines.push(
      `001 ${String(rank).padStart(4, " ")} ${(player?.displayName ?? "").padEnd(30, " ")} ${player?.rating ?? ""}  ${standing.score.toFixed(1)}  ${roundsText}`,
    );
  });

  return lines.join("\n");
}
