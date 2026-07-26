/**
 * Glicko-2 rating system — implemented from Mark Glickman's public-domain specification
 * ("Example of the Glicko-2 system", http://www.glicko.net/glicko/glicko2.pdf), not from any
 * reference codebase's source. Ratings are stored/exchanged on the original Glicko scale
 * (rating ~1500, ratingDeviation ~30-350); this module converts to/from the internal Glicko-2
 * scale (mu/phi) only inside updateRating.
 */

const GLICKO2_SCALE = 173.7178;
const DEFAULT_VOLATILITY = 0.06;
/** System constant controlling volatility change over time — a conventional, moderate value. */
const TAU = 0.5;
const CONVERGENCE_TOLERANCE = 0.000001;

export type GlickoRating = {
  rating: number;
  ratingDeviation: number;
  volatility: number;
};

export type GlickoResult = {
  opponent: GlickoRating;
  /** 1 = win, 0.5 = draw, 0 = loss */
  score: 0 | 0.5 | 1;
};

function toGlicko2Scale(rating: GlickoRating): { mu: number; phi: number } {
  return {
    mu: (rating.rating - 1500) / GLICKO2_SCALE,
    phi: rating.ratingDeviation / GLICKO2_SCALE,
  };
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function e(mu: number, muOpponent: number, phiOpponent: number): number {
  return 1 / (1 + Math.exp(-g(phiOpponent) * (mu - muOpponent)));
}

function computeVariance(mu: number, opponents: { mu: number; phi: number }[]): number {
  const sum = opponents.reduce((acc, opponent) => {
    const gPhi = g(opponent.phi);
    const eVal = e(mu, opponent.mu, opponent.phi);
    return acc + gPhi * gPhi * eVal * (1 - eVal);
  }, 0);
  return 1 / sum;
}

function computeDelta(
  mu: number,
  opponents: { mu: number; phi: number; score: number }[],
  variance: number,
): number {
  const sum = opponents.reduce((acc, opponent) => {
    return acc + g(opponent.phi) * (opponent.score - e(mu, opponent.mu, opponent.phi));
  }, 0);
  return variance * sum;
}

/** Solves for the new volatility via the Illinois algorithm (a regula-falsi variant), per the spec's step 5. */
function solveNewVolatility(phi: number, delta: number, variance: number, sigma: number): number {
  const a = Math.log(sigma * sigma);
  const f = (x: number): number => {
    const ex = Math.exp(x);
    const numerator = ex * (delta * delta - phi * phi - variance - ex);
    const denominator = 2 * (phi * phi + variance + ex) ** 2;
    return numerator / denominator - (x - a) / (TAU * TAU);
  };

  let bigA = a;
  let bigB: number;
  if (delta * delta > phi * phi + variance) {
    bigB = Math.log(delta * delta - phi * phi - variance);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k += 1;
    bigB = a - k * TAU;
  }

  let fA = f(bigA);
  let fB = f(bigB);

  while (Math.abs(bigB - bigA) > CONVERGENCE_TOLERANCE) {
    const bigC = bigA + ((bigA - bigB) * fA) / (fB - fA);
    const fC = f(bigC);
    if (fC * fB < 0) {
      bigA = bigB;
      fA = fB;
    } else {
      fA /= 2;
    }
    bigB = bigC;
    fB = fC;
  }

  return Math.exp(bigA / 2);
}

/**
 * Updates a player's rating after zero or more results in a rating period. With no results,
 * only the rating deviation widens (increased uncertainty from inactivity) — rating and
 * volatility are unchanged, per the spec's special case.
 */
export function updateRating(player: GlickoRating, results: GlickoResult[]): GlickoRating {
  const { mu, phi } = toGlicko2Scale(player);

  if (results.length === 0) {
    const phiStar = Math.sqrt(phi * phi + player.volatility * player.volatility);
    return {
      rating: player.rating,
      ratingDeviation: phiStar * GLICKO2_SCALE,
      volatility: player.volatility,
    };
  }

  const opponents = results.map((result) => ({
    ...toGlicko2Scale(result.opponent),
    score: result.score,
  }));

  const variance = computeVariance(mu, opponents);
  const delta = computeDelta(mu, opponents, variance);
  const newVolatility = solveNewVolatility(phi, delta, variance, player.volatility);

  const phiStar = Math.sqrt(phi * phi + newVolatility * newVolatility);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / variance);
  const newMu =
    mu +
    newPhi *
      newPhi *
      opponents.reduce((acc, opponent) => {
        return acc + g(opponent.phi) * (opponent.score - e(mu, opponent.mu, opponent.phi));
      }, 0);

  return {
    rating: newMu * GLICKO2_SCALE + 1500,
    ratingDeviation: newPhi * GLICKO2_SCALE,
    volatility: newVolatility,
  };
}

export function createDefaultRating(): GlickoRating {
  return { rating: 1500, ratingDeviation: 350, volatility: DEFAULT_VOLATILITY };
}
