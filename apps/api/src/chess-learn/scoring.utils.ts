/**
 * Mentingo-owned Learn scoring.
 * See docs/specs/chess-learn-interactive-engine-business-spec.md.
 */

export const LEARN_EFFICIENCY_BONUS = {
  best: 500,
  good: 300,
  ok: 100,
} as const;

/** Score threshold below max that still earns 2 stars. */
export const LEARN_STAR_NEAR_MAX_DELTA = 200;

export type LearnStars = 0 | 1 | 2 | 3;

export function efficiencyBonus(movesUsed: number, optimalMoves: number): number {
  if (movesUsed <= optimalMoves) return LEARN_EFFICIENCY_BONUS.best;
  const grace = Math.max(1, Math.floor(optimalMoves / 8));
  if (movesUsed <= optimalMoves + grace) return LEARN_EFFICIENCY_BONUS.good;
  return LEARN_EFFICIENCY_BONUS.ok;
}

/**
 * Max score for a correct exact_line / predicate attempt with perfect efficiency.
 */
export function exactLineMaxScore(optimalMoves: number): number {
  return efficiencyBonus(optimalMoves, optimalMoves);
}

export function scoreExactLine(movesUsed: number, optimalMoves: number): number {
  return efficiencyBonus(movesUsed, optimalMoves);
}

/** eventPoints + efficiency, capped conceptually by eventMax + best efficiency. */
export function scoreWithEvents(
  eventPoints: number,
  eventMaxPoints: number,
  movesUsed: number,
  optimalMoves: number,
  correct: boolean,
): { score: number; maxScore: number } {
  const eff = correct ? efficiencyBonus(movesUsed, optimalMoves) : 0;
  const maxScore = eventMaxPoints + LEARN_EFFICIENCY_BONUS.best;
  const score = correct ? eventPoints + eff : 0;
  return { score, maxScore };
}

export function starsFromScore(score: number, maxScore: number): LearnStars {
  if (score <= 0 || maxScore <= 0) return 0;
  if (score >= maxScore) return 3;
  if (score >= maxScore - LEARN_STAR_NEAR_MAX_DELTA) return 2;
  return 1;
}
