import { parsePuzzleCsv } from "../puzzle-csv.utils";

const HEADER =
  "PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags";
const ROW_FORK =
  "abc123,r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3,f3g5 f8c5,1200,80,90,1000,fork opening,https://example.com,Italian_Game";
const ROW_MATE =
  "def456,6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1,a1a8,2200,60,95,500,backRankMate mateIn1,https://example.com,";

describe("parsePuzzleCsv", () => {
  it("parses a well-formed CSV with a header row, skipping the header", () => {
    const rows = parsePuzzleCsv([HEADER, ROW_FORK, ROW_MATE].join("\n"));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      solutionUci: ["f3g5", "f8c5"],
      rating: 1200,
      ratingDeviation: 80,
      popularity: 90,
    });
    expect(rows[0].motifs).toContain("fork");
  });

  it("maps known theme tokens and drops unrecognized ones", () => {
    const rows = parsePuzzleCsv([HEADER, ROW_MATE].join("\n"));

    expect(rows[0].motifs.sort()).toEqual(["back_rank_mate", "mate_in_1"]);
  });

  it("filters by rating range", () => {
    const rows = parsePuzzleCsv([HEADER, ROW_FORK, ROW_MATE].join("\n"), {
      minRating: 2000,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].rating).toBe(2200);
  });

  it("filters by motif, requiring at least one match", () => {
    const rows = parsePuzzleCsv([HEADER, ROW_FORK, ROW_MATE].join("\n"), {
      motifs: ["mate_in_1"],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].rating).toBe(2200);
  });

  it("respects maxCount", () => {
    const rows = parsePuzzleCsv([HEADER, ROW_FORK, ROW_MATE].join("\n"), { maxCount: 1 });

    expect(rows).toHaveLength(1);
  });

  it("skips malformed lines instead of throwing", () => {
    const rows = parsePuzzleCsv([HEADER, "not,enough,columns", ROW_FORK].join("\n"));

    expect(rows).toHaveLength(1);
  });

  it("returns an empty array for a header-only CSV", () => {
    const rows = parsePuzzleCsv(HEADER);

    expect(rows).toEqual([]);
  });
});
