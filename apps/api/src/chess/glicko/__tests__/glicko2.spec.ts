import { createDefaultRating, updateRating } from "../glicko2";

describe("glicko2", () => {
  it("matches the worked example from Glickman's public-domain specification", () => {
    // Section "Example of the Glicko-2 system" — a player rated 1500/RD 200/volatility 0.06
    // plays three games against opponents of varying rating/RD, winning one and losing two.
    // Expected outcome per the spec: rating' ≈ 1464.06, RD' ≈ 151.52, volatility' ≈ 0.05999.
    const player = { rating: 1500, ratingDeviation: 200, volatility: 0.06 };

    const result = updateRating(player, [
      { opponent: { rating: 1400, ratingDeviation: 30, volatility: 0.06 }, score: 1 },
      { opponent: { rating: 1550, ratingDeviation: 100, volatility: 0.06 }, score: 0 },
      { opponent: { rating: 1700, ratingDeviation: 300, volatility: 0.06 }, score: 0 },
    ]);

    expect(result.rating).toBeCloseTo(1464.06, 1);
    expect(result.ratingDeviation).toBeCloseTo(151.52, 1);
    expect(result.volatility).toBeCloseTo(0.05999, 4);
  });

  it("widens the rating deviation and leaves rating/volatility unchanged when there are no results", () => {
    const player = { rating: 1500, ratingDeviation: 50, volatility: 0.06 };

    const result = updateRating(player, []);

    expect(result.rating).toBe(1500);
    expect(result.volatility).toBe(0.06);
    expect(result.ratingDeviation).toBeGreaterThan(50);
  });

  it("increases rating after a win against a similarly-rated opponent", () => {
    const player = createDefaultRating();

    const result = updateRating(player, [
      { opponent: { rating: 1500, ratingDeviation: 50, volatility: 0.06 }, score: 1 },
    ]);

    expect(result.rating).toBeGreaterThan(player.rating);
    expect(result.ratingDeviation).toBeLessThan(player.ratingDeviation);
  });

  it("decreases rating after a loss against a similarly-rated opponent", () => {
    const player = { rating: 1500, ratingDeviation: 100, volatility: 0.06 };

    const result = updateRating(player, [
      { opponent: { rating: 1500, ratingDeviation: 100, volatility: 0.06 }, score: 0 },
    ]);

    expect(result.rating).toBeLessThan(player.rating);
  });

  it("createDefaultRating returns a new-player rating with a wide deviation", () => {
    const rating = createDefaultRating();

    expect(rating.rating).toBe(1500);
    expect(rating.ratingDeviation).toBe(350);
    expect(rating.volatility).toBeGreaterThan(0);
  });
});
