import {
  computeStandings,
  generateSwissPairings,
  pairAdjacentByRating,
  type PlayerStanding,
} from "../chess-tournament.utils";

describe("computeStandings", () => {
  it("scores a finished decisive game 1-0 and tracks opponents", () => {
    const standings = computeStandings(
      ["a", "b"],
      [{ whiteUserId: "a", blackUserId: "b", result: "white_win" }],
    );

    const a = standings.find((s) => s.userId === "a");
    const b = standings.find((s) => s.userId === "b");
    expect(a?.score).toBe(1);
    expect(b?.score).toBe(0);
    expect(a?.opponentIds).toEqual(["b"]);
    expect(b?.opponentIds).toEqual(["a"]);
  });

  it("scores a draw as 0.5 for both players", () => {
    const standings = computeStandings(
      ["a", "b"],
      [{ whiteUserId: "a", blackUserId: "b", result: "draw" }],
    );

    expect(standings.find((s) => s.userId === "a")?.score).toBe(0.5);
    expect(standings.find((s) => s.userId === "b")?.score).toBe(0.5);
  });

  it("gives a bye an automatic full point without counting as a game against anyone", () => {
    const standings = computeStandings(
      ["a"],
      [{ whiteUserId: "a", blackUserId: null, result: null }],
    );

    const a = standings[0];
    expect(a.score).toBe(1);
    expect(a.hadBye).toBe(true);
    expect(a.gamesPlayed).toBe(0);
  });

  it("does not count an in-progress (unresolved) pairing toward score", () => {
    const standings = computeStandings(
      ["a", "b"],
      [{ whiteUserId: "a", blackUserId: "b", result: null }],
    );

    expect(standings.find((s) => s.userId === "a")?.score).toBe(0);
    expect(standings.find((s) => s.userId === "b")?.score).toBe(0);
  });

  it("computes Buchholz as the sum of each opponent's own final score", () => {
    // Round 1: a beats b, c beats d. Round 2: a beats c, b beats d.
    const standings = computeStandings(
      ["a", "b", "c", "d"],
      [
        { whiteUserId: "a", blackUserId: "b", result: "white_win" },
        { whiteUserId: "c", blackUserId: "d", result: "white_win" },
        { whiteUserId: "a", blackUserId: "c", result: "white_win" },
        { whiteUserId: "b", blackUserId: "d", result: "white_win" },
      ],
    );

    // a: 2 points, opponents b (1) + c (1) => buchholz 2
    const a = standings.find((s) => s.userId === "a");
    expect(a?.score).toBe(2);
    expect(a?.buchholz).toBe(2);

    // d: 0 points, opponents c (1) + b (1) => buchholz 2
    const d = standings.find((s) => s.userId === "d");
    expect(d?.score).toBe(0);
    expect(d?.buchholz).toBe(2);
  });

  it("computes Sonneborn-Berger as sum of (own result vs opponent * opponent's final score)", () => {
    // a beats b (b ends with 1 point from elsewhere), a draws c (c ends with 0.5 points)
    const standings = computeStandings(
      ["a", "b", "c", "d"],
      [
        { whiteUserId: "a", blackUserId: "b", result: "white_win" },
        { whiteUserId: "a", blackUserId: "c", result: "draw" },
        { whiteUserId: "b", blackUserId: "d", result: "white_win" },
        { whiteUserId: "c", blackUserId: "d", result: "draw" },
      ],
    );

    const b = standings.find((s) => s.userId === "b");
    const c = standings.find((s) => s.userId === "c");
    // b's final score: lost to a (0) + beat d (1) = 1
    expect(b?.score).toBe(1);
    // c's final score: drew a (0.5) + drew d (0.5) = 1
    expect(c?.score).toBe(1);

    const a = standings.find((s) => s.userId === "a");
    // a: beat b (1 * b's score 1) + drew c (0.5 * c's score 1) = 1.5
    expect(a?.sonnebornBerger).toBeCloseTo(1.5);
  });

  it("sorts standings by score desc, then Buchholz, then Sonneborn-Berger", () => {
    const standings = computeStandings(
      ["a", "b"],
      [{ whiteUserId: "a", blackUserId: "b", result: "white_win" }],
    );
    expect(standings.map((s) => s.userId)).toEqual(["a", "b"]);
  });
});

describe("generateSwissPairings", () => {
  const buildStanding = (overrides: Partial<PlayerStanding>): PlayerStanding => ({
    userId: "x",
    score: 0,
    buchholz: 0,
    sonnebornBerger: 0,
    gamesPlayed: 0,
    hadBye: false,
    opponentIds: [],
    ...overrides,
  });

  it("pairs the top half against the bottom half for an even number of players", () => {
    const standings = [
      buildStanding({ userId: "1", score: 2 }),
      buildStanding({ userId: "2", score: 2 }),
      buildStanding({ userId: "3", score: 1 }),
      buildStanding({ userId: "4", score: 1 }),
    ];

    const pairings = generateSwissPairings(standings);

    expect(pairings).toEqual([
      { whiteUserId: "1", blackUserId: "3" },
      { whiteUserId: "2", blackUserId: "4" },
    ]);
  });

  it("gives the bye to the lowest-scored player who hasn't had one yet, for an odd count", () => {
    const standings = [
      buildStanding({ userId: "1", score: 2 }),
      buildStanding({ userId: "2", score: 1 }),
      buildStanding({ userId: "3", score: 0 }),
    ];

    const pairings = generateSwissPairings(standings);
    const bye = pairings.find((p) => p.blackUserId === null);
    expect(bye?.whiteUserId).toBe("3");
    expect(pairings).toHaveLength(2);
  });

  it("skips a player who already had a bye when assigning a new one", () => {
    const standings = [
      buildStanding({ userId: "1", score: 2 }),
      buildStanding({ userId: "2", score: 1 }),
      buildStanding({ userId: "3", score: 0, hadBye: true }),
    ];

    const pairings = generateSwissPairings(standings);
    const bye = pairings.find((p) => p.blackUserId === null);
    expect(bye?.whiteUserId).toBe("2");
  });

  it("avoids an immediate rematch when a different valid opponent is available", () => {
    const standings = [
      buildStanding({ userId: "1", score: 2, opponentIds: ["3"] }),
      buildStanding({ userId: "2", score: 2, opponentIds: ["4"] }),
      buildStanding({ userId: "3", score: 1, opponentIds: ["1"] }),
      buildStanding({ userId: "4", score: 1, opponentIds: ["2"] }),
    ];

    const pairings = generateSwissPairings(standings);

    expect(pairings).toEqual(
      expect.arrayContaining([
        { whiteUserId: "1", blackUserId: "4" },
        { whiteUserId: "2", blackUserId: "3" },
      ]),
    );
  });
});

describe("pairAdjacentByRating", () => {
  it("pairs consecutive entries for an even-length list", () => {
    const pairs = pairAdjacentByRating([
      { userId: "a" },
      { userId: "b" },
      { userId: "c" },
      { userId: "d" },
    ]);
    expect(pairs).toEqual([
      { whiteUserId: "a", blackUserId: "b" },
      { whiteUserId: "c", blackUserId: "d" },
    ]);
  });

  it("drops a trailing odd one out", () => {
    const pairs = pairAdjacentByRating([{ userId: "a" }, { userId: "b" }, { userId: "c" }]);
    expect(pairs).toEqual([{ whiteUserId: "a", blackUserId: "b" }]);
  });
});
